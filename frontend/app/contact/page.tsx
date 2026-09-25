"use client";

import Link from "next/link";
import { ExternalLink, Mail } from "lucide-react";

import { Topbar } from "@/app/components/Topbar";

const EMAIL = "rhythm@stacksandwich.com";
const REPO_URL = "https://github.com/Rhythm1337/news-bias-analyzer";

export default function ContactPage() {
  return (
    <>
      <Topbar active="learn" />

      <main className="flex-1" style={{ padding: "32px 0 80px" }}>
        <div className="mx-auto" style={{ maxWidth: 760, padding: "0 24px" }}>
          <PageHeader />

          <Section title="Get in touch">
            <p>
              Two college students build and maintain this project. Send an
              email for questions, takedown requests (asking us to remove
              your content), or any feedback.
            </p>
            <div
              className="card"
              style={{
                marginTop: 22,
                padding: "26px 28px",
                borderLeft: "3px solid var(--c-fact)",
              }}
            >
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                <Mail
                  size={11}
                  aria-hidden
                  style={{ marginRight: 6, verticalAlign: -2 }}
                />
                Email
              </div>
              <a
                href={`mailto:${EMAIL}`}
                className="serif"
                style={{
                  display: "inline-block",
                  fontSize: "clamp(22px, 3vw, 32px)",
                  lineHeight: 1.2,
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  color: "var(--accent-ink)",
                  wordBreak: "break-all",
                }}
              >
                {EMAIL}
              </a>
              <p
                style={{
                  marginTop: 12,
                  marginBottom: 0,
                  fontSize: 13.5,
                  color: "var(--ink-3)",
                  lineHeight: 1.6,
                }}
              >
                We usually reply within a few days.
              </p>
            </div>
          </Section>

          <Section title="Publishers and takedowns">
            <p>
              If you run a website and you don&apos;t want our service to
              fetch your pages, email us your domain. We will block it on
              our server.
            </p>
          </Section>

          <Section title="Source code">
            <p>
              You can see the full source code for this project on GitHub.
            </p>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="card"
              style={{
                marginTop: 14,
                padding: "14px 18px",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13.5,
                color: "var(--ink)",
                textDecoration: "none",
              }}
            >
              <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
                github.com/Rhythm1337/news-bias-analyzer
              </span>
              <ExternalLink
                size={13}
                aria-hidden
                style={{ color: "var(--ink-4)" }}
              />
            </a>
          </Section>

          <Section title="A few honest notes">
            <ul
              style={{
                margin: 0,
                paddingLeft: 22,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <li>This is a student project. It is not a paid product.</li>
              <li>
                There is no team and no promise that the site will always
                be online. The backend goes to sleep when nobody uses it.
              </li>
              <li>
                Scores come from an AI. Use them as a starting point to
                think about the article, not as the final answer.
              </li>
              <li>
                If something looks broken or wrong, please send us an
                email. It really helps.
              </li>
            </ul>
          </Section>

          <p
            style={{
              marginTop: 48,
              paddingTop: 20,
              borderTop: "1px solid var(--rule)",
              fontSize: 14,
              color: "var(--ink-3)",
              lineHeight: 1.6,
            }}
          >
            We will date this when we make a substantive change.
          </p>
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
        <Mail
          size={11}
          aria-hidden
          style={{ marginRight: 6, verticalAlign: -2 }}
        />
        Say hello
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
        Contact.
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
        One inbox, two college students. Send an email about anything to
        do with this project.
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
    <section style={{ marginTop: 36 }}>
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
            href={`mailto:${EMAIL}`}
            style={{ color: "var(--ink-3)" }}
          >
            {EMAIL}
          </a>
        </div>
      </div>
    </footer>
  );
}
