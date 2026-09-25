"use client";

import { useEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle } from "lucide-react";

import { lookupRedFlag } from "@/app/lib/glossary";

export function RedFlagChip({ flag }: { flag: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const definition = lookupRedFlag(flag);
  const interactive = definition !== null;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "var(--mono)",
    fontSize: 10.5,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    padding: "3px 8px",
    borderRadius: 999,
    border: "1px solid var(--c-fake)",
    color: "var(--c-fake)",
    background: "var(--c-fake-soft)",
  };

  if (!interactive) {
    return (
      <span style={baseStyle}>
        <AlertTriangle size={12} aria-hidden />
        {flag}
      </span>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.96 }}
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          ...baseStyle,
          cursor: "help",
          transition: "background 0.15s",
        }}
      >
        <AlertTriangle size={12} aria-hidden />
        {flag}
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            role="tooltip"
            className="card"
            style={{
              position: "absolute",
              zIndex: 20,
              left: 0,
              top: 36,
              width: 288,
              padding: 14,
              boxShadow: "var(--shadow-2)",
              fontSize: 12.5,
              color: "var(--ink-2)",
              lineHeight: 1.5,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            <p
              className="eyebrow"
              style={{
                margin: 0,
                marginBottom: 6,
                color: "var(--c-fake)",
                textTransform: "capitalize",
                letterSpacing: ".06em",
              }}
            >
              {flag}
            </p>
            <p style={{ margin: 0 }}>{definition}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
