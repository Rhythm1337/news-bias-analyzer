"use client";

import { useState } from "react";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ShieldCheck, Zap } from "lucide-react";

export type TechniqueItem = {
  name: string;
  summary: string;
  example: string;
  counter: string;
};

export function TechniqueAccordion({ items }: { items: TechniqueItem[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <ul
      className="card"
      style={{
        margin: 0,
        padding: 0,
        listStyle: "none",
        overflow: "hidden",
      }}
    >
      {items.map((it, i) => {
        const open = openIdx === i;
        const isLast = i === items.length - 1;
        return (
          <li
            key={it.name}
            style={{
              borderBottom: isLast ? "none" : "1px solid var(--rule)",
            }}
          >
            <button
              type="button"
              onClick={() => setOpenIdx(open ? null : i)}
              aria-expanded={open}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "14px 18px",
                textAlign: "left",
                border: 0,
                background: open ? "var(--bg-2)" : "transparent",
                color: "var(--ink)",
                transition: "background 0.15s",
                fontFamily: "var(--body)",
              }}
              onMouseEnter={(e) => {
                if (!open) e.currentTarget.style.background = "var(--bg-2)";
              }}
              onMouseLeave={(e) => {
                if (!open) e.currentTarget.style.background = "transparent";
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  minWidth: 0,
                }}
              >
                <span
                  className="mono tnum"
                  style={{
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    border: "1px solid var(--rule-2)",
                    background: "var(--paper)",
                    color: "var(--ink-2)",
                    fontSize: 11,
                    fontWeight: 500,
                    borderRadius: 2,
                    letterSpacing: ".04em",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    className="serif"
                    style={{
                      display: "block",
                      fontSize: 17,
                      fontWeight: 500,
                      color: "var(--ink)",
                      letterSpacing: "-0.005em",
                      lineHeight: 1.3,
                    }}
                  >
                    {it.name}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: 13,
                      color: "var(--ink-3)",
                      marginTop: 2,
                      lineHeight: 1.4,
                    }}
                  >
                    {it.summary}
                  </span>
                </span>
              </span>
              <motion.span
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  color: "var(--ink-4)",
                  flexShrink: 0,
                  display: "inline-flex",
                }}
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
                  transition={{ duration: 0.22 }}
                  style={{ overflow: "hidden" }}
                >
                  <div
                    style={{
                      padding: "4px 18px 18px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <Quote
                      icon={<Zap size={12} aria-hidden />}
                      iconColor="var(--c-tone)"
                      label="Looks like"
                      body={it.example}
                      italic
                    />
                    <Quote
                      icon={<ShieldCheck size={12} aria-hidden />}
                      iconColor="var(--c-fact)"
                      label="What to do"
                      body={it.counter}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}

function Quote({
  icon,
  iconColor,
  label,
  body,
  italic,
}: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  body: string;
  italic?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--rule)",
        borderRadius: 2,
        padding: "10px 14px",
      }}
    >
      <p
        className="mono"
        style={{
          margin: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 10,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
        }}
      >
        <span style={{ color: iconColor, display: "inline-flex" }}>{icon}</span>
        {label}
      </p>
      <p
        style={{
          marginTop: 6,
          marginBottom: 0,
          fontSize: 14,
          lineHeight: 1.55,
          color: "var(--ink-2)",
          fontStyle: italic ? "italic" : "normal",
        }}
      >
        {body}
      </p>
    </div>
  );
}
