"""Fine-tuned ONNX text classifiers for sentiment and emotional tone.

Trained by training/train_emotion_sentiment_models.ipynb and exported as INT8 ONNX:

* ``emotion_tone`` - calm / neutral / charged / inflammatory (GoEmotions, regrouped)
* ``sentiment``    - negative / neutral / positive (TweetEval)

Files are looked up in ``backend/models/`` (``<name>.onnx``, ``<name>_labels.json``,
``<name>_tokenizer/tokenizer.json``). If anything is missing every function here
returns ``None`` so nlp_pipeline.py falls back to the pretrained HuggingFace
models (or the lexicon fallback) exactly as before.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "models"
MAX_LEN = 128  # must match MAX_LEN in the training notebook

# Representative intensity of each tone band (bands match nlp_pipeline thresholds).
_TONE_CENTER = {"calm": 0.12, "neutral": 0.37, "charged": 0.62, "inflammatory": 0.87}


@dataclass
class _Classifier:
    session: Any
    tokenizer: Any
    id2label: dict[int, str]

    def predict_proba(self, text: str) -> dict[str, float]:
        import numpy as np

        enc = self.tokenizer.encode(text)
        ids = np.array([enc.ids], dtype=np.int64)
        mask = np.array([enc.attention_mask], dtype=np.int64)
        logits = self.session.run(["logits"], {"input_ids": ids, "attention_mask": mask})[0][0]
        logits = logits - logits.max()
        exp = np.exp(logits)
        probs = exp / exp.sum()
        return {self.id2label[i]: float(probs[i]) for i in range(len(probs))}


@lru_cache(maxsize=4)
def get_local_classifier(name: str) -> _Classifier | None:
    model_path = MODELS_DIR / f"{name}.onnx"
    labels_path = MODELS_DIR / f"{name}_labels.json"
    tok_path = MODELS_DIR / f"{name}_tokenizer" / "tokenizer.json"
    if not (model_path.exists() and labels_path.exists() and tok_path.exists()):
        log.info("Local model '%s' not found in %s; using fallback.", name, MODELS_DIR)
        return None
    try:
        import onnxruntime as ort
        from tokenizers import Tokenizer

        session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
        tokenizer = Tokenizer.from_file(str(tok_path))
        tokenizer.enable_truncation(max_length=MAX_LEN)
        id2label = {int(k): v for k, v in json.loads(labels_path.read_text("utf-8")).items()}
        log.info("Loaded local model '%s' (%s)", name, ", ".join(id2label.values()))
        return _Classifier(session, tokenizer, id2label)
    except Exception as exc:
        log.warning("Could not load local model '%s': %s", name, exc)
        return None


class LocalSentimentPipe:
    """Drop-in for the HuggingFace sentiment pipeline: ``pipe(text) -> [{"label", "score"}]``."""

    def __init__(self, clf: _Classifier) -> None:
        self._clf = clf

    def __call__(self, text: str) -> list[dict[str, Any]]:
        probs = self._clf.predict_proba(text)
        label = max(probs, key=probs.get)
        return [{"label": label, "score": probs[label]}]


def _chunks(text: str, max_chunks: int) -> list[str]:
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if len(s.strip()) > 20]
    if not sentences:
        return [text[:800]] if text.strip() else []
    groups = [" ".join(sentences[i : i + 2]) for i in range(0, len(sentences), 2)]
    if len(groups) > max_chunks:
        step = len(groups) / max_chunks
        groups = [groups[int(i * step)] for i in range(max_chunks)]
    return groups


def local_emotion_tone(text: str) -> tuple[str, float] | None:
    """Return (label, score 0..1) from the local tone model, or None if unavailable."""
    clf = get_local_classifier("emotion_tone")
    if clf is None:
        return None
    chunks = _chunks(text, max_chunks=8)
    if not chunks:
        return None
    totals: dict[str, float] = {}
    for chunk in chunks:
        for label, p in clf.predict_proba(chunk).items():
            totals[label] = totals.get(label, 0.0) + p
    probs = {k: v / len(chunks) for k, v in totals.items()}
    score = sum(_TONE_CENTER.get(label, 0.37) * p for label, p in probs.items())
    score = max(0.0, min(1.0, round(score, 2)))
    if score < 0.25:
        return "calm", score
    if score < 0.50:
        return "neutral", score
    if score < 0.75:
        return "charged", score
    return "inflammatory", score
