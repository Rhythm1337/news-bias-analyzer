import type { HighlightType } from "@/app/lib/types";

const ITEMS: { type: HighlightType; label: string; desc: string }[] = [
  { type: "loaded", label: "Loaded language", desc: "Word that pushes a point of view." },
  { type: "tone", label: "Strong tone", desc: "Exaggerated or emotional wording." },
  { type: "source-good", label: "Good sourcing", desc: "A clearly named source." },
  { type: "source-bad", label: "Weak sourcing", desc: "No name given, or only one side." },
  { type: "fact-good", label: "Checkable claim", desc: "A clear number or date." },
  { type: "fact-bad", label: "Shaky claim", desc: "No proof or no source given." },
];

export function HighlightLegend() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 8,
      }}
    >
      {ITEMS.map((it) => (
        <div
          key={it.type}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            fontSize: 12,
            color: "var(--ink-2)",
            lineHeight: 1.4,
          }}
        >
          <mark className={`h h-${it.type}`} style={{ fontSize: 12 }}>
            sample
          </mark>
          <span>
            <span style={{ fontWeight: 500, color: "var(--ink)" }}>{it.label}</span>
            <span style={{ color: "var(--ink-3)" }}> {it.desc}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
