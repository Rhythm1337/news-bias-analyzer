# The AI provider extension point

This file explains the abstraction that lets us swap the AI backend without
touching the rest of the app. It is the seam where a new model (OpenShift
AI, OpenAI, a self-trained classifier, anything) plugs in.

If you have not read [backend.md](./backend.md) yet, that file walks the
whole backend module by module. This file zooms into one small piece of
that and goes deeper.

## The big idea

The route handler in [backend/app/routes/analyze.py](../backend/app/routes/analyze.py)
does NOT know which AI is running. It just asks for "a provider", calls
`provider.analyze(text, deep=...)`, and trusts the result.

```
route /analyze
   |
   | get_provider()   -> returns "an AIProvider"
   | provider.analyze(text)  -> returns (AnalysisResult, sanitized_str)
   |
   v
AnalysisResult (always the same shape, regardless of which AI ran it)
```

The provider is chosen at startup by reading the `AI_PROVIDER` env var. Today
the only working provider is `gemini`. A stub for `openshift` is in the tree
ready to fill in (see [openshift-integration.md](./openshift-integration.md)).

## The interface

The contract every provider must satisfy lives in
[backend/app/ai/base.py](../backend/app/ai/base.py):

```python
class AIProvider(ABC):
    @abstractmethod
    def analyze(self, article_text: str, deep: bool = False) -> tuple[AnalysisResult, str]: ...
```

Three things are happening here.

1. `ABC` makes this an "abstract base class". A subclass that doesn't
   implement `analyze` will fail to instantiate. Python catches the mistake
   at construction time, not at the first request.
