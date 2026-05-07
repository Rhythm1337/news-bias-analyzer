export const METRIC_DEFINITIONS = {
  political: {
    title: "Political bias",
    body: "Where the article sits on the left/right political spectrum. 'Left' generally favors larger social safety nets, progressive social policy, and stronger market regulation. 'Right' generally favors free markets, traditional social policy, and smaller government. 'Center' = balanced or non-partisan framing. Bias does not mean wrong: a left-leaning article can still be factually accurate, and 'center' isn't automatically truthful (false-balance fallacy).",
  },
  emotional: {
    title: "Emotional tone",
    body: "How emotionally charged the language is. 'Calm' = neutral reporting voice. 'Charged' = strong adjectives, urgency. 'Inflammatory' = anger/fear language designed to provoke. High emotional tone correlates with lower factual reliability but isn't the same thing.",
  },
  factual: {
    title: "Factual reliability",
    body: "How well the article supports its claims: named sources, primary documents, quoted experts, links to studies. 'High' = well-sourced. 'Low' = bare assertions, anonymous sources only, or unfalsifiable claims. This rates *sourcing*, not whether you agree with the conclusions.",
  },
  fakeLikelihood: {
    title: "Fake-news likelihood",
    body: "Estimated probability the article contains fabricated, misleading, or substantially distorted content. Heuristic, based on signals like missing sources, sensationalist framing, suspicious claims, and inconsistencies. NOT a definitive verdict; treat >50% as 'verify before sharing'.",
  },
  sentiment: {
    title: "Sentiment",
    body: "Overall positive/negative/neutral framing of the topic. Independent of bias: a center-right outlet and a center-left outlet can both have 'negative' sentiment about the same scandal.",
  },
} as const;

export const RED_FLAG_GLOSSARY: Record<string, string> = {
  "loaded language":
    "Words chosen to evoke a strong emotional reaction (e.g., 'slammed', 'destroyed', 'thug') instead of neutral descriptors. A signal of persuasion over reporting.",
  "missing sources":
    "Claims aren't backed by named people, documents, or studies. Often appears as 'experts say' or 'sources confirm' without specifics.",
  "anonymous sources":
    "Heavy reliance on unnamed sources. Sometimes legitimate (whistleblowers) but often used to launder unverifiable claims.",
  "emotional appeals":
    "Argument relies on triggering fear, anger, pride, or sympathy rather than evidence and reasoning.",
  "ad hominem":
    "Attacks a person's character instead of addressing their argument or actions.",
  "false dichotomy":
    "Presents only two options when more exist (e.g., 'you're either with us or against us').",
  "appeal to fear":
    "Frames consequences as catastrophic to push the reader toward a conclusion.",
  "cherry-picking":
    "Citing only data/quotes that support the conclusion while ignoring contradicting evidence.",
  "strawman":
    "Misrepresents an opposing view in a weakened form, then attacks that fake version.",
  sensationalism:
    "Headline or framing exaggerated for shock/clicks beyond what the underlying facts support.",
  "unverified claims":
    "Statements presented as fact without supporting evidence the reader can check.",
  "headline mismatch":
    "Headline implies more (or different) than the body of the article actually says.",
  speculation:
    "Presents guesses or 'what-if' framing as if they were established facts.",
  "lack of context":
    "Omits surrounding facts that would change the reader's interpretation.",
  "biased framing":
    "Word choice or article structure presupposes a conclusion before evidence is presented.",
};

export function lookupRedFlag(flag: string): string | null {
  const key = flag.toLowerCase().trim();
  if (RED_FLAG_GLOSSARY[key]) return RED_FLAG_GLOSSARY[key];
  for (const k of Object.keys(RED_FLAG_GLOSSARY)) {
    if (key.includes(k) || k.includes(key)) return RED_FLAG_GLOSSARY[k];
  }
  return null;
}

export const SCORE_SCALE_NOTE =
  "Scores are AI estimates, not measurements. Treat them as a starting point for your own critical reading.";
