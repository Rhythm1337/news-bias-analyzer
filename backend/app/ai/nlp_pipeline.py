"""Local NLP pipeline: spaCy for NER and text statistics, HuggingFace for sentiment and tone.

Includes graceful rule-based fallbacks so that basic NLP capabilities function
immediately even if large ML model weights are still downloading or offline.
"""

from __future__ import annotations

from functools import lru_cache
import logging
import re
from typing import Any, Literal

from app.ai.base import Entity

log = logging.getLogger(__name__)

# Map spaCy entity labels to our schema's 6-way type system
_SPACY_TO_SCHEMA: dict[str, Literal["PER", "ORG", "LOC", "LAW", "EVENT", "MISC"]] = {
    "PERSON": "PER",
    "ORG": "ORG",
    "GPE": "LOC",
    "LOC": "LOC",
    "FAC": "LOC",
    "LAW": "LAW",
    "EVENT": "EVENT",
    "NORP": "ORG",
    "PRODUCT": "MISC",
    "WORK_OF_ART": "MISC",
    "LANGUAGE": "MISC",
}

ATTRIBUTION_KEYWORDS = {
    "according to",
    "said",
    "reported",
    "stated",
    "told",
    "confirmed",
    "announced",
    "cited",
    "spokesperson",
    "revealed",
    "testified",
    "concluded",
    "study",
}

_POSITIVE_LEXICON = {
    "growth", "record", "surge", "gain", "soar", "positive", "strong", "success",
    "triumph", "breakthrough", "promising", "robust", "celebrate", "peace", "hope",
    "victory", "boost", "improve", "beneficial", "progress", "advance", "thrive"
}

_NEGATIVE_LEXICON = {
    "crisis", "collapse", "drop", "fall", "slump", "loss", "disaster", "fail",
    "threat", "danger", "conflict", "scandal", "fraud", "corrupt", "investigation",
    "fatal", "death", "damage", "warning", "catastrophe", "turmoil", "recession"
}

_CHARGED_LEXICON = {
    "furious", "outrage", "slammed", "blasted", "bombshell", "chaos", "horrific",
    "treason", "tyranny", "disgrace", "shocking", "menace", "catastrophic", "evil",
    "unprecedented", "radical", "extremist", "weaponized", "shameful", "hysteria"
}


@lru_cache(maxsize=1)
def get_spacy_nlp() -> Any | None:
    """Load spaCy pipeline, preferring en_core_web_sm or en_core_web_trf if installed."""
    try:
        import spacy
    except ImportError:
        log.info("spaCy not installed; falling back to regex entity and text analysis.")
        return None

    for model_name in ("en_core_web_sm", "en_core_web_trf"):
        try:
            nlp = spacy.load(model_name)
            log.info("Loaded spaCy model: %s", model_name)
            return nlp
        except OSError:
            continue

    try:
        spacy.cli.download("en_core_web_sm")
        return spacy.load("en_core_web_sm")
    except Exception as exc:
        log.warning("Could not download en_core_web_sm (%s); using blank 'en'", exc)
        try:
            nlp = spacy.blank("en")
            if "sentencizer" not in nlp.pipe_names:
                nlp.add_pipe("sentencizer")
            return nlp
        except Exception:
            return None


@lru_cache(maxsize=1)
def get_sentiment_pipeline() -> Any | None:
    """Load the fine-tuned local sentiment model if present, else the HuggingFace pipeline."""
    try:
        from app.ai.local_classifiers import LocalSentimentPipe, get_local_classifier

        local_clf = get_local_classifier("sentiment")
        if local_clf is not None:
            return LocalSentimentPipe(local_clf)
    except Exception as exc:
        log.info("Local sentiment model unavailable (%s); trying HuggingFace.", exc)
    try:
        from transformers import pipeline

        log.info("Loading HuggingFace sentiment pipeline...")
        return pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest",
            device=-1,
            truncation=True,
            max_length=512,
        )
    except Exception as exc:
        log.info("Transformers sentiment pipeline unavailable (%s); using lexicon sentiment fallback.", exc)
        return None


