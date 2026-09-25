// Shape of /analyze responses. Numeric ranges below mirror what the backend
// post-validator clamps to in `backend/app/ai/base.py`. If you change a
// range there, change the JSDoc here.

export type SubMetric = {
  key: string;
  /** 0..1 strength of this driver. Clamped server-side. */
  value: number;
  /** One short sentence; empty string if backfilled. */
  note: string;
};

export type Entity = {
  name: string;
  type: "PER" | "ORG" | "LOC" | "LAW" | "EVENT" | "MISC";
  /** Always >= 1 server-side. */
  mentions: number;
};

export type HighlightType =
  | "loaded"
  | "tone"
  | "source-good"
  | "source-bad"
  | "fact-good"
  | "fact-bad";

export type Highlight = {
  /** 0-based char offset into `article_text`. */
  start: number;
  /** Exclusive end offset; always > start (server validates). */
  end: number;
  type: HighlightType;
  /** Reason for the flag, <=240 chars. */
  note: string;
  /** The literal substring at [start:end] in `article_text`. */
  text: string;
};

export type AnalysisResult = {
  /** score is -1 (far left) to +1 (far right). */
  political: { label: string; score: number };
  /** score is 0 (calm) to 1 (inflammatory). */
  emotional: { label: string; score: number };
  /** score is 0 (unsupported) to 1 (well-sourced). */
  factual: { label: string; score: number };
  /** 0 (low risk) to 1 (high risk). */
  fake_likelihood: number;
  sentiment: "positive" | "neutral" | "negative";
  summary: string;
  /** Up to 12 entries, server-trimmed. */
  red_flags: string[];
  reasoning: string;

  verdict: string;
  sub_bias: SubMetric[];
  sub_tone: SubMetric[];
  sub_fact: SubMetric[];
  sub_fake: SubMetric[];
  /** Per-paragraph sentiment, each value -1..+1. 4 to 24 entries. */
  sentiment_series: number[];
  entities: Entity[];
  /** 1 to 8 short topic tags. */
  topics: string[];
  /** Populated only when the request was deep mode; up to 30 spans. */
  highlights: Highlight[];
};

export type AnalyzeResponse = {
  source_url: string | null;
  title: string | null;
  article_chars: number;
  /** Echoed sanitized article body. Populated only when `deep` is true. */
  article_text: string | null;
  deep: boolean;
  analysis: AnalysisResult;
};
