"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  Compass,
  Flame,
  Gauge,
  Link as LinkIcon,
  Search,
  ShieldCheck,
  Sparkles,
  Type,
} from "lucide-react";

import { BackendStatus } from "@/app/components/BackendStatus";
import { BackendToast } from "@/app/components/BackendToast";
import { WakingModal } from "@/app/components/WakingModal";
import {
  useBackendStatus,
  type BackendStatusState,
} from "@/app/lib/useBackendStatus";
import { BipolarBar, UnipolarBar } from "@/app/components/AnimatedBars";
import { ExampleButtons } from "@/app/components/ExampleButtons";
import { HowThisWorks } from "@/app/components/HowThisWorks";
import { InfoTooltip } from "@/app/components/InfoTooltip";
import { RedFlagChip } from "@/app/components/RedFlagChip";
import { ResultsSkeleton } from "@/app/components/ResultsSkeleton";
import { SourceRatingCard } from "@/app/components/SourceRatingCard";
import { SpectrumPrimer } from "@/app/components/SpectrumPrimer";
import { METRIC_DEFINITIONS, SCORE_SCALE_NOTE } from "@/app/lib/glossary";
import { lookupSource } from "@/app/lib/sources";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const FALLBACK_MIN_TEXT_CHARS = 200;
const REQUEST_TIMEOUT_MS = 30_000;

type AnalysisResult = {
  political: { label: string; score: number };
  emotional: { label: string; score: number };
  factual: { label: string; score: number };
  fake_likelihood: number;
  sentiment: "positive" | "neutral" | "negative";
  summary: string;
  red_flags: string[];
  reasoning: string;
};

type AnalyzeResponse = {
  source_url: string | null;
  title: string | null;
  article_chars: number;
  analysis: AnalysisResult;
};

type Mode = "url" | "text";

function flattenDetail(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        if (d && typeof d === "object" && "msg" in d) {
          const msg = (d as { msg?: unknown }).msg;
          return typeof msg === "string" ? msg : JSON.stringify(d);
        }
        return typeof d === "string" ? d : JSON.stringify(d);
      })
      .join("; ");
  }
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  return fallback;
}