@lru_cache(maxsize=1)
def get_emotion_pipeline() -> Any | None:
    """Load HuggingFace emotion classification pipeline if available."""
    try:
        from transformers import pipeline

        log.info("Loading HuggingFace emotion pipeline...")
        return pipeline(
            "text-classification",
            model="SamLowe/roberta-base-go_emotions",
            device=-1,
            truncation=True,
            max_length=512,
            top_k=5,
        )
    except Exception as exc:
        log.info("Transformers emotion pipeline unavailable (%s); using lexicon emotion fallback.", exc)
        return None


def extract_entities(text: str) -> list[Entity]:
    """Run entity recognition (via spaCy or regex heuristic fallback)."""
    nlp = get_spacy_nlp()
    if nlp is not None and getattr(nlp, "ents", None) is not None or (nlp and "ner" in getattr(nlp, "pipe_names", [])):
        doc = nlp(text[:25_000])
        counts: dict[tuple[str, Literal["PER", "ORG", "LOC", "LAW", "EVENT", "MISC"]], int] = {}
        for ent in doc.ents:
            name = ent.text.strip().replace("\n", " ")
            if len(name) < 2:
                continue
            etype = _SPACY_TO_SCHEMA.get(ent.label_, "MISC")
            key = (name, etype)
            counts[key] = counts.get(key, 0) + 1

        sorted_items = sorted(counts.items(), key=lambda item: item[1], reverse=True)[:30]
        return [
            Entity(name=name, type=etype, mentions=max(1, count))
            for (name, etype), count in sorted_items
        ]

    # Heuristic fallback: capitalized phrases (e.g. "White House", "United Nations")
    candidates = re.findall(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b", text[:25_000])
    freq: dict[str, int] = {}
    stopwords = {"The", "This", "That", "There", "In", "On", "At", "For", "With", "After", "Before", "While"}
    for c in candidates:
        if c in stopwords or len(c) < 3:
            continue
        freq[c] = freq.get(c, 0) + 1

    sorted_candidates = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:20]
    return [
        Entity(name=name, type="ORG" if " " in name else "MISC", mentions=count)
        for name, count in sorted_candidates
    ]


def analyze_sentiment(text: str) -> tuple[Literal["positive", "neutral", "negative"], float]:
    """Analyze overall sentiment of article text."""
    pipe = get_sentiment_pipeline()
    if pipe is not None:
        try:
            snippet = text[:512]
            res = pipe(snippet)[0]
            raw_label = str(res.get("label", "neutral")).lower()
            score = float(res.get("score", 0.5))

            if "pos" in raw_label:
                return "positive", score
            elif "neg" in raw_label:
                return "negative", score
            return "neutral", score
        except Exception as exc:
            log.warning("Transformer sentiment inference error: %s", exc)

    # Lexicon fallback
    tokens = set(re.findall(r"\b[a-z]+\b", text[:3000].lower()))
    pos_hits = len(tokens & _POSITIVE_LEXICON)
    neg_hits = len(tokens & _NEGATIVE_LEXICON)

    if pos_hits > neg_hits + 1:
        return "positive", min(0.9, 0.5 + 0.1 * (pos_hits - neg_hits))
    elif neg_hits > pos_hits + 1:
        return "negative", min(0.9, 0.5 + 0.1 * (neg_hits - pos_hits))
    return "neutral", 0.5


def analyze_sentiment_series(text: str) -> list[float]:
    """Analyze per-paragraph sentiment scores clamped to [-1.0, 1.0]."""
    pipe = get_sentiment_pipeline()
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n+", text) if len(p.strip()) >= 40]
    if not paragraphs:
        paragraphs = [text[:512]]

    scores: list[float] = []
    for para in paragraphs[:24]:
        if pipe is not None:
            try:
                res = pipe(para[:512])[0]
                raw_label = str(res.get("label", "neutral")).lower()
                conf = float(res.get("score", 0.5))
                if "pos" in raw_label:
                    scores.append(round(conf, 2))
                elif "neg" in raw_label:
                    scores.append(round(-conf, 2))
                else:
                    scores.append(0.0)
                continue
            except Exception:
                pass

        # Lexicon paragraph scoring
        words = set(re.findall(r"\b[a-z]+\b", para.lower()))
        pos = len(words & _POSITIVE_LEXICON)
        neg = len(words & _NEGATIVE_LEXICON)
        diff = pos - neg
        scores.append(max(-1.0, min(1.0, round(diff * 0.25, 2))))

    if len(scores) < 4 and scores:
        last = scores[-1]
        while len(scores) < 4:
            scores.append(last)
    elif not scores:
        scores = [0.0, 0.0, 0.0, 0.0]

    return scores


