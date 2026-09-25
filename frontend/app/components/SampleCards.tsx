"use client";

import { AlertTriangle, FileText, Flame } from "lucide-react";

import { EXAMPLES, type Example } from "@/app/lib/examples";

const ICONS: Record<string, React.ReactNode> = {
  "neutral-wire": <FileText size={14} aria-hidden />,
  "loaded-opinion": <AlertTriangle size={14} aria-hidden />,
  "sensational-clickbait": <Flame size={14} aria-hidden />,
};

const SUBLABEL: Record<string, string> = {
  "neutral-wire": "Neutral wire-service style · balanced and calm",
  "loaded-opinion": "Fictional opinion site · loaded words",
  "sensational-clickbait": "Fictional clickbait · low on facts",
};

export function SampleCards({ onPick }: { onPick: (ex: Example) => void }) {
  return (
    <div>
      <div className="div-w" style={{ margin: "8px 0 14px" }}>
        Or try a sample article to see how scoring works
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
        }}
      >
        {EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => onPick(ex)}
            title={ex.description}
            className="card sample-card"
            style={{
              padding: 14,
              textAlign: "left",
              cursor: "pointer",
              background: "var(--paper)",
              transition: "border-color 0.15s, transform 0.05s",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 4,
                  background: "var(--bg-2)",
                  color: "var(--ink-2)",
                }}
              >
                {ICONS[ex.id]}
              </span>
              <span
                style={{
                  fontWeight: 500,
                  fontSize: 13,
                  color: "var(--ink)",
                }}
              >
                {ex.label}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
              {SUBLABEL[ex.id] ?? ex.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
