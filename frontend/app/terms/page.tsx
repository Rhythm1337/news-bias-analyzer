import type { Metadata } from "next";
import Link from "next/link";
import { Scale } from "lucide-react";

import { Topbar } from "@/app/components/Topbar";

export const metadata: Metadata = {
  title: "Terms · Prism",
  description:
    "Simple rules for using Prism, an experimental student project for analyzing news bias.",
};

export default function TermsPage() {
  return (
    <>
      <Topbar active="learn" />

      <main className="flex-1" style={{ padding: "32px 0 80px" }}>
        <div className="mx-auto" style={{ maxWidth: 760, padding: "0 24px" }}>
          <PageHeader />

          <Section title="No warranty">
            <p>
              This is an experimental student project. We give it to you
              &ldquo;as is&rdquo; with no promises. Scores come from an AI
              and can be wrong. Do not use these scores to make legal,
              financial, journalistic, or other professional decisions.
            </p>
          </Section>

          <Section title="Acceptable use">
            <p>Don&apos;t use the service to:</p>
            <ul
              style={{
                margin: "10px 0 0 0",
                paddingLeft: 22,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <li>share content you don&apos;t own the rights to;</li>
              <li>
                share private personal info about other people;
              </li>
              <li>
                try to get past our rate limits (how many requests per
                minute we allow);
              </li>
              <li>
                try to trick or attack the AI model with harmful prompts.
              </li>
            </ul>
            <p style={{ marginTop: 12 }}>
              We may block you if you send too many automated requests.
            </p>
          </Section>

          <Section title="Article fetching">
            <p>
              When you give us a URL, we get publicly visible web pages.
              Our server sends a clear User-Agent so sites can see who we
              are. We follow robots.txt rules when a site has one. If a
              site blocks us, please copy the article text and paste it
              here instead.
            </p>
          </Section>

          <Section title="Intellectual property">
            <p>
              We do not republish or store article text. The scores and
              summary come from an AI and are only for your own use. Any
              text you paste still belongs to you or to the original
              publisher.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              We may update these terms later. If you keep using the
              service after we change them, that means you accept the new
              terms.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Have questions? Email{" "}
              <a
                className="mono"
                href="mailto:rhythm@stacksandwich.com"
                style={{ color: "var(--accent-ink)" }}
              >
                rhythm@stacksandwich.com
              </a>
              .
            </p>
            <p style={{ marginTop: 16, color: "var(--ink-3)", fontSize: 14 }}>
              We will date this when we make a substantive change.
            </p>
          </Section>
        </div>
      </main>

      <Footer />
    </>
  );
}

function PageHeader() {
  return (
    <header
      style={{
        paddingBottom: 24,
        borderBottom: "1px solid var(--rule)",
        marginBottom: 32,
      }}
    >
      <div className="eyebrow" style={{ marginBottom: 12 }}>
        <Scale
          size={11}
          aria-hidden
          style={{ marginRight: 6, verticalAlign: -2 }}
        />
        Legal · terms
      </div>
      <h1
        className="serif"
        style={{
          fontSize: "clamp(36px, 5vw, 56px)",
          lineHeight: 1.05,
          margin: 0,
          fontWeight: 500,
          letterSpacing: "-0.02em",
        }}
      >
        Terms of Use.
      </h1>
      <p
        style={{
          marginTop: 14,
          fontSize: 16,
          lineHeight: 1.6,
          color: "var(--ink-2)",
          maxWidth: 620,
        }}
      >
        Simple rules for using this experimental student project.
      </p>
    </header>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 32 }}>
      <h2
        className="serif"
        style={{
          fontSize: 28,
          margin: 0,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          color: "var(--ink)",
          lineHeight: 1.2,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          marginTop: 12,
          fontSize: 15.5,
          lineHeight: 1.7,
          color: "var(--ink-2)",
        }}
      >
        {children}
      </div>
    </section>
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
          <span>Scores are AI estimates. Always read the source.</span>
          <span
            className="mono"
            style={{ fontSize: 11, color: "var(--ink-4)" }}
          >
            Built for media literacy
          </span>
        </div>
        <div
          className="mono"
          style={{
            display: "flex",
            gap: 18,
            flexWrap: "wrap",
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
