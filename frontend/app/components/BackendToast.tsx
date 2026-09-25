"use client";

import { useEffect, useState } from "react";

import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  Loader2,
  X,
  XCircle,
} from "lucide-react";

import type { BackendStatusState } from "@/app/lib/useBackendStatus";

const READY_AUTO_DISMISS_MS = 2_500;

type ToastConfig = {
  tone: "info" | "success" | "error";
  icon: React.ReactNode;
  title: string;
  body: string;
};

function configFor(status: BackendStatusState): ToastConfig | null {
  switch (status) {
    case "checking":
      return {
        tone: "info",
        icon: (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            style={{ display: "inline-flex" }}
          >
            <Loader2 size={14} aria-hidden />
          </motion.span>
        ),
        title: "Checking backend",
        body: "One moment while we verify the API is up.",
      };
    case "waking":
      return {
        tone: "info",
        icon: (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            style={{ display: "inline-flex" }}
          >
            <Loader2 size={14} aria-hidden />
          </motion.span>
        ),
        title: "Backend is waking up",
        body: "Free hosting sleeps when idle. Please wait up to a minute.",
      };
    case "ready":
      return {
        tone: "success",
        icon: <CheckCircle2 size={14} aria-hidden />,
        title: "Backend ready",
        body: "Paste a URL or article and hit Analyze.",
      };
    case "down":
      return {
        tone: "error",
        icon: <XCircle size={14} aria-hidden />,
        title: "Backend unavailable",
        body: "It didn't wake up in time. Try the retry button in the header.",
      };
  }
}

export function BackendToast({ status }: { status: BackendStatusState }) {
  // Parent re-keys this component on status, so a fresh mount happens for
  // each new status. dismissed only needs to track this single-status life.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (status !== "ready" || dismissed) return;
    const t = setTimeout(() => setDismissed(true), READY_AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [status, dismissed]);

  const config = configFor(status);
  const open = config !== null && !dismissed;

  const toneStyle: React.CSSProperties | null = config
    ? {
        info: {
          borderColor: "var(--c-tone)",
          background: "var(--c-tone-soft)",
          color: "var(--c-tone)",
        },
        success: {
          borderColor: "var(--c-fact)",
          background: "var(--c-fact-soft)",
          color: "var(--c-fact)",
        },
        error: {
          borderColor: "var(--c-fake)",
          background: "var(--c-fake-soft)",
          color: "var(--c-fake)",
        },
      }[config.tone]
    : null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 76,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 60,
        width: "100%",
        maxWidth: 420,
        padding: "0 16px",
        pointerEvents: "none",
      }}
    >
      <AnimatePresence>
        {open && config && toneStyle && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.22 }}
            style={{
              position: "relative",
              pointerEvents: "auto",
              border: "1px solid",
              borderRadius: "var(--radius)",
              boxShadow: "var(--shadow-2)",
              padding: "14px 36px 14px 14px",
              ...toneStyle,
            }}
          >
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setDismissed(true)}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "transparent",
                border: 0,
                color: "currentColor",
                opacity: 0.6,
                padding: 2,
                display: "inline-flex",
              }}
            >
              <X size={14} aria-hidden />
            </button>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ marginTop: 2, flexShrink: 0 }}>{config.icon}</span>
              <div style={{ minWidth: 0 }}>
                <p
                  className="eyebrow"
                  style={{
                    margin: 0,
                    color: "currentColor",
                    fontSize: 10.5,
                    letterSpacing: ".14em",
                  }}
                >
                  {config.title}
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 13,
                    lineHeight: 1.45,
                    color: "var(--ink-2)",
                  }}
                >
                  {config.body}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
