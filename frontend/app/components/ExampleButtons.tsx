"use client";

import { motion } from "motion/react";
import { FileText, Flame, Megaphone } from "lucide-react";

import { EXAMPLES, type Example } from "@/app/lib/examples";

const ICONS: Record<string, React.ReactNode> = {
  "neutral-wire": <FileText size={14} aria-hidden />,
  "loaded-opinion": <Flame size={14} aria-hidden />,
  "sensational-clickbait": <Megaphone size={14} aria-hidden />,
};

export function ExampleButtons({
  onPick,
}: {
  onPick: (ex: Example) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Or try a sample article to see how the scoring works:
      </p>
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <motion.button
            key={ex.id}
            type="button"
            onClick={() => onPick(ex)}
            title={ex.description}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white/70 dark:bg-zinc-800/70 hover:bg-white dark:hover:bg-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 text-zinc-700 dark:text-zinc-200 transition shadow-sm"
          >
            {ICONS[ex.id]}
            {ex.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
