"use client";

import { motion } from "motion/react";
import { Compass } from "lucide-react";

import {
  BIAS_LABEL,
  FACTUAL_LABEL,
  type SourceRating,
} from "@/app/lib/sources";

const BIAS_POSITIONS: Record<SourceRating["bias"], number> = {
  left: 0.1,
  "center-left": 0.3,
  center: 0.5,
  "center-right": 0.7,
  right: 0.9,
};

export function SourceRatingCard({ rating }: { rating: SourceRating }) {
  const pos = BIAS_POSITIONS[rating.bias] * 100;
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span
          style={{
            marginTop: 2,
            display: "inline-flex",
            height: 28,
            width: 28,
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            background: "var(--c-bias)",
            color: "var(--paper)",
          }}
        >
          <Compass size={16} aria-hidden />
        </span>
        <div style={{ flex: 1 }}>
          <div className="eyebrow" style={{ color: "var(--c-bias)" }}>
            Independent rating · {rating.name}
          </div>
          <p
            style={{
              fontSize: 14,
              color: "var(--ink-2)",
              margin: "4px 0 0",
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: "var(--ink)" }}>
              {BIAS_LABEL[rating.bias]}
            </strong>{" "}
            bias ·{" "}
            <strong style={{ color: "var(--ink)" }}>
              {FACTUAL_LABEL[rating.factual]}
            </strong>{" "}
            factual reliability
          </p>
          {rating.notes && (
            <p
              style={{
                marginTop: 6,
                fontSize: 12.5,
                color: "var(--ink-3)",
                lineHeight: 1.5,
              }}
            >
              {rating.notes}
            </p>
          )}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <div
          style={{
            position: "relative",
            height: 6,
            borderRadius: 999,
            background: "var(--bg-3)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: "50%",
              width: 1,
              background: "var(--rule-2)",
            }}
          />
          <motion.div
            initial={{ left: "50%", opacity: 0 }}
            animate={{ left: `${pos}%`, opacity: 1 }}
            transition={{ type: "spring", stiffness: 110, damping: 18 }}
            style={{
              position: "absolute",
              top: "50%",
              height: 14,
              width: 14,
              transform: "translate(-50%, -50%)",
              borderRadius: 999,
              background: "var(--c-bias)",
              border: "2px solid var(--paper)",
              boxShadow: "var(--shadow-1)",
            }}
          />
        </div>
        <div
          className="mono"
          style={{
            marginTop: 8,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: ".08em",
            color: "var(--ink-4)",
          }}
        >
          <span>Left</span>
          <span>Center</span>
          <span>Right</span>
        </div>
      </div>

      <p
        style={{
          marginTop: 14,
          fontSize: 11,
          color: "var(--ink-4)",
          lineHeight: 1.55,
        }}
      >
        Aggregated from AllSides + Media Bias / Fact Check public summaries.
        Independent of the AI analysis above.
      </p>
    </div>
  );
}
