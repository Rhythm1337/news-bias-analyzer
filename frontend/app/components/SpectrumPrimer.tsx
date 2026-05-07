"use client";

import { ChevronDown, Compass } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

export function SpectrumPrimer() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 card-glass overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
            <Compass size={16} aria-hidden />
          </span>
          <span>
            <span className="block font-medium text-zinc-900 dark:text-zinc-100">
              New here? What do these scores actually mean?
            </span>
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              30-second crash course on the bias spectrum
            </span>
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-zinc-400"
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
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 space-y-5 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              <SpectrumDiagram />

              <Item
                title="Left ↔ Right"
                body={
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>Left:</strong> favors stronger social safety
                      nets, regulation, progressive social policy.
                    </li>
                    <li>
                      <strong>Center:</strong> balanced framing, or topics
                      that don&rsquo;t map cleanly onto left/right.
                    </li>
                    <li>
                      <strong>Right:</strong> favors free markets, lower
                      taxes, traditional social policy.
                    </li>
                  </ul>
                }
              />

              <Item
                title="Bias is not the same as wrong"
                body={
                  <p>
                    A left- or right-leaning article can still be accurate;
                    a centered article can still mislead.{" "}
                    <strong>Bias</strong> measures perspective.{" "}
                    <strong>Factual</strong> reliability is a separate score.
                  </p>
                }
              />

              <Item
                title="Center ≠ correct"
                body={
                  <p>
                    Watch for <em>false balance</em>: treating two sides as
                    equally valid when the evidence isn&rsquo;t. Sounds
                    neutral, misleads anyway.
                  </p>
                }
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SpectrumDiagram() {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-4">
      <div className="h-2 rounded-full bg-linear-to-r from-blue-500 via-zinc-300 dark:via-zinc-600 to-red-500" />
      <div className="mt-2 grid grid-cols-5 text-[10px] uppercase tracking-wider text-zinc-500">
        <span className="text-left text-blue-600 dark:text-blue-400">Left</span>
        <span className="text-center">Center-L</span>
        <span className="text-center">Center</span>
        <span className="text-center">Center-R</span>
        <span className="text-right text-red-600 dark:text-red-400">Right</span>
      </div>
    </div>
  );
}

function Item({
  title,
  body,
}: {
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
        {title}
      </p>
      <div>{body}</div>
    </div>
  );
}
