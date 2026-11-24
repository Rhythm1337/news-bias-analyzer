"""Local ONNX Provider: 100% offline, local machine-learning inference.

Uses the fine-tuned ONNX quantized models (from Phase 8 / Kaggle training)
for political bias and fake-news classification, combined with spaCy and
HuggingFace pipelines for NER, sentiment, and text analysis.
Zero external API calls.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
import re
from typing import Any, Literal

import numpy as np

from app.ai.base import (
    AIProvider,
    AnalysisResult,
    EmotionalTone,
    FactualReliability,
    PoliticalBias,
    SubMetric,
    reconcile_highlights,
)
from app.ai.nlp_pipeline import (
    analyze_emotion,
    analyze_sentiment,
    analyze_sentiment_series,
    compute_text_stats,
    extract_entities,
)
from app.security.prompt_defense import build_prompt

log = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "models"


class LocalONNXProvider(AIProvider):
    def __init__(self) -> None:
        self.bias_model_path = MODELS_DIR / "political_bias.onnx"
        self.fake_model_path = MODELS_DIR / "fake_news.onnx"
        self.bias_tok_dir = MODELS_DIR / "political_bias_tokenizer"
        self.fake_tok_dir = MODELS_DIR / "fake_news_tokenizer"

        if not self.bias_model_path.exists() or not self.fake_model_path.exists():
            raise RuntimeError(
                f"Trained ONNX models not found in {MODELS_DIR}. "
                "Please download models_bundle.zip from Kaggle and extract it into backend/models/"
            )

        try:
            import onnxruntime
            from transformers import AutoTokenizer
        except ImportError as exc:
            raise RuntimeError(
                "onnxruntime and transformers are required for LocalONNXProvider. "
                "Run: pip install onnxruntime transformers"
            ) from exc

        log.info("Loading ONNX runtime inference sessions for bias and factuality...")
        self.ort_bias = onnxruntime.InferenceSession(
            str(self.bias_model_path), providers=["CPUExecutionProvider"]
        )
        self.ort_fake = onnxruntime.InferenceSession(
            str(self.fake_model_path), providers=["CPUExecutionProvider"]
        )

        self.tok_bias = AutoTokenizer.from_pretrained(str(self.bias_tok_dir))
        self.tok_fake = AutoTokenizer.from_pretrained(str(self.fake_tok_dir))

        self.bias_id2label: dict[int, str] = {
            0: "neutral",
            1: "biased",
        }
        bias_lbl_path = MODELS_DIR / "political_bias_labels.json"
        if bias_lbl_path.exists():
            with open(bias_lbl_path, encoding="utf-8") as f:
                self.bias_id2label = {int(k): v for k, v in json.load(f).items()}

    def _softmax(self, logits_1d: np.ndarray) -> np.ndarray:
        exp_logits = np.exp(logits_1d - np.max(logits_1d))
        return exp_logits / np.sum(exp_logits)

    def _predict_bias(self, text: str) -> tuple[Literal["left", "center-left", "center", "center-right", "right", "unclear"], float]:
        inputs = self.tok_bias(text, truncation=True, max_length=512, return_tensors="np")
        ort_inputs = {
            "input_ids": inputs["input_ids"].astype(np.int64),
            "attention_mask": inputs["attention_mask"].astype(np.int64),
        }
        logits = self.ort_bias.run(["logits"], ort_inputs)[0]
        probs = self._softmax(logits[0])

        if len(probs) == 2:
            # 2-class benchmark: 0 = neutral, 1 = biased
            prob_biased = float(probs[1])
            if prob_biased < 0.45:
                return "center", 0.0
            sentiment_label, _ = analyze_sentiment(text)
            if sentiment_label == "negative":
                return "center-left", -round(prob_biased * 0.75, 2)
            elif sentiment_label == "positive":
                return "center-right", round(prob_biased * 0.75, 2)
            return "center-right", round(prob_biased * 0.60, 2)

        # 5-class spectrum: [-1.0, -0.5, 0.0, 0.5, 1.0]
        score_weights = np.array([-1.0, -0.5, 0.0, 0.5, 1.0])
        score = float(np.sum(probs[:len(score_weights)] * score_weights[:len(probs)]))
        top_id = int(np.argmax(probs))
        raw_label = str(self.bias_id2label.get(top_id, "center")).lower()

        label_map: dict[str, Literal["left", "center-left", "center", "center-right", "right", "unclear"]] = {
            "left": "left",
            "center-left": "center-left",
            "lean-left": "center-left",
            "center": "center",
            "center-right": "center-right",
            "lean-right": "center-right",
            "right": "right",
        }
        return label_map.get(raw_label, "center"), round(score, 2)

    def _predict_fake(self, text: str) -> float:
        inputs = self.tok_fake(text, truncation=True, max_length=256, return_tensors="np")
        ort_inputs = {
            "input_ids": inputs["input_ids"].astype(np.int64),
            "attention_mask": inputs["attention_mask"].astype(np.int64),
        }
        logits = self.ort_fake.run(["logits"], ort_inputs)[0]
        probs = self._softmax(logits[0])

        # Weights: 0: pants-fire(1.0), 1: false(0.8), 2: barely-true(0.6), 3: half-true(0.4), 4: mostly-true(0.2), 5: true(0.0)
        weights = np.array([1.0, 0.8, 0.6, 0.4, 0.2, 0.0])
        if len(probs) >= len(weights):
            fake_score = float(np.sum(probs[:len(weights)] * weights))
        else:
            fake_score = float(probs[0])
        return max(0.0, min(1.0, round(fake_score, 2)))

    def analyze(
        self, article_text: str, deep: bool = False
    ) -> tuple[AnalysisResult, str]:
        _sys, _user, sanitized = build_prompt(article_text, deep=deep)

        # 1. Classify with custom fine-tuned ONNX models
        pol_label, pol_score = self._predict_bias(sanitized)
        fake_likelihood = self._predict_fake(sanitized)

        # 2. Local NLP extraction
        entities = extract_entities(sanitized)
        sentiment_label, _ = analyze_sentiment(sanitized)
        sentiment_series = analyze_sentiment_series(sanitized)
        emo_label, emo_score = analyze_emotion(sanitized)
        text_stats = compute_text_stats(sanitized)

        # 3. Factual reliability mapping
        fact_score = max(0.0, min(1.0, round((1.0 - fake_likelihood) * 0.7 + text_stats["attribution_ratio"] * 0.3, 2)))
        fact_label: Literal["high", "mixed", "low"] = (
            "high" if fact_score >= 0.70 else ("mixed" if fact_score >= 0.40 else "low")
        )

        # 4. Generate summary and red flags
        sentences = [s.strip() for s in re.split(r"[.!?]+", sanitized) if len(s.strip()) > 25]
        summary_sentences = sentences[:3] if len(sentences) >= 3 else sentences
        summary = ". ".join(summary_sentences) + ("." if summary_sentences else "No summary available.")

        red_flags: list[str] = []
        if fake_likelihood >= 0.50:
            red_flags.append("High probability of unverified or disputed claims")
        if text_stats["attribution_ratio"] < 0.20:
            red_flags.append("Low attribution density (few named citations or quotes)")
        if emo_score >= 0.65:
            red_flags.append("Loaded or emotionally charged vocabulary detected")
        if abs(pol_score) >= 0.55:
            red_flags.append(f"Strong political slant detected towards {pol_label}")

        reasoning = (
            f"Analyzed locally via fine-tuned DistilBERT models. Political orientation detected as "
            f"{pol_label} (score: {pol_score:+.2f}). Truthfulness score evaluates to {1.0 - fake_likelihood:.0%} "
            f"based on LIAR benchmark patterns and {int(text_stats['attribution_ratio'] * 100)}% source citation density."
        )

        verdict = (
            f"This article presents a {pol_label} perspective with {fact_label} factual sourcing and "
            f"{emo_label} emotional tone."
        )

        result = AnalysisResult(
            political=PoliticalBias(label=pol_label, score=pol_score),
            emotional=EmotionalTone(label=emo_label, score=emo_score),
            factual=FactualReliability(label=fact_label, score=fact_score),
            fake_likelihood=fake_likelihood,
            sentiment=sentiment_label,
            summary=summary,
            red_flags=red_flags,
            reasoning=reasoning,
            verdict=verdict,
            sentiment_series=sentiment_series,
            entities=entities,
            topics=["News Analysis", f"{pol_label.title()} Politics"] if pol_label != "center" else ["General News"],
            highlights=[],
        )

        # Enrich sub_fact metrics
        for sub in result.sub_fact:
            if sub.key == "Citation density":
                sub.value = min(1.0, round(text_stats["attribution_ratio"] * 2.5, 2))
                sub.note = f"{int(text_stats['attribution_ratio'] * 100)}% of sentences contain attribution phrases."
            elif sub.key == "Numerical accuracy":
                sub.value = min(1.0, round(text_stats["numeric_density"] * 10.0, 2))
                sub.note = f"Numerical metric density: {text_stats['numeric_density']:.1%}."

        return result, sanitized