2. `@abstractmethod` is the marker. Any subclass must override this method.
3. The return type is a tuple of two things: the validated `AnalysisResult`
   that the route will send back, and the sanitized article text (the
   string the model actually saw, used by the route to echo back when in
   deep mode so the frontend's highlight offsets line up).

A provider that doesn't return that exact shape will break the route. Stick
to the contract.

## The factory

Selection is done by [backend/app/ai/__init__.py](../backend/app/ai/__init__.py):

```python
@lru_cache(maxsize=1)
def get_provider() -> AIProvider:
    name = settings.ai_provider.lower()
    if name == "gemini":
        from app.ai.gemini import GeminiProvider
        return GeminiProvider()
    raise ValueError(f"Unknown AI_PROVIDER: {settings.ai_provider}")
```

Two things to notice.

`@lru_cache(maxsize=1)` means we build the provider exactly once per
process and reuse it for every request. This is important: the Gemini
client opens a connection pool, sets up TLS, etc. Building a fresh one per
request would be slow and would burn the API key's connection limits.

The `import` happens inside the `if` branch on purpose. That way starting
the app with `AI_PROVIDER=openshift` doesn't try to import google-genai if
you never plan to use it. Each provider's heavy imports only load when that
provider is actually selected.

## What a provider has to produce

Look at the existing Gemini provider in
[backend/app/ai/gemini.py](../backend/app/ai/gemini.py). The flow is:

1. Build the system prompt + user prompt + sanitized article from
   `build_prompt(article_text, deep=deep)` in
   [backend/app/security/prompt_defense.py](../backend/app/security/prompt_defense.py).
2. Call the model with the structured-output schema set to `AnalysisResult`.
3. Validate the response (or fall back to text parsing if `response.parsed`
   is missing).
4. If we asked for highlights, run them through `reconcile_highlights` to
   snap any drifted offsets.
5. Return `(result, sanitized_article)`.

Step 1 and step 5 are the same for every provider. Step 2 is whatever your
backend supports. Steps 3 and 4 happen for everyone but are easier when
the model returns clean JSON.

## What `AnalysisResult` requires

The Pydantic model has a lot of fields, most with sensible defaults. The
hard requirements (no defaults) are:

- `political: PoliticalBias` (label + score in -1..1)
- `emotional: EmotionalTone` (label + score in 0..1)
- `factual: FactualReliability` (label + score in 0..1)
- `fake_likelihood: float` (0..1)
- `sentiment: "positive" | "neutral" | "negative"`
- `summary: str`
- `reasoning: str`

Everything else (`verdict`, the four `sub_*` arrays, `sentiment_series`,
`entities`, `topics`, `red_flags`, `highlights`) defaults to empty / "" and
the post-validator backfills them. So a minimal-quality provider can return
just the seven required fields and the UI will gracefully render the rest
as "no signal" placeholders ([MiniScore.tsx](../frontend/app/components/MiniScore.tsx)
detects backfilled metrics specifically).

This matters for the OpenShift use case. A small CPU model can't
realistically produce the full schema in one go. It can produce the
headline scores. The post-validator handles the rest.

## Adding a new provider, step by step

Say you want to add an `openai` provider.

### 1. Create the provider file

`backend/app/ai/openai.py`:

```python
from app.ai.base import AIProvider, AnalysisResult
from app.config import settings
from app.security.prompt_defense import build_prompt


class OpenAIProvider(AIProvider):
    def __init__(self) -> None:
        if not settings.openai_api_key:
            raise RuntimeError("The OpenAI API key is not set on the server.")
        # init your OpenAI client here

    def analyze(self, article_text: str, deep: bool = False) -> tuple[AnalysisResult, str]:
        system, user, sanitized = build_prompt(article_text, deep=deep)
        # call the model with structured output (response_format=...)
        # parse the JSON into AnalysisResult.model_validate(...)
        # if deep mode, run reconcile_highlights on result.highlights
        # return (result, sanitized)
        ...
```

### 2. Wire the factory

In `backend/app/ai/__init__.py`, add a branch:

```python
if name == "openai":
    from app.ai.openai import OpenAIProvider
    return OpenAIProvider()
```

### 3. Add the env var if needed

In [backend/app/config.py](../backend/app/config.py): the `openai_api_key`
setting is already there. If your provider needs a new var, add it.

In `backend/.env.example`, add the var with a comment.

### 4. Switch

```
AI_PROVIDER=openai
```

Restart the server. That's it.

## Things that are easy to get wrong

**Returning the wrong tuple shape.** The route does
`analysis, sanitized = provider.analyze(...)`. If you return just
`AnalysisResult`, Python will try to unpack the model into two variables
and raise. Always return a tuple.

**Letting the model error class leak through.** The route catches
`RuntimeError` separately from generic `Exception`. RuntimeError messages
are surfaced to the user; everything else is logged and shown as a generic
"AI service did not respond." So when you map provider errors:

- User-fixable problems: rate limit, region block, content too long. Raise
  `RuntimeError("...friendly text...")`.
- Bugs and unexpected failures: let them bubble up as the original
  exception class. The route handler will log them.

**Skipping `build_prompt`.** You might be tempted to format your own
prompt. Don't. `build_prompt` does the prompt-injection sanitization
(NFKC normalization, zero-width strip, length cap, delimiter framing).
Skipping it means a malicious article can manipulate your model. Always
go through it.

**Forgetting the `sanitized` return.** The route uses it to echo the
exact bytes the model saw back to the frontend in deep mode. If you return
a different (e.g. unsanitized) string, the frontend's highlight offsets
will not line up.

**Forgetting `reconcile_highlights` in deep mode.** Models drift on char
offsets. The reconcile pass snaps them via substring search. Skip it and
the frontend may render highlights at the wrong words.

## How to test a new provider locally

Three tricks.

### Stub it

Easiest: write a `MockProvider` that returns a hard-coded `AnalysisResult`.
Use it to verify the route end-to-end without spending API credits.

```python
class MockProvider(AIProvider):
    def analyze(self, article_text, deep=False):
        from app.security.prompt_defense import build_prompt
        _, _, sanitized = build_prompt(article_text, deep=deep)
        result = AnalysisResult(
            political={"label": "center", "score": 0.0},
            emotional={"label": "neutral", "score": 0.3},
            factual={"label": "high", "score": 0.8},
            fake_likelihood=0.1,
            sentiment="neutral",
            summary="A short summary of the article.",
            reasoning="Mock provider for testing.",
        )
        return result, sanitized
```

### Run a local mock server

If your provider talks to an HTTP service, run a tiny FastAPI app that
mimics the response. Set the inference URL to `http://localhost:8001/...`
and develop without touching the real service. Faster iteration, no rate
limits, free.

### Smoke test from the Python REPL

```
cd backend
.venv/Scripts/python.exe -c "
from app.ai import get_provider
p = get_provider()
result, sanitized = p.analyze('Some article text. ' * 30, deep=False)
print('OK:', result.political.label, result.political.score)
"
```

You'll know in 10 seconds if the basic plumbing works.

## Summary

- `AIProvider` is an abstract base class. Subclass it. Implement `analyze`.
- Return `(AnalysisResult, sanitized_article_text)`. Always.
- Use `build_prompt`. Always.
- Map known failures to `RuntimeError`. Let bugs bubble.
- Wire the factory. Add the env var. Switch with `AI_PROVIDER`.
- The post-validator and `reconcile_highlights` will help you. Use them.

The whole reason the project has this seam is so a beginner can deploy a
custom model on free infra and plug it in without rewriting half the app.
That's the pattern real companies use too: routing layers (this app) talk
to an "AI service" abstraction, and the actual model behind that
abstraction can be swapped without breaking the API contract.