export default function Home() {
  const { status: backendStatus, retry: retryBackend } = useBackendStatus(API_URL);
  const [mode, setMode] = useState<Mode>("url");
  const [urlValue, setUrlValue] = useState("");
  const [textValue, setTextValue] = useState("");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [minTextChars, setMinTextChars] = useState(FALLBACK_MIN_TEXT_CHARS);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.min_text_chars === "number") {
          setMinTextChars(data.min_text_chars);
        }
      })
      .catch(() => {});
  }, []);

  function clearOutputs() {
    setResult(null);
    setError(null);
  }

  function switchMode(next: Mode) {
    setMode(next);
    clearOutputs();
  }

  async function submit() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body =
        mode === "url" ? { url: urlValue.trim() } : { text: textValue };
      const res = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(flattenDetail(data?.detail, `HTTP ${res.status}`));
      }
      setResult(data as AnalyzeResponse);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setError("Request timed out. Try again, or use text mode.");
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }

  const trimmedTextLen = textValue.trim().length;
  const canSubmit =
    !loading &&
    ((mode === "url" && urlValue.trim().length > 0) ||
      (mode === "text" && trimmedTextLen >= minTextChars));

  return (
    <main className="min-h-screen px-4 py-10 sm:py-14">
      <WakingModal status={backendStatus} />
      <BackendToast status={backendStatus} />
      <div className="mx-auto max-w-3xl space-y-6">
        <Hero backendStatus={backendStatus} retryBackend={retryBackend} />

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="rounded-2xl border border-zinc-200 dark:border-zinc-800 card-glass p-5 sm:p-6 space-y-4 shadow-sm"
        >
          <div className="inline-flex p-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80">
            <TabButton active={mode === "url"} onClick={() => switchMode("url")}>
              <LinkIcon size={14} aria-hidden /> URL
            </TabButton>
            <TabButton active={mode === "text"} onClick={() => switchMode("text")}>
              <Type size={14} aria-hidden /> Paste text
            </TabButton>
          </div>

          {mode === "url" ? (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                <LinkIcon size={16} aria-hidden />
              </span>
              <input
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://example.com/news/article"
                onKeyDown={(e) => e.key === "Enter" && canSubmit && submit()}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 pl-10 pr-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
          ) : (
            <div>
              <textarea
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder={`Paste at least ${minTextChars} characters of article text...`}
                rows={9}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
              <div className="mt-1 flex justify-between text-xs">
                <span className="text-zinc-400">
                  Min {minTextChars.toLocaleString()} chars
                </span>
                <span
                  className={
                    trimmedTextLen >= minTextChars
                      ? "text-emerald-600 dark:text-emerald-400 font-medium"
                      : "text-zinc-500 dark:text-zinc-400"
                  }
                >
                  {trimmedTextLen.toLocaleString()} / {minTextChars.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <motion.button
            onClick={submit}
            disabled={!canSubmit}
            whileTap={canSubmit ? { scale: 0.99 } : undefined}
            className="w-full rounded-lg bg-linear-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-blue-700 hover:to-indigo-700 disabled:from-zinc-400 disabled:to-zinc-400 dark:disabled:from-zinc-700 dark:disabled:to-zinc-700 disabled:cursor-not-allowed transition shadow-md hover:shadow-lg disabled:shadow-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Search size={16} aria-hidden />
                Analyze
              </>
            )}
          </motion.button>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
                <span>{error}</span>
              </motion.p>
            )}
          </AnimatePresence>

          <ExampleButtons
            onPick={(ex) => {
              setMode("text");
              setTextValue(ex.text);
              clearOutputs();
            }}
          />
        </motion.section>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ResultsSkeleton />
            </motion.div>
          ) : result ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <Results data={result} />
            </motion.div>
          ) : (
            <motion.div
              key="primer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SpectrumPrimer />
            </motion.div>
          )}
        </AnimatePresence>

        <HowThisWorks />

        <p className="text-center text-xs text-zinc-500 dark:text-zinc-500 pt-2">
          {SCORE_SCALE_NOTE}
        </p>
      </div>
    </main>
  );
}

