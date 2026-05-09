export const METRIC_DEFINITIONS = {
  political: {
    title: "Political bias",
    body: "Where the article sits from left to right in politics. 'Left' usually supports more government help for people, newer social ideas, and stronger rules for business. 'Right' usually supports free markets, older social ideas, and smaller government. 'Center' means balanced, or a topic that does not fit clearly on either side. Bias is not the same as wrong. A left-leaning article can still be true. A 'center' article can still mislead, which is called false balance.",
  },
  emotional: {
    title: "Emotional tone",
    body: "How strong the feelings are in the words. 'Calm' means a normal, neutral reporting voice. 'Charged' means strong adjectives and a sense of urgency. 'Inflammatory' means anger or fear words made to push you. High emotional tone often goes with lower factual reliability, but the two are not the same.",
  },
  factual: {
    title: "Factual reliability",
    body: "How well the article backs up its claims: named sources, original documents, quoted experts, and links to studies. 'High' means well-sourced. 'Low' means plain claims with no proof, only unnamed sources, or claims you cannot check. This score rates *sourcing*, not whether you agree with the article.",
  },
  fakeLikelihood: {
    title: "Fake-news likelihood",
    body: "A guess at the chance the article has made-up, misleading, or twisted content. It uses signals like missing sources, shocking framing, claims that look wrong, and parts that do not match. This is NOT a final answer. If the score is over 50%, check the article before you share it.",
  },
  sentiment: {
    title: "Sentiment",
    body: "How positive, negative, or neutral the article feels overall. This is separate from bias. A center-right site and a center-left site can both feel 'negative' about the same scandal.",
  },
} as const;

export const RED_FLAG_GLOSSARY: Record<string, string> = {
  "loaded language":
    "Words picked to make you feel something strong (like 'slammed', 'destroyed', 'thug') instead of plain words. A sign the writer is trying to push you, not just report.",
  "missing sources":
    "Claims have no named people, documents, or studies behind them. Often shows up as 'experts say' or 'sources confirm' with no details.",
  "anonymous sources":
    "Heavy use of unnamed sources. Sometimes this is fair (like whistleblowers), but it is often used to share claims you cannot check.",
  "emotional appeals":
    "The argument tries to make you feel fear, anger, pride, or pity, instead of giving evidence and reasons.",
  "ad hominem":
    "Attacks a person's character instead of dealing with what they said or did.",
  "false dichotomy":
    "Shows only two choices when more exist (like 'you are either with us or against us').",
  "appeal to fear":
    "Makes the results sound terrible to push you toward a certain answer.",
  "cherry-picking":
    "Showing only the facts that fit one side. Hiding facts that point the other way.",
  "strawman":
    "Twists the other side's view into a weaker version, then attacks that fake version.",
  sensationalism:
    "The headline or framing is blown up for shock or clicks, beyond what the facts actually say.",
  "unverified claims":
    "Statements told as fact, with no evidence the reader can check.",
  "headline mismatch":
    "The headline suggests more, or something different, than what the article body actually says.",
  speculation:
    "Guesses or 'what if' ideas shown as if they were known facts.",
  "lack of context":
    "Leaves out other facts that would change how the reader sees the story.",
  "biased framing":
    "Word choice or article order assumes the answer before showing the evidence.",
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
  "Scores are AI guesses, not exact numbers. Use them as a starting point for your own careful reading.";
