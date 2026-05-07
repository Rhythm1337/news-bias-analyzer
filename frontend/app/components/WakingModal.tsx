"use client";

import { useEffect, useState } from "react";

import { AnimatePresence, motion } from "motion/react";
import { Coffee, Loader2, X } from "lucide-react";

import type { BackendStatusState } from "@/app/lib/useBackendStatus";

const ESTIMATED_COLD_START_S = 60;

export function WakingModal({ status }: { status: BackendStatusState }) {
  const [dismissed, setDismissed] = useState(false);
  const [elapsed, setElapsed] = useState(0);

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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm px-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl"
          >
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setDismissed(true)}
              className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
            >
              <X size={16} aria-hidden />
            </button>

            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                <Coffee size={18} aria-hidden />
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  Waking the backend
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
                    className="text-zinc-400"
                  >
                    <Loader2 size={14} aria-hidden />
                  </motion.span>
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  This site uses Render&rsquo;s free tier, which sleeps after
                  15 minutes of no traffic. The first request after a sleep
                  takes up to a minute to wake up.
                </p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Hang tight, this dialog will close itself when the backend
                  is ready.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-baseline justify-between text-xs text-zinc-500 mb-1.5">
                <span>{elapsed}s elapsed</span>
                <span>~{ESTIMATED_COLD_START_S}s typical</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <motion.div
                  className="h-full bg-linear-to-r from-amber-400 to-orange-500"
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
