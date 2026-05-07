from abc import ABC, abstractmethod
from typing import Literal

from pydantic import BaseModel, Field


class PoliticalBias(BaseModel):
    label: Literal["left", "center-left", "center", "center-right", "right", "unclear"]
    score: float = Field(ge=-1.0, le=1.0, description="-1 = far left, +1 = far right")


class EmotionalTone(BaseModel):
    label: Literal["calm", "neutral", "charged", "inflammatory"]
    score: float = Field(ge=0.0, le=1.0, description="0 = neutral prose, 1 = highly inflammatory")


class FactualReliability(BaseModel):
    label: Literal["high", "mixed", "low"]
    score: float = Field(ge=0.0, le=1.0, description="1 = sourced/verifiable, 0 = unsupported")


class AnalysisResult(BaseModel):
    political: PoliticalBias
    emotional: EmotionalTone
    factual: FactualReliability
    fake_likelihood: float = Field(ge=0.0, le=1.0)
    sentiment: Literal["positive", "neutral", "negative"]
    summary: str
    red_flags: list[str]
    reasoning: str


class AIProvider(ABC):
    @abstractmethod
    def analyze(self, article_text: str) -> AnalysisResult: ...
