from abc import ABC, abstractmethod
from difflib import SequenceMatcher
from typing import Literal

from pydantic import BaseModel, Field, model_validator


# NOTE on schema constraints:
# Gemini's structured-output validator rejects schemas with "too many states",
# which it computes from the combinatorial explosion of every Field constraint.
# Numeric bounds (ge/le), array length bounds (min_length/max_length), nested
# constrained models, and string length caps all contribute. We strip Field
# constraints aggressively here and re-impose the bounds in `_enforce_bounds`
# below, which runs as a Pydantic post-validator on the parsed response.
# Keep only:
#   - Literal types (necessary for the model to know the allowed values)
#   - Float ge/le on the four headline scores (needed for sane numeric output)


HARD_CAPS = {
    "red_flags": 12,
    "sub_bias": 7,    # 5 expected keys + 2 extras
    "sub_tone": 6,    # 4 + 2
    "sub_fact": 6,
    "sub_fake": 6,
    "sentiment_series": 24,
    "entities": 30,
    "topics": 8,
    "highlights": 30,
}

EXPECTED_KEYS = {
    "sub_bias": ["Word choice", "Source selection", "Framing", "Topic emphasis", "Headline slant"],
    "sub_tone": ["Loaded language", "Emotional intensity", "Hyperbole", "Personal framing"],
    "sub_fact": ["Verifiable claims", "Citation density", "Source diversity", "Numerical accuracy"],
    "sub_fake": ["Vague attribution", "Unverified claims", "Pattern match w/ fakes", "Image / quote integrity"],
}


class PoliticalBias(BaseModel):
    label: Literal["left", "center-left", "center", "center-right", "right", "unclear"]
    # Range -1..+1; clamped in AnalysisResult._post_validate, NOT enforced via
    # Field(ge=, le=) because every numeric bound counts toward Gemini's
    # "too many states" schema validator.
    score: float


class EmotionalTone(BaseModel):
    label: Literal["calm", "neutral", "charged", "inflammatory"]
    score: float  # 0..1, clamped in _post_validate


class FactualReliability(BaseModel):
    label: Literal["high", "mixed", "low"]
    score: float  # 0..1, clamped in _post_validate


class SubMetric(BaseModel):
    key: str
    value: float
    note: str


class Entity(BaseModel):
    name: str
    type: Literal["PER", "ORG", "LOC", "LAW", "EVENT", "MISC"]
    mentions: int


HighlightType = Literal[
    "loaded",
    "tone",
    "source-good",
    "source-bad",
    "fact-good",
    "fact-bad",
]


class Highlight(BaseModel):
    """A flagged span in the article body, returned only in deep mode.

    Constraints (offsets non-negative, end > start, note/text length) are
    enforced in `reconcile_highlights`, not via Pydantic Field, to keep the
    Gemini Schema simple.
    """

    start: int
    end: int
    type: HighlightType
    note: str
    text: str


