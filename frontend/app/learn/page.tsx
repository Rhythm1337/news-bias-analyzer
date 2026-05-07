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

export default function LearnPage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl space-y-10">
        <Hero />
        <ThreeLayers />
        <TopTechniques />
        <Checklist />
        <Resources />
        <p className="pt-6 text-xs text-center text-zinc-500 border-t border-zinc-200 dark:border-zinc-800">
          Educational content for a course project. Not affiliated with the
          linked organizations.
        </p>
      </div>
    </main>
  );
}

function Hero() {
  return (
    <header className="space-y-4 pt-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
      >
        <ArrowLeft size={14} aria-hidden /> Back to analyzer
      </Link>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 px-2.5 py-1 text-[11px] uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          <Sparkles size={12} aria-hidden className="text-blue-500" />
          Field guide
        </span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          How misinformation{" "}
          <span className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            actually
          </span>{" "}
          works
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400 leading-relaxed">
          A short guide to the techniques used to mislead readers, and how to
          spot them. Misinformation is social engineering at scale.
        </p>
      </motion.div>
    </header>
  );
}

function ThreeLayers() {
  const items = [
    {
      icon: <Eye size={18} />,
      title: "Bias",
      body: "A point of view in how a story is told. Real, often unavoidable. Bias is not the same as wrong.",
      accent: "from-blue-500 to-indigo-500",
    },
    {
      icon: <AlertTriangle size={18} />,
      title: "Misinformation",
      body: "False content shared without intent to deceive. Mistakes, outdated info, rumors people believe.",
      accent: "from-amber-500 to-orange-500",
    },
    {
      icon: <ShieldAlert size={18} />,
      title: "Disinformation",
      body: "False content spread on purpose. Foreign-influence ops, paid PR, coordinated campaigns.",
      accent: "from-red-500 to-rose-600",
    },
  ];
  return (
    <Section title="Three layers" subtitle="They sound similar. They aren't.">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((it, i) => (
          <motion.div
            key={it.title}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.25, delay: i * 0.06 }}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 card-glass p-4"
          >
            <div
              className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br ${it.accent} text-white shadow-md mb-3`}
            >
              {it.icon}
            </div>
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">
              {it.title}
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
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
    summary: "Emotionally charged words instead of plain ones.",
    example: "“Lawmakers slammed the disastrous bill that crushed working families.”",
    counter: "Compare with: ‘Lawmakers passed the bill 51 to 49; critics argued it would raise costs.’ Same event, different temperature.",
  },
  {
    name: "Anonymous sources",
    summary: "‘Sources say’, ‘experts confirm’, no names.",
    example: "“According to a person familiar with the matter…”",
    counter: "Sometimes legitimate. Often a way to launder unverifiable claims. If everything in a piece is anonymous, ask why.",
  },
  {
    name: "Headline mismatch",
    summary: "The body of the article says less than the headline.",
    example: "“Scientist Admits Vaccines Cause Harm!” leads to text about well-known mild side effects.",
    counter: "Most readers share based on the headline alone. Read the body before forming an opinion.",
  },
  {
    name: "False balance",
    summary: "Treats two sides as equal when the evidence isn’t.",
    example: "“Some scientists say climate is changing; others disagree.”",
    counter: "Sounds neutral, misleads anyway. Real reporting weighs claims by evidence, not by how many people make them.",
  },
  {
    name: "Cherry-picking",
    summary: "Only quotes the parts that support the framing.",
    example: "Citing one paragraph of a study while ignoring the conclusion that contradicts it.",
    counter: "If a statistic feels too tidy, trace it back to the original source.",
  },
  {
    name: "Emotional appeals",
    summary: "Triggers fear or outrage instead of presenting evidence.",
    example: "“If you don’t act now, everything you love will be destroyed.”",
    counter: "If something makes you very angry very fast, that may be the design, not the truth.",
  },
];

function TopTechniques() {
  return (
    <Section
      title="Common techniques"
      subtitle="If you see two or three of these in one article, slow down."
    >
      <TechniqueAccordion items={TECHNIQUES} />
    </Section>
  );
}

function Checklist() {
  const items = [
    "Read past the headline.",
    "Check the source. Is the URL real, or a typo (cnnnews.co vs cnn.com)?",
    "Find the primary source: the study, the speech, the document.",
    "Check the date. Old stories re-shared as new are misleading.",
    "If only one outlet reports a major claim, that’s a flag.",
    "Notice your emotions. If you’re furious in 30 seconds, that’s a signal.",
  ];
  return (
    <Section
      title="Before you share"
      subtitle="Six questions, less than a minute."
    >
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-linear-to-br from-emerald-50 to-emerald-100/40 dark:from-emerald-950/30 dark:to-emerald-900/10 p-5">
        <ol className="space-y-2.5">
          {items.map((item, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.22, delay: i * 0.04 }}
              className="flex items-start gap-3"
            >
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                {i + 1}
              </span>
              <span className="text-sm text-zinc-800 dark:text-zinc-200">
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
    description: "Visual chart of US news outlets along the bias spectrum.",
  },
  {
    name: "Media Bias / Fact Check",
    url: "https://mediabiasfactcheck.com/",
    description: "Outlet-by-outlet bias and factual-reporting ratings.",
  },
  {
    name: "EUvsDisinfo",
    url: "https://euvsdisinfo.eu/",
    description: "Catalog of foreign-influence campaigns.",
  },
  {
    name: "Stanford Internet Observatory",
    url: "https://cyber.fsi.stanford.edu/io",
    description: "Academic research on disinformation campaigns.",
  },
];

function Resources() {
  return (
    <Section title="Go deeper" subtitle="If you want to read more.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {RESOURCES.map((r) => (
          <a
            key={r.name}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 p-4 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-zinc-900 transition"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                {r.name}
              </p>
              <ExternalLink
                size={14}
                aria-hidden
                className="mt-1 shrink-0 text-zinc-400 group-hover:text-blue-500 transition"
              />
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {r.description}
            </p>
          </a>
        ))}
      </div>
    </Section>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
