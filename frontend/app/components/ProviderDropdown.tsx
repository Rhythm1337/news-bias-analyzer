"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Sparkles } from "lucide-react";

type Provider = {
  id: "gemini" | "openai" | "claude";
  label: string;
  sub: string;
  available: boolean;
};

const PROVIDERS: Provider[] = [
  { id: "gemini", label: "Gemini 2.5 Flash", sub: "Google", available: true },
  // Vendor-only labels for the disabled rows so we don't have to update
  // them every time the upstream model name changes. The active row keeps
  // the specific model so users can see exactly what is running.
  { id: "openai", label: "OpenAI", sub: "OpenAI", available: false },
  { id: "claude", label: "Claude / Anthropic", sub: "Anthropic", available: false },
];

/**
 * Small inline dropdown showing the current AI provider with a list of
 * future options gated as "Coming soon". Read-only for now: the backend
 * is single-provider and the click handlers on disabled rows do nothing.
 */
export function ProviderDropdown() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  // Tracks whether the most recent close was triggered by Escape. We only
  // want to refocus the trigger in that case (and on click-of-trigger-while-
  // open). Outside-click closes should not steal focus from wherever the
  // user clicked.
  const restoreFocusRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        restoreFocusRef.current = true;
        setOpen(false);
      }
    }
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (wrapRef.current && wrapRef.current.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      // Only restore focus to the trigger on Escape or trigger-toggle close,
      // never on outside-click. Otherwise the focus would jump back to the
      // dropdown when the user just wanted to interact elsewhere. The lint
      // rule about ref values changing during cleanup does not apply: we
      // explicitly want to focus the live current trigger element, which is
      // mounted persistently on this component.
      if (restoreFocusRef.current) {
        restoreFocusRef.current = false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
        triggerRef.current?.focus();
      }
    };
  }, [open]);

  const active = PROVIDERS.find((p) => p.available) ?? PROVIDERS[0];

  return (
    <span
      ref={wrapRef}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span className="dot" style={{ background: "var(--c-fact)" }} />
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          // Track "click-of-trigger-while-open" so we restore focus on close.
          if (open) restoreFocusRef.current = true;
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-controls="provider-menu"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "1px 4px",
          margin: "-1px -4px",
          background: "transparent",
          border: 0,
          color: "var(--ink-3)",
          fontSize: 11.5,
          fontFamily: "inherit",
          cursor: "pointer",
          borderRadius: 3,
        }}
      >
        Runs on {active.label}
        <ChevronDown
          size={11}
          aria-hidden
          style={{
            transition: "transform 0.15s",
            transform: open ? "rotate(180deg)" : "none",
          }}
        />
      </button>

      {open && (
        <div
          id="provider-menu"
          role="menu"
          aria-label="AI provider"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 6,
            zIndex: 30,
            minWidth: 240,
            // Clamp on narrow viewports so the menu cannot extend past the
            // right edge of the screen.
            maxWidth: "calc(100vw - 32px)",
            background: "var(--paper)",
            border: "1px solid var(--rule-2)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow-2)",
            padding: 4,
          }}
        >
          {PROVIDERS.map((p) => {
            const isActive = p.available;
            return (
              <div
                key={p.id}
                role="menuitem"
                aria-disabled={!p.available}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: "var(--radius)",
                  fontSize: 12.5,
                  color: p.available ? "var(--ink)" : "var(--ink-4)",
                  cursor: p.available ? "default" : "not-allowed",
                  background: isActive ? "var(--bg-2)" : "transparent",
                }}
                title={p.available ? undefined : "Coming soon"}
              >
                <span
                  style={{
                    width: 14,
                    display: "inline-flex",
                    justifyContent: "center",
                    color: "var(--c-fact)",
                  }}
                >
                  {isActive ? <Check size={12} aria-hidden /> : null}
                </span>
                <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {p.label}
                    {isActive && (
                      <Sparkles
                        size={10}
                        aria-hidden
                        style={{ color: "var(--c-fact)" }}
                      />
                    )}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 9.5,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                      color: "var(--ink-4)",
                      marginTop: 2,
                    }}
                  >
                    {p.sub}
                  </span>
                </span>
                {!p.available && (
                  <span
                    className="mono"
                    style={{
                      fontSize: 9,
                      letterSpacing: ".1em",
                      textTransform: "uppercase",
                      border: "1px solid var(--rule)",
                      padding: "1px 5px",
                      borderRadius: 4,
                      color: "var(--ink-4)",
                    }}
                  >
                    Soon
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </span>
  );
}
