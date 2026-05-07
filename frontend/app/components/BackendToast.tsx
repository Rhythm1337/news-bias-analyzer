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

  const toneClasses = config
    ? {
        info: "border-amber-200 dark:border-amber-900 bg-amber-50/95 dark:bg-amber-950/80 text-amber-900 dark:text-amber-100",
        success:
          "border-emerald-200 dark:border-emerald-900 bg-emerald-50/95 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-100",
        error:
          "border-red-200 dark:border-red-900 bg-red-50/95 dark:bg-red-950/80 text-red-900 dark:text-red-100",
      }[config.tone]
    : "";

  return (
    <div
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4 pointer-events-none"
    >
      <AnimatePresence>
        {open && config && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.22 }}
            className={`relative pointer-events-auto rounded-xl border shadow-lg backdrop-blur-sm p-3.5 pr-9 ${toneClasses}`}
          >
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setDismissed(true)}
              className="absolute top-2 right-2 opacity-60 hover:opacity-100 transition"
            >
              <X size={14} aria-hidden />
            </button>
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0">{config.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">
                  {config.title}
                </p>
                <p className="mt-0.5 text-xs leading-snug opacity-85">
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
