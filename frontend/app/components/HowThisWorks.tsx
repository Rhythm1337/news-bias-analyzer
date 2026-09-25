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
    <div className="card" style={{ overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: 18,
          textAlign: "left",
          background: "transparent",
          border: 0,
          color: "var(--ink)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              display: "inline-flex",
              height: 32,
              width: 32,
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--rule)",
              background: "var(--c-fact-soft)",
              color: "var(--c-fact)",
              borderRadius: "var(--radius)",
            }}
          >
            <Cpu size={16} aria-hidden />
          </span>
          <span>
            <span
              className="serif"
              style={{
                display: "block",
                fontSize: 17,
                fontWeight: 500,
                color: "var(--ink)",
                letterSpacing: "-0.01em",
              }}
            >
              How this works (and why you should still think for yourself)
            </span>
            <span
              style={{
                display: "block",
                fontSize: 12.5,
                color: "var(--ink-3)",
                marginTop: 2,
              }}
            >
              The steps, the safety checks, and the limits
            </span>
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: "var(--ink-4)", display: "inline-flex" }}
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
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                padding: "4px 22px 22px",
                borderTop: "1px solid var(--rule)",
                fontSize: 14,
                color: "var(--ink-2)",
                lineHeight: 1.6,
                display: "flex",
                flexDirection: "column",
                gap: 18,
                marginTop: 4,
              }}
            >
              <Block
                icon={<Wrench size={16} />}
                tone="ink"
                title="The steps"
                body={
                  <ol style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                    <li>
                      You paste a URL or text. The server fetches the URL and
                      pulls out the article body with{" "}
                      <code
                        className="mono"
                        style={{
                          fontSize: 12,
                          background: "var(--bg-2)",
                          border: "1px solid var(--rule)",
                          padding: "0 4px",
                          borderRadius: 2,
                        }}
                      >
                        trafilatura
                      </code>
                      .
                    </li>
                    <li>
                      The article text is wrapped in safety markers and sent
                      to{" "}
                      <code
                        className="mono"
                        style={{
                          fontSize: 12,
                          background: "var(--bg-2)",
                          border: "1px solid var(--rule)",
                          padding: "0 4px",
                          borderRadius: 2,
                        }}
                      >
                        gemini-2.5-flash
                      </code>{" "}
                      with a strict JSON format.
                    </li>
                    <li>The model&rsquo;s reply is checked, then shown to you.</li>
                  </ol>
                }
              />

              <Block
                icon={<Lock size={16} />}
                tone="fact"
                title="Safety checks"
                body={
                  <ul style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                    <li>
                      <strong>Prompt-injection defense.</strong> The article is
                      wrapped in safety markers. Special tokens are removed.
                      Length is capped. The system prompt tells the model to
                      treat the article as data, not as instructions.
                    </li>
                    <li>
                      <strong>SSRF protection.</strong> Only http(s) URLs are
                      allowed. Private, loopback, link-local, and
                      cloud-metadata IPs are blocked. Each redirect is checked
                      again.
                    </li>
                    <li>
                      <strong>Rate limit.</strong> 20 requests per minute per
                      IP. This keeps the site up and saves AI quota.
                    </li>
                    <li>
                      <strong>Swappable AI.</strong> Gemini is used now. The
                      code is built so any provider can be plugged in later.
                    </li>
                  </ul>
                }
              />

              <Block
                icon={<ShieldAlert size={16} />}
                tone="tone"
                title="Limits (please read)"
                body={
                  <ul style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                    <li>The AI is not perfect. It will sometimes get things wrong.</li>
                    <li>
                      Scores are <em>guesses</em>, not exact numbers. 0.42 and
                      0.45 mean about the same thing.
                    </li>
                    <li>
                      The model has its own biases too. Trusting it
                      blindly is the same lazy reading habit this tool is
                      meant to fight.
                    </li>
                    <li>
                      Paywalled articles, or articles built with JavaScript,
                      may not load. Paste the text instead.
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
  tone: "ink" | "fact" | "tone";
  title: string;
  body: React.ReactNode;
}) {
  const toneStyle: React.CSSProperties = {
    ink: {
      background: "var(--bg-2)",
      color: "var(--ink-2)",
    },
    fact: {
      background: "var(--c-fact-soft)",
      color: "var(--c-fact)",
    },
    tone: {
      background: "var(--c-tone-soft)",
      color: "var(--c-tone)",
    },
  }[tone];
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <span
        style={{
          marginTop: 2,
          display: "inline-flex",
          height: 28,
          width: 28,
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid var(--rule)",
          borderRadius: "var(--radius)",
          ...toneStyle,
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ color: "var(--ink-2)" }}>{body}</div>
      </div>
    </div>
  );
}
