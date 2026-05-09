import Link from "next/link";
import {
  ArrowRight,
  Compass,
  ShieldCheck,
} from "lucide-react";

const COMING_NEXT = [
  "Article highlights",
  "Compare coverage",
  "Source profile",
  "Saved analyses",
];

export function AboutPanel() {
  return (
    <div className="card" style={{ padding: 22 }}>
      <div
        className="eyebrow"
        style={{ marginBottom: 10 }}
      >
        About this tool
      </div>
      <p
        className="serif"
        style={{
          fontSize: 19,
          lineHeight: 1.35,
          margin: 0,
          color: "var(--ink)",
          fontStyle: "italic",
        }}
      >
        A tool to help you read any article more carefully. Paste a URL or
        text, and see its political bias, tone, how factual it is, and fake
        news risk.
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginTop: 18,
        }}
      >
        <Bullet
          icon={<ShieldCheck size={12} aria-hidden />}
          color="var(--c-bias)"
          label="Validates URLs against private addresses, tries to follow robots.txt"
        />
        <Bullet
          icon={<Compass size={12} aria-hidden />}
          color="var(--c-tone)"
          label="Nothing is saved to disk. We only read the article in memory."
        />
      </div>

      <hr className="rule" style={{ margin: "16px 0" }} />

      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Coming next
      </div>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {COMING_NEXT.map((label) => (
          <Soon key={label} label={label} />
        ))}
      </ul>

      <Link
        href="/learn"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginTop: 16,
          fontSize: 13,
          color: "var(--accent-ink)",
          fontWeight: 500,
        }}
      >
        Read the full guide
        <ArrowRight size={13} aria-hidden />
      </Link>
    </div>
  );
}

function Bullet({
  icon,
  color,
  label,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        fontSize: 13,
        color: "var(--ink-2)",
        lineHeight: 1.4,
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          display: "grid",
          placeItems: "center",
          borderRadius: 4,
          background: "var(--bg-2)",
          color,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ marginTop: 2 }}>{label}</span>
    </div>
  );
}

function Soon({ label }: { label: string }) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        fontSize: 12.5,
        color: "var(--ink-3)",
      }}
    >
      <span>{label}</span>
      <span
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          border: "1px solid var(--rule)",
          padding: "1px 6px",
          borderRadius: 4,
          color: "var(--ink-4)",
        }}
      >
        Soon
      </span>
    </li>
  );
}
