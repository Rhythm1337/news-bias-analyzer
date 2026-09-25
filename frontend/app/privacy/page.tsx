import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { Topbar } from "@/app/components/Topbar";

export const metadata: Metadata = {
  title: "Privacy · Prism",
  description:
    "How Prism handles the content you send. We do not save articles, URLs, or analysis results.",
};

export default function PrivacyPage() {
  return (
    <>
      <Topbar active="learn" />

      <main className="flex-1" style={{ padding: "32px 0 80px" }}>
        <div className="mx-auto" style={{ maxWidth: 760, padding: "0 24px" }}>
          <PageHeader />

          <Section title="Introduction">
            <p>
              This is a student project that helps people learn about media
              bias. We do not save articles, URLs, or anything you send us.
            </p>
          </Section>

          <Section title="What we process">
            <p>
              When you give us a URL, our server gets the page, pulls out the
              article text, and sends that text to Google&apos;s Gemini API.
              When you paste text directly, we send it as is. The API reads
              the text and gives back scores.
            </p>
          </Section>

          <Section title="What we store">
            <p>
              Nothing. Articles and results stay in memory only while we
              handle your request. They are deleted as soon as we send the
              response. We do not use analytics, tracking pixels, or cookies
              to track you.
            </p>
          </Section>

          <Section title="Logs">
            <p>
              Our backend keeps short-term logs that may include the URL you
              sent and a key based on your IP address. We use this key only
              to count requests for rate limiting (how many requests per
              minute we allow). We do not sell, share, or use logs for ads.
            </p>
          </Section>

          <Section title="Third parties">
            <p>
              We send your article text to Google&apos;s Gemini API to
              analyze it. Please read Google&apos;s privacy policy to see
              how they handle this text. On the free tier, Google may use
              your text to improve their AI models. Do not paste anything
              private or sensitive.
            </p>
          </Section>

          <Section title="Your rights">
            <p>
              We do not save your data, so there is nothing for us to show,
              export, or delete. If you do not want your content analyzed,
              just do not send it.
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
        <ShieldCheck
          size={11}
          aria-hidden
          style={{ marginRight: 6, verticalAlign: -2 }}
        />
        Legal · privacy
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
        Privacy Policy.
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
        How this project handles the content you send us. In short: we do
        not save it.
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
