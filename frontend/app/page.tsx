"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  ChevronDown,
  Compass,
  Layers,
  Link as LinkIcon,
  Search,
  ShieldCheck,
  Sparkles,
  Type,
} from "lucide-react";

import { AboutPanel } from "@/app/components/AboutPanel";
import { ArticleBody } from "@/app/components/ArticleBody";
import { BackendStatus } from "@/app/components/BackendStatus";
import { BackendToast } from "@/app/components/BackendToast";
import { BiasSpectrum } from "@/app/components/BiasSpectrum";
import { HeroScores } from "@/app/components/HeroScores";
import { HighlightLegend } from "@/app/components/HighlightLegend";
import { MiniScore } from "@/app/components/MiniScore";
import { ProviderDropdown } from "@/app/components/ProviderDropdown";
import { RedFlagChip } from "@/app/components/RedFlagChip";
import { ResultsSkeleton } from "@/app/components/ResultsSkeleton";
import { SampleCards } from "@/app/components/SampleCards";
import { SectionHeader } from "@/app/components/SectionHeader";
import { SentimentChart } from "@/app/components/SentimentChart";
import { SourceRatingCard } from "@/app/components/SourceRatingCard";
import { Topbar } from "@/app/components/Topbar";
import { WakingModal } from "@/app/components/WakingModal";
import { useBackendStatus } from "@/app/lib/useBackendStatus";
import { lookupSource } from "@/app/lib/sources";
import { SCORE_SCALE_NOTE } from "@/app/lib/glossary";
import type { AnalyzeResponse, SubMetric } from "@/app/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const FALLBACK_MIN_TEXT_CHARS = 200;
const REQUEST_TIMEOUT_MS = 30_000;

