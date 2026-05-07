"use client";

import { useState } from "react";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ShieldCheck, Zap } from "lucide-react";

export type TechniqueItem = {
  name: string;
  summary: string;
  example: string;
  counter: string;
};

export function TechniqueAccordion({ items }: { items: TechniqueItem[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <ul className="rounded-2xl border border-zinc-200 dark:border-zinc-800 card-glass overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
      {items.map((it, i) => {
        const open = openIdx === i;
        return (
          <li key={it.name}>
            <button
              type="button"
              onClick={() => setOpenIdx(open ? null : i)}
              className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition"
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-orange-500 to-red-500 text-white text-xs font-bold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {it.name}
                  </span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {it.summary}
                  </span>
                </span>
              </span>
              <motion.span
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-zinc-400 shrink-0"
              >
                <ChevronDown size={18} aria-hidden />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 sm:px-5 pb-4 pt-1 space-y-3">
                    <Quote
                      icon={<Zap size={14} className="text-amber-500" />}
                      label="Looks like"
                      body={it.example}
                    />
                    <Quote
                      icon={<ShieldCheck size={14} className="text-emerald-500" />}
                      label="Counter"
                      body={it.counter}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}

function Quote({
  icon,
  label,
  body,
}: {
  icon: React.ReactNode;
  label: string;
  body: string;
}) {
  return (
    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900/60 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {icon} {label}
      </p>
      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
        {body}
      </p>
    </div>
  );
}
