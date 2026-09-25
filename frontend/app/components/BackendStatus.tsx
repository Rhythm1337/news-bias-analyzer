"use client";

import { motion } from "motion/react";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";

import type { BackendStatusState } from "@/app/lib/useBackendStatus";

export function BackendStatus({
  status,
  onRetry,
}: {
  status: BackendStatusState;
  onRetry: () => void;
}) {
  if (status === "ready") {
    return (
      <span
        className="mono"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          letterSpacing: ".06em",
          textTransform: "uppercase",
          color: "var(--c-fact)",
          padding: "4px 10px",
          border: "1px solid var(--rule)",
          background: "var(--c-fact-soft)",
          borderRadius: 999,
        }}
      >
        <CheckCircle2 size={12} aria-hidden />
        <span>Backend ready</span>
      </span>
    );
  }

  if (status === "checking" || status === "waking") {
    const label = status === "waking" ? "Waking" : "Checking";
    return (
      <span
        className="mono"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          letterSpacing: ".06em",
          textTransform: "uppercase",
          color: "var(--c-tone)",
          padding: "4px 10px",
          border: "1px solid var(--rule)",
          background: "var(--c-tone-soft)",
          borderRadius: 999,
        }}
      >
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          style={{ display: "inline-flex" }}
        >
          <Loader2 size={12} aria-hidden />
        </motion.span>
        <span>{label}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onRetry}
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        color: "var(--c-fake)",
        padding: "4px 10px",
        border: "1px solid var(--c-fake)",
        background: "var(--c-fake-soft)",
        borderRadius: 999,
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <XCircle size={12} aria-hidden />
      Backend down
      <RefreshCw size={11} aria-hidden style={{ marginLeft: 2 }} />
    </button>
  );
}