// Visually hidden but available to screen readers. Inlined here so we don't
// have to add a global utility class for a couple of form labels.
const SR_ONLY_STYLE: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
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
  const [deep, setDeep] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [minTextChars, setMinTextChars] = useState(FALLBACK_MIN_TEXT_CHARS);
  const abortRef = useRef<AbortController | null>(null);
  // Distinguishes a user-initiated cancel (mode switch, new submit) from a
  // timeout-driven abort. The catch in submit() only surfaces the "timed out"
  // message when this is "timeout"; "user" cancels are silent.
  const cancelReasonRef = useRef<"timeout" | "user" | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/config`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.min_text_chars === "number") {
          setMinTextChars(data.min_text_chars);
        }
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
      });
    return () => controller.abort();
  }, []);

  function clearOutputs() {
    if (abortRef.current) {
      cancelReasonRef.current = "user";
      abortRef.current.abort();
    }
    setResult(null);
    setError(null);
  }

  function switchMode(next: Mode) {
    setMode(next);
    clearOutputs();
  }

  async function submit() {
    if (abortRef.current) {
      cancelReasonRef.current = "user";
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    cancelReasonRef.current = null;
    const timer = setTimeout(() => {
      cancelReasonRef.current = "timeout";
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body =
        mode === "url"
          ? { url: urlValue.trim(), deep }
          : { text: textValue, deep };
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
      // If this submit was superseded by a newer one, drop the result.
      // Without this guard, the old AbortError catch would write into the
      // new submit's state.
      if (abortRef.current !== controller) {
        clearTimeout(timer);
        return;
      }
      if (e instanceof DOMException && e.name === "AbortError") {
        // Only surface the timeout message when the abort came from our timer.
        // User-initiated cancels (mode switch, new submit) should be silent.
        if (cancelReasonRef.current === "timeout") {
          setError("The request took too long. Please try again, or paste the text directly.");
        }
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      clearTimeout(timer);
      if (abortRef.current === controller) {
        cancelReasonRef.current = null;
        setLoading(false);
      }
    }
  }

  const trimmedTextLen = textValue.trim().length;
  const canSubmit =
    !loading &&
    ((mode === "url" && urlValue.trim().length > 0) ||
      (mode === "text" && trimmedTextLen >= minTextChars));

  return (
    <>
      <WakingModal status={backendStatus} />
      <BackendToast key={backendStatus} status={backendStatus} />

      <Topbar active={result ? "report" : "analyze"} hasResult={!!result} />

      <main className="flex-1" style={{ padding: "28px 0 80px" }}>
        <div className="mx-auto" style={{ maxWidth: 1280, padding: "0 28px" }}>
          {/* Page header */}
          <PageHeader status={backendStatus} onRetry={retryBackend} />

          {/* Two-column Analyze layout. Below the lg breakpoint (1024px) the
              two columns collapse to a single stacked column so they don't
              squish to ~200px each on tablets and phones. */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="min-w-0 flex flex-col gap-4">
              <InputCard
                mode={mode}
                switchMode={switchMode}
                urlValue={urlValue}
                setUrlValue={setUrlValue}
                textValue={textValue}
                setTextValue={setTextValue}
                trimmedTextLen={trimmedTextLen}
                minTextChars={minTextChars}
                loading={loading}
                error={error}
                canSubmit={canSubmit}
                deep={deep}
                setDeep={setDeep}
                onSubmit={submit}
                onSample={(ex) => {
                  setMode("text");
                  setTextValue(ex.text);
                  clearOutputs();
                }}
              />
              <PrimerAccordions />
            </div>

            <aside className="min-w-0 flex flex-col gap-4">
              <AboutPanel />
            </aside>
          </div>

          {/* Results below the Analyze grid, full width */}
          <AnimatePresence mode="popLayout" initial={false}>
            {loading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ marginTop: 24 }}
              >
                <ResultsSkeleton />
              </motion.div>
            ) : result ? (
              <motion.div
                key="results"
                id="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                style={{ marginTop: 28, scrollMarginTop: 80 }}
              >
                <Results data={result} />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <p
            className="mono"
            style={{
              textAlign: "center",
              fontSize: 11,
              color: "var(--ink-4)",
              marginTop: 36,
              letterSpacing: ".06em",
            }}
          >
            {SCORE_SCALE_NOTE}
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}

function PageHeader({
  status,
  onRetry,
}: {
  status: ReturnType<typeof useBackendStatus>["status"];
  onRetry: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 24,
        padding: "12px 0 20px",
        borderBottom: "1px solid var(--rule)",
        marginBottom: 28,
        flexWrap: "wrap",
      }}
    >
      <div>
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          <Sparkles
            size={11}
            aria-hidden
            style={{ marginRight: 6, verticalAlign: -2 }}
          />
          AI tool for reading news critically
        </div>
        <h1
          className="serif"
          style={{
            fontSize: "clamp(40px, 6vw, 64px)",
            lineHeight: 1,
            margin: 0,
            fontWeight: 500,
            letterSpacing: "-0.02em",
          }}
        >
          News
          <span
            style={{
              color: "var(--ink-4)",
              fontStyle: "italic",
              margin: "0 .15em",
            }}
          >
            ·
          </span>
          Bias
          <br />
          Analyzer.
        </h1>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          alignItems: "flex-end",
        }}
      >
        <BackendStatus status={status} onRetry={onRetry} />
      </div>
    </div>
  );
}

function InputCard({
  mode,
  switchMode,
  urlValue,
  setUrlValue,
  textValue,
  setTextValue,
  trimmedTextLen,
  minTextChars,
  loading,
  error,
  canSubmit,
  deep,
  setDeep,
  onSubmit,
  onSample,
}: {
  mode: Mode;
  switchMode: (m: Mode) => void;
  urlValue: string;
  setUrlValue: (v: string) => void;
  textValue: string;
  setTextValue: (v: string) => void;
  trimmedTextLen: number;
  minTextChars: number;
  loading: boolean;
  error: string | null;
  canSubmit: boolean;
  deep: boolean;
  setDeep: (v: boolean) => void;
  onSubmit: () => void;
  onSample: (ex: { text: string }) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <section className="card" style={{ padding: 22 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              border: "1px solid var(--rule)",
              borderRadius: 4,
              padding: 3,
              background: "var(--bg-2)",
            }}
          >
            <TabButton active={mode === "url"} onClick={() => switchMode("url")}>
              <LinkIcon size={12} aria-hidden /> URL
            </TabButton>
            <TabButton
              active={mode === "text"}
              onClick={() => switchMode("text")}
            >
              <Type size={12} aria-hidden /> Paste text
            </TabButton>
            <TabButton soon>
              <Search size={12} aria-hidden /> Search
            </TabButton>
          </div>
          <span
            className="mono"
            style={{ fontSize: 11, color: "var(--ink-4)" }}
          >
            Works best with English articles
          </span>
        </div>

        {mode === "url" ? (
          <div className="input-wrap">
            <label htmlFor="article-url-input" style={SR_ONLY_STYLE}>
              Article URL
            </label>
            <LinkIcon size={16} aria-hidden />
            <input
              id="article-url-input"
              type="url"
              className="input"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              placeholder="https://example.com/news/article"
              onKeyDown={(e) => e.key === "Enter" && canSubmit && onSubmit()}
            />
          </div>
        ) : (
          <div>
            <label htmlFor="article-text-input" style={SR_ONLY_STYLE}>
              Article text
            </label>
            <textarea
              id="article-text-input"
              className="textarea"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder={`Paste the article here. At least ${minTextChars} characters.`}
              rows={9}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11.5,
                marginTop: 6,
              }}
            >
              <span style={{ color: "var(--ink-4)" }}>
                At least {minTextChars.toLocaleString()} characters
              </span>
              <span
                className="mono tnum"
                style={{
                  color:
                    trimmedTextLen >= minTextChars
                      ? "var(--c-fact)"
                      : "var(--ink-3)",
                }}
              >
                {trimmedTextLen.toLocaleString()} /{" "}
                {minTextChars.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            marginTop: 14,
            fontSize: 12.5,
            color: "var(--ink-2)",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={deep}
            onChange={(e) => setDeep(e.target.checked)}
            disabled={loading}
            style={{
              marginTop: 3,
              accentColor: "var(--accent)",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          />
          <span>
            <span style={{ fontWeight: 500, color: "var(--ink)" }}>
              Deep analysis
            </span>
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-4)", marginLeft: 6, letterSpacing: ".06em", textTransform: "uppercase" }}>
              slower, marks every flag
            </span>
            <span style={{ display: "block", color: "var(--ink-3)", marginTop: 2 }}>
              Marks loaded words, weak sources, and shaky claims in the article text. Limits the article to about 1,500 words.
            </span>
          </span>
        </label>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="btn btn-primary"
            style={{
              flex: 1,
              justifyContent: "center",
              padding: "12px 18px",
            }}
          >
            {loading ? (
              <>
                <span
                  className="inline-block animate-spin"
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    border: "2px solid rgba(255,255,255,.3)",
                    borderTopColor: "currentColor",
                  }}
                />
                {deep ? "Running deep analysis..." : "Analyzing..."}
              </>
            ) : (
              <>
                <Sparkles size={14} aria-hidden />
                {deep ? "Run deep analysis" : "Analyze article"}
              </>
            )}
          </button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                display: "flex",
                gap: 8,
                marginTop: 12,
                fontSize: 13,
                color: "var(--c-fake)",
              }}
            >
              <AlertCircle
                size={16}
                aria-hidden
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <span>{error}</span>
            </motion.p>
          )}
        </AnimatePresence>

        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 14,
            fontSize: 11.5,
            color: "var(--ink-3)",
            flexWrap: "wrap",
          }}
        >
          <ProviderDropdown />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span className="dot" style={{ background: "var(--c-tone)" }} />
            Takes 5 to 15 seconds
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span className="dot" style={{ background: "var(--c-bias)" }} />
            Nothing is saved. We only read the article in memory.
          </span>
        </div>
      </section>

      <SampleCards onPick={onSample} />
    </div>
  );
}

function PrimerAccordions() {
  return (
    <div className="flex flex-col gap-3">
      <PrimerDetails
        icon={<Compass size={13} aria-hidden />}
        iconBg="var(--c-bias-soft)"
        iconColor="var(--c-bias)"
        title="New here? What do these scores actually mean?"
        kicker="A quick guide in 30 seconds"
        body={
          <>
            Bias is rated on a{" "}
            <span className="mono">−50 to +50</span> scale, where 0 is
            centered. Tone, how factual it is, and fake news risk are scored from{" "}
            <span className="mono">0 to 100</span>. These are not exact facts.
            They are estimates from an AI model. Use them as a starting point,
            not the final answer.
          </>
        }
      />
      <PrimerDetails
        icon={<Layers size={13} aria-hidden />}
        iconBg="var(--c-fact-soft)"
        iconColor="var(--c-fact)"
        title="How this works (and why you should still think for yourself)"
        kicker="Steps · safety · limits"
        body={
          <>
            Your article is read, cleaned up, and sent in one structured
            request to Gemini 2.5 Flash. To reduce prompt-injection risk,
            we wrap the article in special markers that tell the model not
            to trust it, and we cap how long it can be. The model returns
            four scores, smaller sub-scores, a sentiment trail, named people
            and groups, and topics. Sub-scores the model did not return get
            shown as &ldquo;no signal&rdquo; rather than a fake zero.
          </>
        }
      />
    </div>
  );
}

function PrimerDetails({
  icon,
  iconBg,
  iconColor,
  title,
  kicker,
  body,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  kicker: string;
  body: React.ReactNode;
}) {
  return (
    <details className="card" style={{ padding: "14px 18px" }}>
      <summary
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 13,
          fontWeight: 500,
          listStyle: "none",
          color: "var(--ink)",
        }}
      >
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 999,
            background: iconBg,
            color: iconColor,
            display: "grid",
            placeItems: "center",
          }}
        >
          {icon}
        </span>
        <span>{title}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{kicker}</span>
        <ChevronDown size={14} aria-hidden style={{ color: "var(--ink-3)" }} />
      </summary>
      <div
        style={{
          paddingTop: 14,
          color: "var(--ink-2)",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        {body}
      </div>
    </details>
  );
}

function TabButton({
  active,
  soon,
  onClick,
  children,
}: {
  active?: boolean;
  soon?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  if (soon) {
    return (
      <span
        title="Coming soon"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          fontSize: 12.5,
          color: "var(--ink-4)",
          cursor: "not-allowed",
          fontWeight: 500,
        }}
      >
        {children}
        <span
          className="mono"
          style={{
            fontSize: 9,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            border: "1px solid var(--rule)",
            padding: "1px 4px",
            borderRadius: 4,
          }}
        >
          Soon
        </span>
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        border: 0,
        background: active ? "var(--paper)" : "transparent",
        color: active ? "var(--ink)" : "var(--ink-3)",
        padding: "6px 12px",
        fontSize: 12.5,
        borderRadius: 2,
        boxShadow: active ? "var(--shadow-1)" : "none",
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {children}
    </button>
  );
}

function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--rule)",
        padding: "20px 24px",
        color: "var(--ink-3)",
        fontSize: 12,
      }}
    >
      <div
        className="mx-auto"
        style={{
          maxWidth: 1280,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span
            className="mono"
            style={{ fontSize: 11, letterSpacing: ".06em" }}
          >
            PRISM · BIAS
          </span>
          <span>Scores are AI estimates. Always read the article yourself.</span>
          <span
            className="mono"
            style={{ fontSize: 11, color: "var(--ink-4)" }}
          >
            Built to help you read news critically
          </span>
        </div>
        <div
          className="mono"
          style={{
            display: "flex",
            gap: 18,
            flexWrap: "wrap",
            alignItems: "center",
            fontSize: 11,
            letterSpacing: ".06em",
            color: "var(--ink-4)",
            paddingTop: 10,
            borderTop: "1px solid var(--rule-2)",
          }}
        >
          <Link href="/privacy" style={{ color: "var(--ink-3)" }}>
            PRIVACY
          </Link>
          <Link href="/terms" style={{ color: "var(--ink-3)" }}>
            TERMS
          </Link>
          <Link href="/contact" style={{ color: "var(--ink-3)" }}>
            CONTACT
          </Link>
          <span style={{ flex: 1 }} />
          <a
            href="mailto:rhythm@stacksandwich.com"
            style={{ color: "var(--ink-3)" }}
          >
            rhythm@stacksandwich.com
          </a>
        </div>
      </div>
    </footer>
  );
}

function Results({ data }: { data: AnalyzeResponse }) {
  const { analysis } = data;
  const sourceRating = lookupSource(data.source_url);
  return (
    <section className="flex flex-col gap-5">
      {(data.title || data.source_url) && (
        <div style={{ paddingBottom: 4 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            ANALYZED · {data.article_chars.toLocaleString()} CHARACTERS
          </div>
          {data.title && (
            <h2
              className="serif"
              style={{
                fontSize: 32,
                lineHeight: 1.15,
                margin: 0,
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              {data.title}
            </h2>
          )}
          {data.source_url && (
            <a
              href={data.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mono"
              style={{
                fontSize: 12,
                color: "var(--accent-ink)",
                marginTop: 6,
                display: "inline-block",
                wordBreak: "break-all",
              }}
            >
              {data.source_url}
            </a>
          )}
        </div>
      )}

      <p
        className="mono"
        style={{
          margin: 0,
          fontSize: 11,
          color: "var(--ink-4)",
          letterSpacing: ".06em",
        }}
      >
        AI estimates.{" "}
        <Link href="/learn" style={{ color: "var(--ink-3)" }}>
          See the field guide
        </Link>{" "}
        for what each score means.
      </p>

      <HeroScores a={analysis} />

      {analysis.verdict && (
        <div className="card" style={{ padding: "22px 24px" }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Verdict
          </div>
          <div
            className="serif"
            style={{ fontSize: 22, lineHeight: 1.35, fontStyle: "italic" }}
          >
            &ldquo;{analysis.verdict}&rdquo;
          </div>
        </div>
      )}

      {sourceRating && (
        <div>
          <div
            className="eyebrow"
            style={{
              marginBottom: 8,
              fontSize: 10,
              color: "var(--ink-4)",
            }}
          >
            What other rating groups say about this outlet (separate from the AI scores above)
          </div>
          <SourceRatingCard rating={sourceRating} />
        </div>
      )}

      <DeepDive
        eyebrow="01 · Political bias"
        title="Where it sits on the political spectrum"
        kicker="Based on word choice, framing, who is quoted, what gets attention, and the headline."
        sub={analysis.sub_bias}
        color="var(--c-bias)"
        top={
          <div style={{ paddingBottom: 10 }}>
            <BiasSpectrum value={analysis.political.score} />
          </div>
        }
      />

      <DeepDive
        eyebrow="02 · Tone and emotion"
        title="How emotional is the language"
        kicker="Loaded words (which push you to feel a certain way), exaggeration, intensity, and personal framing."
        sub={analysis.sub_tone}
        color="var(--c-tone)"
        top={
          analysis.sentiment_series && analysis.sentiment_series.length > 0 ? (
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                How the mood changes through the article
              </div>
              <SentimentChart series={analysis.sentiment_series} />
              <div
                className="mono"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: "var(--ink-4)",
                  marginTop: 4,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                }}
              >
                <span>Opening</span>
                <span>Middle</span>
                <span>Ending</span>
              </div>
            </div>
          ) : null
        }
      />

      <DeepDive
        eyebrow="03 · Factuality"
        title="How factual it is, and how easy it is to check"
        kicker="Whether it cites sources, uses different sources, gets numbers right, and how many claims it packs in."
        sub={analysis.sub_fact}
        color="var(--c-fact)"
      />

      <DeepDive
        eyebrow="04 · Fake news risk"
        title="Signs that often appear in misleading content"
        kicker="Vague sources, claims with no proof, and whether images and quotes look real."
        sub={analysis.sub_fake}
        color="var(--c-fake)"
      />

      {data.deep && data.article_text && analysis.highlights.length > 0 && (
        <div className="card" style={{ padding: 22 }}>
          <SectionHeader
            eyebrow="05 · Article highlights"
            title="Loaded words, sources, and shaky claims"
            kicker="Hover or tap a highlight to see why it was flagged."
            right={
              <span
                className="mono tnum"
                style={{ fontSize: 11, color: "var(--ink-3)" }}
              >
                {analysis.highlights.length} flagged
              </span>
            }
          />
          <div style={{ marginBottom: 16 }}>
            <HighlightLegend />
          </div>
          <ArticleBody
            text={data.article_text}
            highlights={analysis.highlights}
          />
        </div>
      )}

      {(analysis.topics.length > 0 || analysis.entities.length > 0) && (
        <div className="card" style={{ padding: 22 }}>
          <SectionHeader
            eyebrow="Context"
            title="Topics and people mentioned"
            kicker="What the article is about, and who is named in it."
          />
          {analysis.topics.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                Topics
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {analysis.topics.map((t, i) => (
                  <span key={i} className="chip">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {analysis.entities.length > 0 && (
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                People and groups
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 8,
                }}
              >
                {analysis.entities.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "8px 12px",
                      borderBottom: "1px solid var(--rule)",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "var(--ink)" }}>
                      {e.name}
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: 10.5,
                        color: "var(--ink-4)",
                        letterSpacing: ".06em",
                      }}
                    >
                      {e.type} · {e.mentions}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ padding: 22 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          Summary
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink-2)", margin: 0 }}>
          {analysis.summary}
        </p>
      </div>

      {analysis.red_flags.length > 0 && (
        <div className="card" style={{ padding: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Red flags
            <span
              style={{
                fontSize: 11,
                textTransform: "none",
                letterSpacing: 0,
                color: "var(--ink-4)",
                marginLeft: 8,
              }}
            >
              click any flag to read more
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {analysis.red_flags.map((flag, i) => (
              <RedFlagChip key={i} flag={flag} />
            ))}
          </div>
        </div>
      )}

      <details className="card" style={{ padding: "14px 22px" }}>
        <summary
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 500,
            listStyle: "none",
            color: "var(--ink-2)",
          }}
        >
          <ShieldCheck size={14} aria-hidden /> AI reasoning
        </summary>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--ink-2)",
            marginTop: 10,
          }}
        >
          {analysis.reasoning}
        </p>
      </details>

      <ComingSoon />
    </section>
  );
}

function DeepDive({
  eyebrow,
  title,
  kicker,
  sub,
  color,
  top,
}: {
  eyebrow: string;
  title: string;
  kicker: string;
  sub: SubMetric[] | undefined;
  color: string;
  top?: React.ReactNode;
}) {
  if (!sub || sub.length === 0) {
    return null;
  }
  return (
    <div className="card" style={{ padding: 22 }}>
      <SectionHeader eyebrow={eyebrow} title={title} kicker={kicker} />
      {top && <div style={{ marginBottom: 18 }}>{top}</div>}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 18,
        }}
      >
        {sub.map((m, i) => (
          <MiniScore
            key={i}
            label={m.key}
            value={m.value}
            note={m.note}
            color={color}
          />
        ))}
      </div>
    </div>
  );
}

function ComingSoon() {
  return (
    <details className="card" style={{ padding: "14px 22px" }}>
      <summary
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 13,
          fontWeight: 500,
          listStyle: "none",
          color: "var(--ink-2)",
        }}
      >
        <Compass size={14} aria-hidden style={{ color: "var(--ink-3)" }} />
        <span className="eyebrow" style={{ margin: 0 }}>
          Coming next
        </span>
        <span style={{ flex: 1 }} />
        <ChevronDown size={14} aria-hidden style={{ color: "var(--ink-3)" }} />
      </summary>
      <p
        style={{
          marginTop: 12,
          marginBottom: 0,
          fontSize: 13.5,
          lineHeight: 1.6,
          color: "var(--ink-3)",
        }}
      >
        Coming next: article highlights, coverage compare, source profile,
        saved analyses, fact checks, search.
      </p>
    </details>
  );
}
