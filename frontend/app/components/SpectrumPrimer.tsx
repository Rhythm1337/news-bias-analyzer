"use client";

import { ChevronDown, Compass } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

export function SpectrumPrimer() {
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: 18,
          textAlign: "left",
          background: "transparent",
          border: 0,
          color: "var(--ink)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              display: "inline-flex",
              height: 32,
              width: 32,
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--rule)",
              background: "var(--c-bias-soft)",
              color: "var(--c-bias)",
              borderRadius: "var(--radius)",
            }}
          >
            <Compass size={16} aria-hidden />
          </span>
          <span>
            <span
              className="serif"
              style={{
                display: "block",
                fontSize: 17,
                fontWeight: 500,
                color: "var(--ink)",
                letterSpacing: "-0.01em",
              }}
            >
              New here? What do these scores really mean?
            </span>
            <span
              style={{
                display: "block",
                fontSize: 12.5,
                color: "var(--ink-3)",
                marginTop: 2,
              }}
            >
              A quick guide to the bias scale
            </span>
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: "var(--ink-4)", display: "inline-flex" }}
        >
          <ChevronDown size={18} aria-hidden />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                padding: "4px 22px 22px",
                borderTop: "1px solid var(--rule)",
                fontSize: 14,
                color: "var(--ink-2)",
                lineHeight: 1.6,
                display: "flex",
                flexDirection: "column",
                gap: 18,
                marginTop: 4,
              }}
            >
              <SpectrumDiagram />

              <Item
                title="Left to Right"
                body={
                  <ul style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                    <li>
                      <strong>Left:</strong> tends to support more government
                      help for people, more rules for business, and newer
                      social ideas.
                    </li>
                    <li>
                      <strong>Center:</strong> a balanced view, or a topic
                      that does not fit clearly on the left or right.
                    </li>
                    <li>
                      <strong>Right:</strong> tends to support free markets,
                      lower taxes, and older social ideas.
                    </li>
                  </ul>
                }
              />

              <Item
                title="Bias is not the same as wrong"
                body={
                  <p style={{ margin: 0 }}>
                    A left or right leaning article can still be true. A
                    centered article can still mislead.{" "}
                    <strong>Bias</strong> shows the point of view.{" "}
                    <strong>Factual</strong> reliability is a separate score.
                  </p>
                }
              />

              <Item
                title="Center is not always right"
                body={
                  <p style={{ margin: 0 }}>
                    Watch out for <em>false balance</em>. This is when two
                    sides are shown as equal, even when the evidence is not.
                    It sounds fair, but it can still mislead.
                  </p>
                }
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SpectrumDiagram() {
  return (
    <div
      style={{
        border: "1px solid var(--rule)",
        background: "var(--bg-2)",
        padding: 14,
        borderRadius: "var(--radius)",
      }}
    >
      <div
        style={{
          height: 8,
          borderRadius: 999,
          background:
            "linear-gradient(to right, var(--bias-l), var(--bias-c), var(--bias-r))",
        }}
      />
      <div
        className="mono"
        style={{
          marginTop: 8,
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: ".08em",
          color: "var(--ink-4)",
        }}
      >
        <span style={{ textAlign: "left", color: "var(--bias-l)" }}>Left</span>
        <span style={{ textAlign: "center" }}>Center-L</span>
        <span style={{ textAlign: "center" }}>Center</span>
        <span style={{ textAlign: "center" }}>Center-R</span>
        <span style={{ textAlign: "right", color: "var(--bias-r)" }}>Right</span>
      </div>
    </div>
  );
}

function Item({
  title,
  body,
}: {
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ color: "var(--ink-2)" }}>{body}</div>
    </div>
  );
}
