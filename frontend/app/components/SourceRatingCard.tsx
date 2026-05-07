"use client";

import { motion } from "motion/react";
import { ShieldCheck } from "lucide-react";

import {
  BIAS_LABEL,
  FACTUAL_LABEL,
  type SourceRating,
} from "@/app/lib/sources";

const BIAS_POSITIONS: Record<SourceRating["bias"], number> = {
  left: 0.1,
  "center-left": 0.3,
  center: 0.5,
  "center-right": 0.7,
  right: 0.9,
};

export function SourceRatingCard({ rating }: { rating: SourceRating }) {
  const pos = BIAS_POSITIONS[rating.bias] * 100;
  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-linear-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
          <ShieldCheck size={16} aria-hidden />
        </span>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-blue-700 dark:text-blue-300">
            Independent rating · {rating.name}
          </p>
          <p className="text-sm text-zinc-700 dark:text-zinc-200 mt-0.5">
            <strong>{BIAS_LABEL[rating.bias]}</strong> bias ·{" "}
            <strong>{FACTUAL_LABEL[rating.factual]}</strong> factual reliability
          </p>
          {rating.notes && (
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              {rating.notes}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="relative h-2 rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-zinc-400 dark:bg-zinc-600" />
          <motion.div
            initial={{ left: "50%", opacity: 0 }}
            animate={{ left: `${pos}%`, opacity: 1 }}
            transition={{ type: "spring", stiffness: 110, damping: 18 }}
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600 border-2 border-white dark:border-zinc-900 shadow-md"
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-wider text-zinc-500">
          <span>Left</span>
          <span>Center</span>
          <span>Right</span>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-zinc-500 leading-relaxed">
        Aggregated from AllSides + Media Bias / Fact Check public summaries.
        Independent of the AI analysis above.
      </p>
    </div>
  );
}
