"use client";

import Link from "next/link";
import { Compass } from "lucide-react";

import { ThemeToggle } from "./ThemeToggle";

type NavKey = "analyze" | "report" | "learn";

type NavItem = { k: NavKey; label: string; href?: string; soon?: boolean };

export function Topbar({
  active,
  hasResult = false,
}: {
  active: NavKey;
  hasResult?: boolean;
}) {
  // Report only appears once a result exists. Future nav items
  // (Search, Compare, History, Dashboard) are listed in the
  // results page's Roadmap section, not here.
  const NAV: NavItem[] = [
    { k: "analyze", label: "Analyze", href: "/" },
    ...(hasResult ? [{ k: "report" as NavKey, label: "Report", href: "/#results" }] : []),
    { k: "learn", label: "Learn", href: "/learn" },
  ];
  return (
    <header className="topbar">
      <div
        className="mx-auto flex items-center gap-4"
        style={{ maxWidth: 1280, padding: "12px 24px" }}
      >
        <Link
          href="/"
          className="serif"
          style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 22 }}
        >
          <span
            className="mono"
            style={{
              width: 28,
              height: 28,
              display: "grid",
              placeItems: "center",
              border: "1px solid var(--ink)",
              background: "var(--paper)",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 4,
            }}
          >
            P
          </span>
          <span>
            Prism<span style={{ color: "var(--ink-3)" }}> · bias</span>
          </span>
        </Link>

        <nav
          className="hidden md:flex"
          aria-label="Primary"
          style={{ gap: 2, alignItems: "center" }}
        >
          {NAV.map((item) => {
            const isActive = item.k === active;
            const baseStyle: React.CSSProperties = {
              padding: "6px 10px",
              fontSize: 13,
              borderRadius: 6,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            };
            return (
              <Link
                key={item.k}
                href={item.href ?? "/"}
                style={{
                  ...baseStyle,
                  background: isActive ? "var(--ink)" : "transparent",
                  color: isActive ? "var(--bg)" : "var(--ink-2)",
                }}
              >
                {item.k === "learn" && <Compass size={12} aria-hidden />}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />

        <ThemeToggle />
      </div>
    </header>
  );
}