def analyze_emotion(text: str) -> tuple[Literal["calm", "neutral", "charged", "inflammatory"], float]:
    """Map GoEmotions classification or lexicon to 4-way emotional tone."""
    try:
        from app.ai.local_classifiers import local_emotion_tone

        local_tone = local_emotion_tone(text)
        if local_tone is not None:
            return local_tone  # type: ignore[return-value]
    except Exception as exc:
        log.warning("Local emotion model failed; falling back: %s", exc)

    pipe = get_emotion_pipeline()
    if pipe is not None:
        try:
            snippet = text[:512]
            top_emotions: list[dict[str, Any]] = pipe(snippet)[0]

            high_intensity = {"anger", "annoyance", "disgust", "fear", "grief", "rage"}
            medium_intensity = {"surprise", "excitement", "desire", "disappointment", "nervousness"}
            low_intensity = {"neutral", "approval", "caring", "curiosity", "optimism", "relief"}

            weighted_score = 0.0
            for item in top_emotions:
                name = str(item.get("label", "")).lower()
                score = float(item.get("score", 0.0))
                if name in high_intensity:
                    weighted_score += score * 1.0
                elif name in medium_intensity:
                    weighted_score += score * 0.5
                elif name in low_intensity:
                    weighted_score += score * 0.1

            tone_score = max(0.0, min(1.0, round(weighted_score, 2)))
            if tone_score < 0.25:
                return "calm", tone_score
            elif tone_score < 0.50:
                return "neutral", tone_score
            elif tone_score < 0.75:
                return "charged", tone_score
            else:
                return "inflammatory", tone_score
        except Exception as exc:
            log.warning("Transformer emotion inference error: %s", exc)

    # Lexicon fallback
    tokens = re.findall(r"\b[a-z]+\b", text[:3000].lower())
    charged_hits = sum(1 for t in tokens if t in _CHARGED_LEXICON)
    ratio = charged_hits / max(1, len(tokens))

    tone_score = min(1.0, round(ratio * 15.0, 2))
    if tone_score < 0.20:
        return "calm", tone_score
    elif tone_score < 0.45:
        return "neutral", tone_score
    elif tone_score < 0.70:
        return "charged", tone_score
    return "inflammatory", tone_score


def compute_text_stats(text: str) -> dict[str, Any]:
    """Extract linguistic, citation, and readability heuristics."""
    nlp = get_spacy_nlp()
    if nlp is not None:
        doc = nlp(text[:25_000])
        sentences = [s.text.strip() for s in doc.sents if len(s.text.strip()) > 5]
        words = [t for t in doc if not t.is_punct and not t.is_space]
        num_tokens = sum(1 for t in doc if t.like_num)
        num_words = max(1, len(words))
    else:
        raw_sents = re.split(r"[.!?]+", text[:25_000])
        sentences = [s.strip() for s in raw_sents if len(s.strip()) > 5]
        tokens = re.findall(r"\b\w+\b", text[:25_000])
        num_words = max(1, len(tokens))
        num_tokens = sum(1 for t in tokens if t.isdigit())

    num_sentences = max(1, len(sentences))

    # Quotation and attribution density
    double_quotes = text.count('"') + text.count('“') + text.count('”')
    paired_quotes = double_quotes // 2

    attribution_matches = 0
    for s in sentences:
        s_lower = s.lower()
        if any(keyword in s_lower for keyword in ATTRIBUTION_KEYWORDS):
            attribution_matches += 1

    attribution_ratio = attribution_matches / num_sentences
    numeric_density = num_tokens / num_words

    return {
        "num_sentences": num_sentences,
        "num_words": num_words,
        "quote_count": paired_quotes,
        "attribution_ratio": round(attribution_ratio, 3),
        "numeric_density": round(numeric_density, 3),
    }
