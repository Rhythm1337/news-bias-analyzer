"use client";

import { useEffect, useId, useRef, useState } from "react";

import { AnimatePresence, motion } from "motion/react";
import { Coffee, Loader2, X } from "lucide-react";

import type { BackendStatusState } from "@/app/lib/useBackendStatus";

const ESTIMATED_COLD_START_S = 60;

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1
  );
}

export function WakingModal({ status }: { status: BackendStatusState }) {
  const [dismissed, setDismissed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Reset dismissed when a new wake cycle begins. The lint rule warns
  // against setState in an effect; here it's intentional, the trigger is
  // an explicit external state transition we want to react to.
  useEffect(() => {
    if (status === "waking") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(false);
      setElapsed(0);
    }
  }, [status]);

  useEffect(() => {
    if (status !== "waking") return;
    const start = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [status]);

  const open = status === "waking" && !dismissed;
  const progress = Math.min(99, Math.round((elapsed / ESTIMATED_COLD_START_S) * 100));

  // Focus management plus Escape and Tab trap while the dialog is open.
  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current =
      typeof document !== "undefined"
        ? (document.activeElement as HTMLElement | null)
        : null;

    // Defer focusing the close button until after motion mounts the node.
    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setDismissed(true);
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = getFocusable(dialogRef.current);
      if (focusable.length === 0) {
        e.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !dialogRef.current.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      const prev = previouslyFocusedRef.current;
      if (prev && typeof prev.focus === "function") {
        prev.focus();
      }
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "color-mix(in oklab, var(--ink) 35%, transparent)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            padding: 16,
          }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="card"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 460,
              padding: 24,
              boxShadow: "var(--shadow-2)",
            }}
          >
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Dismiss"
              onClick={() => setDismissed(true)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "transparent",
                border: 0,
                color: "var(--ink-4)",
                padding: 2,
                display: "inline-flex",
              }}
            >
              <X size={16} aria-hidden />
            </button>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <span
                style={{
                  display: "inline-flex",
                  height: 40,
                  width: 40,
                  flexShrink: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--rule)",
                  background: "var(--c-tone-soft)",
                  color: "var(--c-tone)",
                  borderRadius: "var(--radius)",
                }}
              >
                <Coffee size={18} aria-hidden />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  Cold start
                </div>
                <h2
                  id={titleId}
                  className="serif"
                  style={{
                    margin: 0,
                    fontSize: 22,
                    lineHeight: 1.2,
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                    color: "var(--ink)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  Waking the backend
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
                    style={{ color: "var(--ink-4)", display: "inline-flex" }}
                  >
                    <Loader2 size={14} aria-hidden />
                  </motion.span>
                </h2>
                <p
                  style={{
                    marginTop: 8,
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    color: "var(--ink-2)",
                  }}
                >
                  This site uses Render&rsquo;s free tier, which sleeps after
                  15 minutes of no traffic. The first request after a sleep
                  takes up to a minute to wake up.
                </p>
                <p
                  style={{
                    marginTop: 8,
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    color: "var(--ink-3)",
                  }}
                >
                  Hang tight, this dialog will close itself when the backend
                  is ready.
                </p>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div
                className="mono tnum"
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: "var(--ink-3)",
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                <span>{elapsed}s elapsed</span>
                <span>~{ESTIMATED_COLD_START_S}s typical</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Backend wake-up progress"
                style={{
                  height: 6,
                  background: "var(--bg-3)",
                  borderRadius: 999,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <motion.div
                  style={{
                    height: "100%",
                    background: "var(--c-tone)",
                    borderRadius: 999,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
