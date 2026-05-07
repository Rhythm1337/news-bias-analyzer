"use client";

import {
  ChevronDown,
  Cpu,
  Lock,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

export function HowThisWorks() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 card-glass overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
            <Cpu size={16} aria-hidden />
          </span>
          <span>
            <span className="block font-medium text-zinc-900 dark:text-zinc-100">
              How this works (and why you should still think for yourself)
            </span>
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              The pipeline + the security defenses + the limitations
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
              <Block
                icon={<Wrench size={16} />}
                tone="zinc"
                title="The pipeline"
                body={
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      You paste a URL or text. URLs are fetched server-side and
                      the article body is extracted with{" "}
                      <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
                        trafilatura
                      </code>
                      .
                    </li>
                    <li>
                      Article text is wrapped in untrusted-data delimiters and
                      sent to{" "}
                      <code className="text-xs">gemini-2.5-flash</code> with a
                      strict JSON schema.
                    </li>
                    <li>The model&rsquo;s response is validated and shown.</li>
                  </ol>
                }
              />

              <Block
                icon={<Lock size={16} />}
                tone="emerald"
                title="Security defenses"
                body={
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>Prompt-injection defense.</strong> Article wrapped
                      in untrusted-data markers, delimiter tokens stripped,
                      length capped, system prompt frames it as data.
                    </li>
                    <li>
                      <strong>SSRF protection.</strong> http(s) only; private,
                      loopback, link-local and cloud-metadata IPs rejected; each
                      redirect hop revalidated.
                    </li>
                    <li>
                      <strong>Rate limiting.</strong> 20 / minute / IP.
                      Protects both availability and AI quota.
                    </li>
                    <li>
                      <strong>Pluggable provider.</strong> Gemini today; the
                      interface is provider-agnostic.
                    </li>
                  </ul>
                }
              />

              <Block
                icon={<ShieldAlert size={16} />}
                tone="amber"
                title="Limitations (read this)"
                body={
                  <ul className="list-disc pl-5 space-y-1">
                    <li>The AI is not infallible. It will sometimes miscategorize.</li>
                    <li>
                      Scores are <em>estimates</em>, not measurements. 0.42 vs
                      0.45 isn&rsquo;t meaningful.
                    </li>
                    <li>
                      The model has its own biases. Treating its output as
                      gospel is the kind of uncritical media consumption this
                      tool is meant to combat.
                    </li>
                    <li>
                      Paywalled or JS-rendered articles may not extract.
                      Paste the text instead.
                    </li>
                  </ul>
                }
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Block({
  icon,
  tone,
  title,
  body,
}: {
  icon: React.ReactNode;
  tone: "zinc" | "emerald" | "amber";
  title: string;
  body: React.ReactNode;
}) {
  const toneClass = {
    zinc: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200",
    emerald:
      "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
    amber:
      "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
  }[tone];
  return (
    <div className="flex gap-3">
      <span
        className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${toneClass}`}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          {title}
        </p>
        <div>{body}</div>
      </div>
    </div>
  );
}
