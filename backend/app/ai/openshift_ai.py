"""OpenShift AI provider (KServe / ModelMesh InferenceService).

This is a learning scaffold, not a finished integration. The goal is to show
the shape of a real "self-hosted model" provider so you can fill in
`_parse_inference_response` once you know what your deployed model returns.

How it differs from the Gemini provider:

- Gemini speaks one well-known JSON schema we control. A small CPU model on
  OpenShift AI usually returns something much simpler: one label, a probability
  vector, or a short string. The provider has to translate that into the rich
  AnalysisResult shape the frontend expects.
- We do not get a single "give me everything" call. In practice you may run
  several small classifiers (one per axis) and stitch their outputs together,
  or run one bigger generator (FLAN-T5, TinyLlama) that produces JSON.
- The base AnalysisResult post-validator is forgiving: empty lists get
  backfilled with neutral SubMetric entries, sentiment_series gets padded,
  topics defaults to ["uncategorized"]. So a partial dict is enough to boot.

To finish this provider you only need to:
  1. Deploy a model on OpenShift AI (see docs/openshift-integration.md).
  2. Set OPENSHIFT_AI_INFERENCE_URL (and OPENSHIFT_AI_TOKEN if needed).
  3. Replace the body of `_parse_inference_response` with real parsing logic.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx
from pydantic import ValidationError

from app.ai.base import AIProvider, AnalysisResult
from app.config import settings
from app.security.prompt_defense import build_prompt
from app.security.url_validation import UnsafeURLError, validate_url

log = logging.getLogger(__name__)

# Sandbox InferenceServices have idle scale-to-zero. The first request after
# a quiet period spins up a pod, downloads the model, and warms it. 60 seconds
# is the realistic ceiling for a small CPU model on the free sandbox.
INFERENCE_TIMEOUT_SECONDS = 60.0

# Cap the response body. A misbehaving model could otherwise stream gigabytes
# of garbage and OOM the backend. 5 MB is generous for any classification or
# short-text-generation response we expect.
MAX_RESPONSE_BYTES = 5 * 1024 * 1024


class OpenShiftAIProvider(AIProvider):
    """Calls a KServe InferenceService over HTTPS and returns AnalysisResult."""

    def __init__(self) -> None:
        # Read URL and (optional) bearer token from settings. We fail fast at
        # construction time so a misconfigured deployment surfaces on startup,
        # not on the first user request.
        url = settings.openshift_ai_inference_url
        if not url:
            raise RuntimeError(
                "OPENSHIFT_AI_INFERENCE_URL is not set. Deploy a model on "
                "OpenShift AI and put its /infer URL in your .env file."
            )
        self._url: str = url
        # SSRF guard: the integration doc tells developers to use
        # http://127.0.0.1:9000/... for local dev, and that can leak into a
        # production .env. Reject loopback / private / link-local targets at
        # construction time so misconfiguration is caught on startup.
        try:
            validate_url(self._url)
        except UnsafeURLError as exc:
            raise RuntimeError(
                f"Configured OpenShift AI URL is not safe: {exc}"
            ) from exc
        self._token: str | None = settings.openshift_ai_token

        # One reusable client per provider instance. httpx.Client pools
        # connections and reuses TLS sessions, which matters when the
        # InferenceService is far from your backend (sandbox in the US,
        # backend in the EU, etc.).
        self._client = httpx.Client(timeout=INFERENCE_TIMEOUT_SECONDS)

    # The factory caches one provider via @lru_cache, so __del__ is fine here.
    # If you ever rebuild providers per-request, switch to a context manager.
    def __del__(self) -> None:
        try:
            self._client.close()
        except Exception:
            # Never let cleanup raise during interpreter shutdown.
            pass

    def analyze(
        self, article_text: str, deep: bool = False
    ) -> tuple[AnalysisResult, str]:
        # Step 0: re-validate the configured URL on every call. Cheap, and it
        # closes the DNS-rebind window the article scraper also defends
        # against (a hostname that resolved to a public IP at startup could
        # later resolve to a private address).
        try:
            validate_url(self._url)
        except UnsafeURLError as exc:
            raise RuntimeError(
                f"Configured OpenShift AI URL is not safe: {exc}"
            ) from exc

        # Step 1: run the article through the same prompt-defense pipeline
        # Gemini uses. This sanitizes Unicode tricks and caps length so a
        # long article cannot DoS our model server. We discard the
        # system_instruction and user_prompt: a small classifier does not
        # need natural-language instructions, only the raw article text.
        _system, _user_prompt, sanitized = build_prompt(article_text, deep=deep)

        # Step 2: build the request body. The exact shape depends on which
        # KServe runtime is fronting your model:
        #   - Caikit Standalone: { "inputs": [ { "name": "text", "shape": [1],
        #                                        "datatype": "BYTES",
        #                                        "data": ["..."] } ] }
        #   - vLLM / OpenAI-compat: { "model": "...", "prompt": "...",
        #                             "max_tokens": 256 }
        #   - OVMS (OpenVINO):     { "inputs": [ { ... tensor ... } ] }
        # We pick a generic envelope here. Adapt to your runtime.
        payload: dict[str, Any] = {
            "inputs": [
                {
                    "name": "article_text",
                    "shape": [1],
                    "datatype": "BYTES",
                    "data": [sanitized],
                }
            ],
            # Pass deep through so a future bigger model can decide whether
            # to spend extra tokens on highlights.
            "parameters": {"deep": deep},
        }

        headers = {"Content-Type": "application/json"}
        if self._token:
            # OpenShift OAuth bearer token. Sandbox routes are usually
            # protected; in-cluster routes may not be. Token format is
            # usually "sha256~..." for OpenShift service-account tokens.
            headers["Authorization"] = f"Bearer {self._token}"

        # Step 3: actually call the model. Wrap each likely failure in a
        # friendly RuntimeError so the FastAPI route can surface a clean
        # message to the user instead of a 500 traceback. We stream the
        # response so we can enforce MAX_RESPONSE_BYTES while reading
        # instead of buffering an attacker-controlled body in full first.
        body: bytes = b""
        status_code: int = 0
        response_text_preview: str = ""
        oversized = False
        try:
            with self._client.stream(
                "POST",
                self._url,
                json=payload,
                headers=headers,
            ) as response:
                status_code = response.status_code
                chunks: list[bytes] = []
                total = 0
                for chunk in response.iter_bytes(chunk_size=65536):
                    if not chunk:
                        continue
                    total += len(chunk)
                    if total > MAX_RESPONSE_BYTES:
                        oversized = True
                        break
                    chunks.append(chunk)
                body = b"".join(chunks)
                # Pre-compute a short text preview for 5xx logging while the
                # response is still in scope; iter_bytes already consumed
                # the stream, so we cannot call response.text afterward.
                try:
                    response_text_preview = body[:500].decode(
                        response.encoding or "utf-8", errors="replace"
                    )
                except Exception:
                    response_text_preview = ""
        except httpx.TimeoutException as exc:
            raise RuntimeError(
                "The OpenShift AI model timed out. Sandbox cold-starts can "
                "take up to a minute. Please try again in 30 seconds."
            ) from exc
        except httpx.ConnectError as exc:
            raise RuntimeError(
                "Could not reach the OpenShift AI inference URL. Check that "
                "your sandbox is still active (it expires every 30 days) and "
                "that OPENSHIFT_AI_INFERENCE_URL is correct."
            ) from exc
        except httpx.HTTPError as exc:
            log.warning("OpenShift AI request failed: %s", exc)
            raise RuntimeError(
                "Could not call the OpenShift AI model. Please try again."
            ) from exc

        if oversized:
            raise RuntimeError(
                "The OpenShift AI model returned an unexpectedly large "
                "response. Please try again."
            )

        # Step 4: classify the HTTP status. 401 / 403 mean auth; 5xx means
        # the model server itself is sad; 404 usually means the URL is wrong
        # or the InferenceService was deleted.
        if status_code == 401 or status_code == 403:
            raise RuntimeError(
                "OpenShift AI rejected the request (auth). Refresh your "
                "OPENSHIFT_AI_TOKEN; OpenShift OAuth tokens expire."
            )
        if status_code == 404:
            raise RuntimeError(
                "OpenShift AI returned 404. The InferenceService URL is "
                "probably stale (sandbox URLs change every 30 days)."
            )
        if status_code >= 500:
            log.warning(
                "OpenShift AI 5xx (%s): %s",
                status_code,
                response_text_preview,
            )
            raise RuntimeError(
                "The OpenShift AI model server is having problems. "
                "Please try again in a moment."
            )
        if status_code != 200:
            raise RuntimeError(
                f"OpenShift AI returned an unexpected status ({status_code})."
            )

        # Step 5: parse the (already byte-capped) body as JSON.
        try:
            raw = json.loads(body.decode("utf-8", errors="replace"))
        except ValueError as exc:
            log.warning("OpenShift AI returned non-JSON body: %s", body[:500])
            raise RuntimeError(
                "The OpenShift AI model returned an invalid (non-JSON) response."
            ) from exc

        # Step 6: translate the model output into an AnalysisResult dict.
        # This is the part you finish once your model is deployed.
        # _parse_inference_response is a scaffold and currently raises
        # NotImplementedError. NotImplementedError is a subclass of
        # RuntimeError, so without translation the FastAPI route's
        # `except RuntimeError as exc: raise HTTPException(detail=str(exc))`
        # would echo the developer-only "fill me in" message verbatim to
        # users. Convert it into a friendly RuntimeError here, while
        # leaving the original NotImplementedError inside the function
        # body so a developer running `python` still sees the dev message.
        try:
            partial = _parse_inference_response(raw)
        except NotImplementedError as exc:
            raise RuntimeError(
                "The OpenShift AI integration is not finished on this "
                "server. Please use a different AI provider."
            ) from exc

        # Step 7: validate. The post-validator inside AnalysisResult will
        # backfill missing SubMetric rows, pad sentiment_series, default
        # topics to ["uncategorized"], and clamp every score to its range.
        # That means even a sparse partial dict like:
        #   { "political": {...}, "emotional": {...}, "factual": {...},
        #     "fake_likelihood": ..., "sentiment": ..., "summary": ...,
        #     "reasoning": ... }
        # produces a complete, frontend-safe result.
        try:
            result = AnalysisResult.model_validate(partial)
        except ValidationError as exc:
            log.warning("OpenShift AI partial dict failed validation: %s", exc)
            raise RuntimeError(
                "The OpenShift AI model output did not match the expected "
                "schema. Update _parse_inference_response in openshift_ai.py."
            ) from exc

        # Highlights are deep-mode only and need exact-offset reconciliation
        # against the sanitized article. Until your model can produce real
        # highlights, force the empty list so the UI does not render junk.
        result.highlights = []

        return result, sanitized


def _parse_inference_response(raw: dict[str, Any]) -> dict[str, Any]:
    """Translate raw model output into an AnalysisResult-shaped dict.

    YOU FILL THIS IN. The shape of `raw` depends entirely on which model and
    which serving runtime you deployed. Some realistic shapes:

    1) DistilBERT political-bias classifier (single head, 3 classes):
         raw = {
             "outputs": [
                 {"name": "logits", "data": [0.12, 0.71, 0.17], ...}
             ]
         }
       Map: argmax -> "left|center|right", convert softmax to score in -1..+1,
       fill emotional/factual/fake_likelihood with neutral defaults (0.3),
       summary = "(generated by your model or a templated string)".

    2) Four-classifier chain (one model per axis): your backend already ran
       all four and merged them into raw before calling this function.

    3) FLAN-T5 / TinyLlama JSON-completion model: raw["outputs"][0]["data"][0]
       is a JSON string. json.loads it and you almost have an AnalysisResult.

    Required keys in the returned dict (the post-validator handles the rest):
        political:        {"label": "...", "score": float}
        emotional:        {"label": "...", "score": float}
        factual:          {"label": "...", "score": float}
        fake_likelihood:  float
        sentiment:        "positive" | "neutral" | "negative"
        summary:          str
        reasoning:        str

    Anything you omit (verdict, sub_bias, sub_tone, sub_fact, sub_fake,
    red_flags, sentiment_series, entities, topics) gets sensible defaults.
    """
    # The presence of `raw` in the signature avoids "unused argument" lint
    # warnings while still making it obvious where parsing should happen.
    _ = raw
    raise NotImplementedError(
        "Adapt _parse_inference_response to your model's output shape, "
        "then remove this NotImplementedError."
    )
