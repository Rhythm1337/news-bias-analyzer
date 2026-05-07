/**
 * Curated source-credibility ratings, aggregated from public summaries by
 * AllSides (https://www.allsides.com/media-bias) and Media Bias / Fact Check
 * (https://mediabiasfactcheck.com/).
 *
 * Ratings are independent of our AI's analysis and are intended to give
 * readers a second opinion. Reasonable people disagree on these. They are
 * NOT authoritative, and the lists themselves have been criticized for
 * methodology. Treat them as one input, not a verdict.
 */

export type Bias =
  | "left"
  | "center-left"
  | "center"
  | "center-right"
  | "right";

export type Factual = "very-high" | "high" | "mixed" | "low" | "very-low";

export type SourceRating = {
  name: string;
  bias: Bias;
  factual: Factual;
  notes?: string;
};

export const SOURCE_DB: Record<string, SourceRating> = {
  // Wire services / international
  "reuters.com": { name: "Reuters", bias: "center", factual: "very-high" },
  "apnews.com": { name: "Associated Press", bias: "center", factual: "very-high" },
  "afp.com": { name: "AFP", bias: "center", factual: "very-high" },
  "bbc.com": { name: "BBC", bias: "center-left", factual: "high" },
  "bbc.co.uk": { name: "BBC", bias: "center-left", factual: "high" },
  "aljazeera.com": { name: "Al Jazeera", bias: "center-left", factual: "mixed" },
  "economist.com": { name: "The Economist", bias: "center", factual: "very-high" },
  "ft.com": { name: "Financial Times", bias: "center", factual: "very-high" },

  // US: left
  "nytimes.com": { name: "The New York Times", bias: "center-left", factual: "high" },
  "washingtonpost.com": { name: "The Washington Post", bias: "center-left", factual: "high" },
  "cnn.com": { name: "CNN", bias: "left", factual: "mixed" },
  "msnbc.com": { name: "MSNBC", bias: "left", factual: "mixed" },
  "huffpost.com": { name: "HuffPost", bias: "left", factual: "mixed" },
  "vox.com": { name: "Vox", bias: "left", factual: "high" },
  "slate.com": { name: "Slate", bias: "left", factual: "mixed" },
  "theatlantic.com": { name: "The Atlantic", bias: "center-left", factual: "high" },
  "newyorker.com": { name: "The New Yorker", bias: "left", factual: "high" },
  "motherjones.com": { name: "Mother Jones", bias: "left", factual: "high" },
  "salon.com": { name: "Salon", bias: "left", factual: "mixed" },
  "theintercept.com": { name: "The Intercept", bias: "left", factual: "high" },
  "npr.org": { name: "NPR", bias: "center-left", factual: "high" },
  "pbs.org": { name: "PBS", bias: "center", factual: "high" },
  "time.com": { name: "Time", bias: "center-left", factual: "high" },
  "buzzfeednews.com": { name: "BuzzFeed News", bias: "left", factual: "high" },

  // US: center / business
  "usatoday.com": { name: "USA Today", bias: "center", factual: "high" },
  "politico.com": { name: "Politico", bias: "center", factual: "high" },
  "axios.com": { name: "Axios", bias: "center", factual: "high" },
  "bloomberg.com": { name: "Bloomberg", bias: "center", factual: "high" },
  "newsweek.com": { name: "Newsweek", bias: "center", factual: "mixed" },
  "wired.com": { name: "Wired", bias: "center-left", factual: "high" },
  "theverge.com": { name: "The Verge", bias: "center-left", factual: "high" },
  "techcrunch.com": { name: "TechCrunch", bias: "center", factual: "high" },

  // US: right
  "wsj.com": { name: "Wall Street Journal", bias: "center-right", factual: "high" },
  "foxnews.com": { name: "Fox News", bias: "right", factual: "mixed" },
  "nypost.com": { name: "New York Post", bias: "right", factual: "mixed" },
  "washingtontimes.com": { name: "The Washington Times", bias: "right", factual: "mixed" },
  "washingtonexaminer.com": { name: "Washington Examiner", bias: "right", factual: "mixed" },
  "nationalreview.com": { name: "National Review", bias: "right", factual: "high" },
  "thedispatch.com": { name: "The Dispatch", bias: "center-right", factual: "high" },
  "reason.com": { name: "Reason", bias: "center-right", factual: "high" },
  "dailycaller.com": { name: "The Daily Caller", bias: "right", factual: "mixed" },
  "breitbart.com": { name: "Breitbart", bias: "right", factual: "low" },
  "newsmax.com": { name: "Newsmax", bias: "right", factual: "low" },
  "oann.com": { name: "OANN", bias: "right", factual: "very-low" },
  "infowars.com": { name: "InfoWars", bias: "right", factual: "very-low", notes: "Repeatedly fact-checked as publishing conspiracy theories." },

  // UK
  "theguardian.com": { name: "The Guardian", bias: "left", factual: "high" },
  "independent.co.uk": { name: "The Independent", bias: "center-left", factual: "high" },
  "telegraph.co.uk": { name: "The Telegraph", bias: "right", factual: "high" },
  "thetimes.co.uk": { name: "The Times (UK)", bias: "center-right", factual: "high" },
  "dailymail.co.uk": { name: "Daily Mail", bias: "right", factual: "low" },
  "thesun.co.uk": { name: "The Sun", bias: "right", factual: "low" },
  "mirror.co.uk": { name: "The Mirror", bias: "left", factual: "mixed" },
  "express.co.uk": { name: "The Express", bias: "right", factual: "mixed" },

  // India
  "thehindu.com": { name: "The Hindu", bias: "center-left", factual: "high" },
  "indianexpress.com": { name: "The Indian Express", bias: "center", factual: "high" },
  "timesofindia.indiatimes.com": { name: "Times of India", bias: "center", factual: "mixed" },
  "ndtv.com": { name: "NDTV", bias: "center-left", factual: "high" },
  "thewire.in": { name: "The Wire", bias: "left", factual: "high" },
  "thequint.com": { name: "The Quint", bias: "center-left", factual: "high" },
  "scroll.in": { name: "Scroll.in", bias: "left", factual: "high" },
  "republicworld.com": { name: "Republic", bias: "right", factual: "low" },
  "opindia.com": { name: "OpIndia", bias: "right", factual: "low" },
  "swarajyamag.com": { name: "Swarajya", bias: "right", factual: "mixed" },
  "hindustantimes.com": { name: "Hindustan Times", bias: "center", factual: "high" },

  // Other
  "rt.com": { name: "RT (Russia Today)", bias: "right", factual: "low", notes: "State-funded by the Russian government." },
  "sputniknews.com": { name: "Sputnik", bias: "right", factual: "low", notes: "State-funded by the Russian government." },
  "cgtn.com": { name: "CGTN", bias: "left", factual: "mixed", notes: "State-funded by the Chinese government." },
  "xinhuanet.com": { name: "Xinhua", bias: "left", factual: "mixed", notes: "State-funded by the Chinese government." },
};

const HOST_PREFIXES_TO_STRIP = ["www.", "m.", "amp.", "edition."];

export function lookupSource(url: string | null): SourceRating | null {
  if (!url) return null;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const prefix of HOST_PREFIXES_TO_STRIP) {
    if (host.startsWith(prefix)) host = host.slice(prefix.length);
  }
  if (SOURCE_DB[host]) return SOURCE_DB[host];

  // Fall back to parent-domain match (e.g. "europe.cnn.com" → "cnn.com").
  const parts = host.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    const candidate = parts.slice(i).join(".");
    if (SOURCE_DB[candidate]) return SOURCE_DB[candidate];
  }
  return null;
}

export const BIAS_LABEL: Record<Bias, string> = {
  left: "Left",
  "center-left": "Center-left",
  center: "Center",
  "center-right": "Center-right",
  right: "Right",
};

export const FACTUAL_LABEL: Record<Factual, string> = {
  "very-high": "Very high",
  high: "High",
  mixed: "Mixed",
  low: "Low",
  "very-low": "Very low",
};
