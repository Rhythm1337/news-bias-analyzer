import { ScoreDial } from "./ScoreDial";
import type { AnalysisResult } from "@/app/lib/types";

type ScoreItem = {
  k: string;
  display: number;
  fill: number;
  label: string;
  color: string;
  signed?: boolean;
  range: string;
  /** Optional clarifier shown under the range. Used to keep readers from
   * reading the score as a verdict (e.g. "Fake Risk: High" should read as
   * "investigate", not "this article is false"). */
  hint?: string;
};

export function HeroScores({ a }: { a: AnalysisResult }) {
  // Map backend scales (-1..1, 0..1) onto the display scales the user sees.
  const items: ScoreItem[] = [
    {
      k: "Bias",
      display: Math.round(a.political.score * 50),
      fill: Math.abs(a.political.score),
      label: a.political.label,
      color: "var(--c-bias)",
      signed: true,
      range: "−50 to +50",
    },
    {
      k: "Tone",
      display: Math.round(a.emotional.score * 100),
      fill: a.emotional.score,
      label: a.emotional.label,
      color: "var(--c-tone)",
      range: "0 to 100",
    },
    {
      k: "Factuality",
      display: Math.round(a.factual.score * 100),
      fill: a.factual.score,
      label: a.factual.label,
      color: "var(--c-fact)",
      range: "0 to 100",
    },
    {
      k: "Fake Risk",
      display: Math.round(a.fake_likelihood * 100),
      fill: a.fake_likelihood,
      label:
        a.fake_likelihood > 0.66
          ? "High Risk"
          : a.fake_likelihood > 0.33
            ? "Mixed Risk"
            : "Low Risk",
      color: "var(--c-fake)",
      range: "0 to 100",
      // Color is the same red used for actual errors. Make sure readers do
      // not interpret a high score as "this article is false" when it really
      // means "this article shows warning signs worth checking."
      hint: "Investigate, not 'false'",
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((i) => (
        <ScoreCard key={i.k} item={i} />
      ))}
    </div>
  );
}

function ScoreCard({ item }: { item: ScoreItem }) {
  return (
    <div
      className="card"
      style={{ padding: 18, position: "relative", overflow: "hidden" }}
    >
      <div style={{ marginBottom: 12 }}>
        <span className="eyebrow">{item.k}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <ScoreDial
          value={item.fill}
          display={item.display}
          signed={item.signed}
          color={item.color}
          size={72}
          // A true 0 reads identically to "no data" on every metric, not just
          // signed bias. Always render a small visible arc so a real 0 (calm
          // tone, low fake risk, etc.) is distinguishable from missing data.
          minVisibleFill={0.04}
        />
        <div>
          <div
            className="serif"
            style={{
              fontSize: 22,
              lineHeight: 1.1,
              textTransform: "capitalize",
            }}
          >
            {item.label}
          </div>
          <div
            className="mono"
            style={{ fontSize: 10.5, color: "var(--ink-4)", marginTop: 4 }}
          >
            {item.range}
          </div>
          {item.hint && (
            <div
              style={{
                fontSize: 10.5,
                color: "var(--ink-3)",
                marginTop: 2,
                fontStyle: "italic",
              }}
            >
              {item.hint}
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          top: "auto",
          height: 3,
          background: item.color,
          opacity: 0.7,
        }}
      />
    </div>
  );
}
