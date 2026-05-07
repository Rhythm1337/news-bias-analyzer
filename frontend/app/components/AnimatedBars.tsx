"use client";

import { motion } from "motion/react";

const SPRING = { type: "spring" as const, stiffness: 110, damping: 18 };

export function BipolarBar({
  value,
  leftLabel,
  rightLabel,
}: {
  value: number;
  leftLabel: string;
  rightLabel: string;
}) {
  const clamped = Math.max(-1, Math.min(1, value));
  const percent = ((clamped + 1) / 2) * 100;
  return (
    <div>
      <div className="relative h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-visible">
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-zinc-400 dark:bg-zinc-600" />
        <motion.div
          initial={{ left: "50%", opacity: 0 }}
          animate={{ left: `${percent}%`, opacity: 1 }}
          transition={SPRING}
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-to-br from-zinc-800 to-zinc-950 dark:from-zinc-100 dark:to-zinc-300 border-2 border-white dark:border-zinc-900 shadow-md"
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-wider text-zinc-500">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

export function UnipolarBar({
  value,
  gradient,
}: {
  value: number;
  gradient: string;
}) {
  const percent = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={SPRING}
        className={`h-full bg-linear-to-r ${gradient}`}
      />
    </div>
  );
}
