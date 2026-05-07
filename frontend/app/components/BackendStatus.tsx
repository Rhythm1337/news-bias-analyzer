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
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 px-2.5 py-1.5">
        <CheckCircle2 size={12} aria-hidden />
        <span className="hidden sm:inline">Backend ready</span>
      </span>
    );
  }

  if (status === "checking" || status === "waking") {
    const label = status === "waking" ? "Waking" : "Checking";
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 px-2.5 py-1.5">
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
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
      className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-2.5 py-1.5 rounded-full border border-red-200 dark:border-red-900 bg-red-50/60 dark:bg-red-950/40 transition"
    >
      <XCircle size={12} aria-hidden />
      Backend down
      <RefreshCw size={11} aria-hidden className="ml-1" />
    </button>
  );
}