function Hero({
  backendStatus,
  retryBackend,
}: {
  backendStatus: BackendStatusState;
  retryBackend: () => void;
}) {
  return (
    <header className="flex items-start justify-between gap-4 pt-4">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 px-2.5 py-1 text-[11px] uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          <Sparkles size={12} aria-hidden className="text-blue-500" />
          AI-powered media literacy
        </span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          News{" "}
          <span className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Bias
          </span>{" "}
          Analyzer
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400 max-w-xl">
          Paste a URL or article text. See its political bias, emotional tone,
          factual reliability, and fake-news likelihood.
        </p>
      </motion.div>
      <div className="flex items-center gap-2 shrink-0">
        <BackendStatus status={backendStatus} onRetry={retryBackend} />
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 text-sm rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 px-3 py-1.5 text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 transition"
        >
          <Compass size={14} aria-hidden /> Learn
        </Link>
      </div>
    </header>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition ${
        active
          ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm"
          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}

function Results({ data }: { data: AnalyzeResponse }) {
  const { analysis } = data;
  const sourceRating = lookupSource(data.source_url);
  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 card-glass p-5 sm:p-6 space-y-6 shadow-sm">
      {(data.title || data.source_url) && (
        <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800">
          {data.title && (
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {data.title}
            </h2>
          )}
          {data.source_url && (
            <a
              href={data.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline break-all"
            >
              {data.source_url}
            </a>
          )}
          <p className="mt-1 text-xs text-zinc-500">
            {data.article_chars.toLocaleString()} characters analyzed
          </p>
        </div>
      )}

      {sourceRating && <SourceRatingCard rating={sourceRating} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <ScoreCard
          label={METRIC_DEFINITIONS.political.title}
          tooltip={METRIC_DEFINITIONS.political.body}
          value={analysis.political.label}
          bar={
            <BipolarBar
              value={analysis.political.score}
              leftLabel="Left"
              rightLabel="Right"
            />
          }
        />
        <ScoreCard
          label={METRIC_DEFINITIONS.emotional.title}
          tooltip={METRIC_DEFINITIONS.emotional.body}
          value={analysis.emotional.label}
          bar={
            <UnipolarBar
              value={analysis.emotional.score}
              gradient="from-amber-400 to-orange-500"
            />
          }
        />
        <ScoreCard
          label={METRIC_DEFINITIONS.factual.title}
          tooltip={METRIC_DEFINITIONS.factual.body}
          value={analysis.factual.label}
          bar={
            <UnipolarBar
              value={analysis.factual.score}
              gradient="from-emerald-400 to-emerald-600"
            />
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Stat
          icon={<Gauge size={14} aria-hidden />}
          label={METRIC_DEFINITIONS.fakeLikelihood.title}
          tooltip={METRIC_DEFINITIONS.fakeLikelihood.body}
          value={`${Math.round(analysis.fake_likelihood * 100)}%`}
          tone={
            analysis.fake_likelihood > 0.66
              ? "bad"
              : analysis.fake_likelihood > 0.33
                ? "warn"
                : "good"
          }
        />
        <Stat
          icon={<Flame size={14} aria-hidden />}
          label={METRIC_DEFINITIONS.sentiment.title}
          tooltip={METRIC_DEFINITIONS.sentiment.body}
          value={analysis.sentiment}
          tone="neutral"
        />
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-1.5">
          Summary
        </h3>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {analysis.summary}
        </p>
      </div>

      {analysis.red_flags.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
            Red flags{" "}
            <span className="text-[11px] normal-case tracking-normal text-zinc-400">
              click any flag to learn more
            </span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {analysis.red_flags.map((flag, i) => (
              <RedFlagChip key={i} flag={flag} />
            ))}
          </div>
        </div>
      )}

      <details className="text-sm group">
        <summary className="cursor-pointer flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium select-none">
          <ShieldCheck size={14} aria-hidden /> AI reasoning
        </summary>
        <p className="mt-2 text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {analysis.reasoning}
        </p>
      </details>
    </section>
  );
}

function ScoreCard({
  label,
  tooltip,
  value,
  bar,
}: {
  label: string;
  tooltip: string;
  value: string;
  bar: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-[11px] uppercase tracking-wider text-zinc-500 flex items-center">
          {label}
          <InfoTooltip title={label} body={tooltip} />
        </div>
        <p className="mt-0.5 text-base font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
          {value}
        </p>
      </div>
      {bar}
    </div>
  );
}

function Stat({
  icon,
  label,
  tooltip,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  value: string;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  const toneClasses = {
    good: "text-emerald-700 dark:text-emerald-300 bg-linear-to-br from-emerald-50 to-emerald-100/60 dark:from-emerald-950/40 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-900",
    warn: "text-amber-700 dark:text-amber-300 bg-linear-to-br from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-amber-900/20 border-amber-200 dark:border-amber-900",
    bad: "text-red-700 dark:text-red-300 bg-linear-to-br from-red-50 to-red-100/60 dark:from-red-950/40 dark:to-red-900/20 border-red-200 dark:border-red-900",
    neutral:
      "text-zinc-700 dark:text-zinc-300 bg-linear-to-br from-zinc-50 to-zinc-100/60 dark:from-zinc-800/40 dark:to-zinc-800/20 border-zinc-200 dark:border-zinc-700",
  }[tone];
  return (
    <div className={`rounded-xl border p-3.5 ${toneClasses}`}>
      <div className="text-[11px] uppercase tracking-wider opacity-80 flex items-center gap-1.5">
        {icon}
        {label}
        <InfoTooltip title={label} body={tooltip} />
      </div>
      <p className="mt-1 text-2xl font-bold capitalize">{value}</p>
    </div>
  );
}
