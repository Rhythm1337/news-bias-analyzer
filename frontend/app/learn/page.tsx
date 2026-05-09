"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Eye,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { TechniqueAccordion } from "@/app/components/TechniqueAccordion";
import { Topbar } from "@/app/components/Topbar";

export default function LearnPage() {
  return (
    <>
      <Topbar active="learn" />

      <main className="flex-1" style={{ padding: "32px 0 80px" }}>
        <div className="mx-auto" style={{ maxWidth: 880, padding: "0 24px" }}>
          <Hero />
          <div style={{ marginTop: 36 }}>
            <ThreeLayers />
          </div>
          <div style={{ marginTop: 36 }}>
            <TopTechniques />
          </div>
          <div style={{ marginTop: 36 }}>
            <Checklist />
          </div>
          <div style={{ marginTop: 36 }}>
            <Resources />
          </div>
          <p
            className="mono"
            style={{
              marginTop: 40,
              paddingTop: 20,
              borderTop: "1px solid var(--rule)",
              textAlign: "center",
              fontSize: 11,
              color: "var(--ink-4)",
              letterSpacing: ".06em",
            }}
          >
            Learning content for a school project. Not linked to the
            organizations listed above.
          </p>
        </div>
      </main>

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
            maxWidth: 1080,
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
            <span>A simple guide. Read many sources, share with care.</span>
            <span
              className="mono"
              style={{ fontSize: 11, color: "var(--ink-4)" }}
            >
              Made to help you read the news
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
    </>
  );
}

function Hero() {
  return (
    <header>
      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "var(--ink-3)",
          fontFamily: "var(--mono)",
          letterSpacing: ".06em",
          textTransform: "uppercase",
          marginBottom: 18,
        }}
      >
        <ArrowLeft size={12} aria-hidden /> Back to the analyzer
      </Link>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          <Sparkles
            size={11}
            aria-hidden
            style={{ marginRight: 6, verticalAlign: -2 }}
          />
          Simple guide · reading the news
        </div>
        <h1
          className="serif"
          style={{
            fontSize: "clamp(34px, 5vw, 52px)",
            lineHeight: 1.05,
            margin: 0,
            fontWeight: 500,
            letterSpacing: "-0.02em",
          }}
        >
          How false news{" "}
          <span style={{ fontStyle: "italic", color: "var(--accent-ink)" }}>
            really
          </span>{" "}
          works.
        </h1>
        <p
          style={{
            marginTop: 14,
            fontSize: 16,
            lineHeight: 1.6,
            color: "var(--ink-2)",
            maxWidth: 640,
          }}
        >
          A short guide to the tricks used to fool readers, and how to spot
          them. False news is a way to trick many people at once.
        </p>
      </motion.div>
      <hr
        style={{
          marginTop: 24,
          height: 1,
          background: "var(--rule)",
          border: 0,
        }}
      />
    </header>
  );
}

