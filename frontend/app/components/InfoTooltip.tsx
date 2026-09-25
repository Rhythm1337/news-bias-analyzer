"use client";

import { useEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "motion/react";
import { Info } from "lucide-react";

export function InfoTooltip({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        aria-label={`What is ${title}?`}
        onClick={() => setOpen((v) => !v)}
        style={{
          marginLeft: 4,
          display: "inline-flex",
          height: 16,
          width: 16,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          color: "var(--ink-4)",
          background: "transparent",
          border: 0,
          padding: 0,
          transition: "color 0.15s",
        }}
      >
        <Info size={14} aria-hidden />
      </button>
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
              top: 24,
              width: 288,
              padding: 14,
              boxShadow: "var(--shadow-2)",
              fontSize: 12.5,
              color: "var(--ink-2)",
              lineHeight: 1.5,
            }}
          >
            <p
              className="eyebrow"
              style={{ margin: 0, marginBottom: 6 }}
            >
              {title}
            </p>
            <p style={{ margin: 0 }}>{body}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