class AnalysisResult(BaseModel):
    political: PoliticalBias
    emotional: EmotionalTone
    factual: FactualReliability
    fake_likelihood: float  # 0..1, clamped in _post_validate
    sentiment: Literal["positive", "neutral", "negative"]
    summary: str
    red_flags: list[str] = Field(default_factory=list)
    reasoning: str

    verdict: str = ""
    sub_bias: list[SubMetric] = Field(default_factory=list)
    sub_tone: list[SubMetric] = Field(default_factory=list)
    sub_fact: list[SubMetric] = Field(default_factory=list)
    sub_fake: list[SubMetric] = Field(default_factory=list)
    sentiment_series: list[float] = Field(default_factory=list)
    entities: list[Entity] = Field(default_factory=list)
    topics: list[str] = Field(default_factory=list)
    highlights: list[Highlight] = Field(default_factory=list)

    @model_validator(mode="after")
    def _post_validate(self) -> "AnalysisResult":
        # 1. Clamp the four headline floats. The Field bounds are advisory;
        #    if the model reports something out of range, snap it.
        self.fake_likelihood = max(0.0, min(1.0, self.fake_likelihood))
        self.political.score = max(-1.0, min(1.0, self.political.score))
        self.emotional.score = max(0.0, min(1.0, self.emotional.score))
        self.factual.score = max(0.0, min(1.0, self.factual.score))

        # 2. Enforce sub_* expected keys, casing, and ordering.
        for field_name, expected in EXPECTED_KEYS.items():
            current: list[SubMetric] = getattr(self, field_name) or []
            by_key_lower: dict[str, SubMetric] = {}
            unmatched: list[SubMetric] = []

            # Pass 1: exact (case-insensitive) match.
            for item in current:
                matched = False
                for exp in expected:
                    if (
                        item.key.strip().lower() == exp.lower()
                        and exp.lower() not in by_key_lower
                    ):
                        by_key_lower[exp.lower()] = SubMetric(
                            key=exp,
                            value=max(0.0, min(1.0, item.value)),
                            note=item.note[:240],
                        )
                        matched = True
                        break
                if not matched:
                    unmatched.append(item)

            # Pass 2: fuzzy match unmatched items against still-unfilled expected
            # keys. Slot the model's substituted name (e.g. "Word selection")
            # into the closest expected key (e.g. "Word choice") instead of
            # dropping it into extras while a real key gets a synthetic 0.0.
            extras: list[SubMetric] = []
            for item in unmatched:
                item_key = item.key.strip().lower()
                if not item_key:
                    extras.append(item)
                    continue
                item_first = item_key.split()[0] if item_key.split() else ""
                item_tokens = set(item_key.split())

                best_exp: str | None = None
                best_score = 0.0
                for exp in expected:
                    if exp.lower() in by_key_lower:
                        continue
                    exp_lower = exp.lower()
                    exp_tokens = set(exp_lower.split())
                    exp_first = exp_lower.split()[0] if exp_lower.split() else ""

                    # Heuristic 1: shared first word is a strong signal.
                    first_word_hit = bool(item_first) and item_first == exp_first
                    # Heuristic 2: token overlap ratio.
                    overlap = len(item_tokens & exp_tokens)
                    union = len(item_tokens | exp_tokens) or 1
                    token_ratio = overlap / union
                    # Heuristic 3: character-level similarity.
                    char_ratio = SequenceMatcher(None, item_key, exp_lower).ratio()

                    score = char_ratio
                    # Require BOTH a first-word match AND meaningful char
                    # overlap before applying the strong 0.85 boost. The
                    # first-word signal alone produced false positives
                    # (e.g. "Source ranking" vs "Source selection" both
                    # start with "Source" but otherwise diverge).
                    if first_word_hit and char_ratio >= 0.5:
                        score = max(score, 0.85)
                    if token_ratio >= 0.5:
                        score = max(score, 0.75)

                    if score > best_score:
                        best_score = score
                        best_exp = exp

                # Only accept fuzzy matches that clear a confidence floor.
                if best_exp is not None and best_score >= 0.6:
                    by_key_lower[best_exp.lower()] = SubMetric(
                        key=best_exp,
                        value=max(0.0, min(1.0, item.value)),
                        note=item.note[:240],
                    )
                else:
                    extras.append(item)

            ordered: list[SubMetric] = []
            for exp in expected:
                ordered.append(
                    by_key_lower.get(exp.lower(), SubMetric(key=exp, value=0.0, note=""))
                )
            ordered.extend(extras)
            ordered = ordered[: HARD_CAPS[field_name]]
            setattr(self, field_name, ordered)

        # 3. Trim other arrays to their hard caps.
        self.red_flags = self.red_flags[: HARD_CAPS["red_flags"]]
        self.entities = self.entities[: HARD_CAPS["entities"]]
        self.topics = self.topics[: HARD_CAPS["topics"]]
        self.highlights = self.highlights[: HARD_CAPS["highlights"]]

        # 3b. Topics backfill: never leave the array empty, the UI needs a tag.
        if not self.topics:
            self.topics = ["uncategorized"]

        # 4. Sentiment series: clamp values, trim length, ensure at least 4 points.
        clamped = [max(-1.0, min(1.0, v)) for v in self.sentiment_series]
        clamped = clamped[: HARD_CAPS["sentiment_series"]]
        if len(clamped) < 4 and clamped:
            # Pad with the last value held flat. A flat tail is honest about
            # the lack of signal; the previous "last * 0.5" decay looked like
            # a real downward trend in the sparkline.
            last = clamped[-1]
            while len(clamped) < 4:
                clamped.append(last)
        elif not clamped:
            clamped = [0.0, 0.0, 0.0, 0.0]
        self.sentiment_series = clamped

        # 5. Entities: ensure mentions >= 1.
        self.entities = [
            Entity(name=e.name, type=e.type, mentions=max(1, e.mentions))
            for e in self.entities
        ]

        return self


def reconcile_highlights(article_text: str, highlights: list[Highlight]) -> list[Highlight]:
    """Validate and snap highlight offsets against the article body.

    The model often drifts a few characters when reporting offsets. We trust
    the literal `text` field over the offsets: if `article_text[start:end]`
    does not equal `text`, search the article for `text` and snap to the
    closest match. Drop highlights we cannot reconcile.

    Also enforces note <= 240 chars and text <= 400 chars (since these
    bounds are no longer in the Field schema).
    """
    fixed: list[Highlight] = []
    seen: set[tuple[int, int]] = set()

    for h in highlights:
        # Apply length caps that used to be enforced by Field.
        note = (h.note or "")[:240]
        target = (h.text or "")[:400]
        if not target:
            continue

        if 0 <= h.start < h.end <= len(article_text):
            actual = article_text[h.start : h.end]
            if actual == target:
                key = (h.start, h.end)
                if key not in seen:
                    seen.add(key)
                    fixed.append(
                        Highlight(start=h.start, end=h.end, type=h.type, note=note, text=target)
                    )
                continue

        idx = article_text.find(target)
        if idx == -1:
            idx = article_text.lower().find(target.lower())
        if idx == -1:
            continue
        new_start = idx
        new_end = idx + len(target)
        key = (new_start, new_end)
        if key in seen:
            continue
        seen.add(key)
        fixed.append(
            Highlight(
                start=new_start,
                end=new_end,
                type=h.type,
                note=note,
                text=article_text[new_start:new_end],
            )
        )

    # Drop overlaps. Keep the earlier-listed (model's preference) and skip overlappers.
    fixed.sort(key=lambda h: (h.start, h.end))
    non_overlapping: list[Highlight] = []
    cursor = 0
    for h in fixed:
        if h.start >= cursor:
            non_overlapping.append(h)
            cursor = h.end
    return non_overlapping


class AIProvider(ABC):
    @abstractmethod
    def analyze(
        self, article_text: str, deep: bool = False
    ) -> tuple[AnalysisResult, str]:
        """Analyze the article.

        Returns a tuple of (result, sanitized_article). The sanitized article
        is whatever text the model actually saw after prompt-defense scrubbing.
        Callers can echo it back so frontend offsets line up. The string is
        always populated even in shallow mode so callers do not have to
        special-case None.
        """
        ...