function ThreeLayers() {
  const items = [
    {
      icon: <Eye size={16} aria-hidden />,
      title: "Bias",
      body: "A point of view in how a story is told. Real, and hard to avoid. Bias is not the same as being wrong.",
      color: "var(--c-bias)",
    },
    {
      icon: <AlertTriangle size={16} aria-hidden />,
      title: "Misinformation",
      body: "False content shared by accident. Mistakes, old news, and rumors that people believe and pass on.",
      color: "var(--c-tone)",
    },
    {
      icon: <ShieldAlert size={16} aria-hidden />,
      title: "Disinformation",
      body: "False content spread on purpose. Foreign influence work, paid PR, and planned campaigns.",
      color: "var(--c-fake)",
    },
  ];
  return (
    <Section
      eyebrow="01 · Words to know"
      title="Three types"
      subtitle="They sound the same. They are not."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {items.map((it, i) => (
          <motion.div
            key={it.title}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.25, delay: i * 0.06 }}
            className="card"
            style={{ padding: 18 }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                border: `1px solid ${it.color}`,
                color: it.color,
                background: "var(--bg-2)",
                borderRadius: 2,
                marginBottom: 12,
              }}
            >
              {it.icon}
            </div>
            <p
              className="serif"
              style={{
                fontSize: 20,
                margin: 0,
                color: "var(--ink)",
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              {it.title}
            </p>
            <p
              style={{
                marginTop: 6,
                fontSize: 14,
                lineHeight: 1.55,
                color: "var(--ink-3)",
              }}
            >
              {it.body}
            </p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

const TECHNIQUES = [
  {
    name: "Loaded language",
    summary: "Strong, emotional words instead of plain words.",
    example: "“Lawmakers attacked the awful bill that hurt working families.”",
    counter: "Compare with: ‘Lawmakers passed the bill 51 to 49. Some said it would raise costs.’ Same event, calmer words.",
  },
  {
    name: "Anonymous sources",
    summary: "‘Sources say’ or ‘experts confirm’, but no names are given.",
    example: "“According to a person who knows about the matter…”",
    counter: "Sometimes this is fair. Often it is used to share claims you cannot check. If a whole article uses no names, ask why.",
  },
  {
    name: "Headline mismatch",
    summary: "The article body says less than the headline promises.",
    example: "“Scientist Admits Vaccines Cause Harm!” leads to text about small, well-known side effects.",
    counter: "Many readers share only by reading the headline. Read the full article before you decide.",
  },
  {
    name: "False balance",
    summary: "Two sides are shown as equal when the evidence is not.",
    example: "“Some scientists say climate is changing. Others disagree.”",
    counter: "It sounds fair, but it can mislead. Good reporting weighs claims by evidence, not by how many people say them.",
  },
  {
    name: "Cherry-picking",
    summary: "Only the facts that fit one view are shown. Other facts are hidden.",
    example: "Quoting one part of a study and ignoring the part that says the opposite.",
    counter: "If a number looks too perfect, check the original source.",
  },
  {
    name: "Emotional appeals",
    summary: "Tries to make you feel fear or anger instead of giving evidence.",
    example: "“If you don’t act now, everything you love will be destroyed.”",
    counter: "If something makes you very angry very fast, that may be the goal, not the truth.",
  },
];

function TopTechniques() {
  return (
    <Section
      eyebrow="02 · Patterns"
      title="Common tricks"
      subtitle="If you see two or three of these in one article, stop and check."
    >
      <TechniqueAccordion items={TECHNIQUES} />
    </Section>
  );
}

function Checklist() {
  const items = [
    "Read more than the headline.",
    "Check the source. Is the URL real, or a fake one (cnnnews.co vs cnn.com)?",
    "Find the original source: the study, the speech, or the document.",
    "Check the date. Old stories shared as new can mislead you.",
    "If only one site reports a big claim, that is a warning sign.",
    "Notice your feelings. If you feel very angry in 30 seconds, that is a signal.",
  ];
  return (
    <Section
      eyebrow="03 · Practice"
      title="Before you share"
      subtitle="Six checks. Less than one minute."
    >
      <div
        className="card"
        style={{
          padding: 22,
          borderLeft: "3px solid var(--c-fact)",
        }}
      >
        <ol
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {items.map((item, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.22, delay: i * 0.04 }}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <span
                className="mono tnum"
                style={{
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 24,
                  height: 24,
                  border: "1px solid var(--rule-2)",
                  background: "var(--bg-2)",
                  color: "var(--ink-2)",
                  fontSize: 11,
                  fontWeight: 500,
                  borderRadius: 2,
                  marginTop: 1,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                style={{
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: "var(--ink-2)",
                }}
              >
                {item}
              </span>
            </motion.li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

const RESOURCES = [
  {
    name: "AllSides Media Bias Chart",
    url: "https://www.allsides.com/media-bias/media-bias-chart",
    description: "A chart that shows where US news sites sit from left to right.",
  },
  {
    name: "Media Bias / Fact Check",
    url: "https://mediabiasfactcheck.com/",
    description: "Bias and fact ratings for news sites, one site at a time.",
  },
  {
    name: "EUvsDisinfo",
    url: "https://euvsdisinfo.eu/",
    description: "A list of foreign influence campaigns.",
  },
  {
    name: "Stanford Internet Observatory",
    url: "https://cyber.fsi.stanford.edu/io",
    description: "University research on disinformation campaigns.",
  },
];

function Resources() {
  return (
    <Section
      eyebrow="04 · Read more"
      title="Learn more"
      subtitle="If you want to read more about this."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {RESOURCES.map((r) => (
          <a
            key={r.name}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="card"
            style={{
              padding: 16,
              transition: "border-color 0.15s, background 0.15s",
              display: "block",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <p
                className="serif"
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 500,
                  color: "var(--ink)",
                  letterSpacing: "-0.005em",
                }}
              >
                {r.name}
              </p>
              <ExternalLink
                size={13}
                aria-hidden
                style={{
                  marginTop: 4,
                  flexShrink: 0,
                  color: "var(--ink-4)",
                }}
              />
            </div>
            <p
              style={{
                marginTop: 6,
                marginBottom: 0,
                fontSize: 13,
                lineHeight: 1.5,
                color: "var(--ink-3)",
              }}
            >
              {r.description}
            </p>
          </a>
        ))}
      </div>
    </Section>
  );
}

function Section({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div style={{ marginBottom: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          {eyebrow}
        </div>
        <h2
          className="serif"
          style={{
            margin: 0,
            fontSize: "clamp(24px, 3vw, 32px)",
            fontWeight: 500,
            letterSpacing: "-0.015em",
            color: "var(--ink)",
            lineHeight: 1.15,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            marginTop: 4,
            marginBottom: 0,
            fontSize: 14,
            color: "var(--ink-3)",
          }}
        >
          {subtitle}
        </p>
      </div>
      <div>{children}</div>
    </section>
  );
}
