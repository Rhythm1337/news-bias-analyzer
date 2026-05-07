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

  const base =
    "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900";

  if (!interactive) {
    return (
      <span className={base}>
        <AlertTriangle size={12} aria-hidden />
        {flag}
      </span>
    );
  }

  return (
    <div ref={ref} className="relative">
      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.96 }}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${base} hover:bg-red-100 dark:hover:bg-red-950/60 transition cursor-help`}
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
            className="absolute z-20 left-0 top-9 w-72 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 shadow-xl text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed"
          >
            <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1 capitalize">
              {flag}
            </p>
            <p>{definition}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
