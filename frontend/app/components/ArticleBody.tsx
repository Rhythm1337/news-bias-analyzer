"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import type { Highlight } from "@/app/lib/types";

type Props = {
  text: string;
  highlights: Highlight[];
  /** Vertical scroll cap. Defaults to ~24rem. */
  maxHeight?: number;
};

type Segment =
  | { kind: "text"; text: string }
  | { kind: "mark"; text: string; h: Highlight };

function buildSegments(text: string, highlights: Highlight[]): Segment[] {
  // Caller should already have non-overlapping, sorted highlights from the
  // backend reconcile pass, but defend anyway.
  const sorted = [...highlights]
    .filter((h) => h.start >= 0 && h.end > h.start && h.end <= text.length)
    .sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const h of sorted) {
    if (h.start < cursor) continue; // skip overlap
    if (h.start > cursor) {
      segments.push({ kind: "text", text: text.slice(cursor, h.start) });
    }
    segments.push({ kind: "mark", text: text.slice(h.start, h.end), h });
    cursor = h.end;
  }
  if (cursor < text.length) {
    segments.push({ kind: "text", text: text.slice(cursor) });
  }
  return segments;
}

export function ArticleBody({ text, highlights, maxHeight = 420 }: Props) {
  const segments = useMemo(() => buildSegments(text, highlights), [text, highlights]);
  const [open, setOpen] = useState<number | null>(null);

  // Stable handlers so the listener useEffect inside HighlightTooltip does not
  // detach and reattach on every parent render.
  const handleClose = useCallback(() => setOpen(null), []);
  const makeToggle = useCallback(
    (i: number) => () => setOpen((prev) => (prev === i ? null : i)),
    []
  );

  return (
    <div
      style={{
        background: "var(--paper)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius)",
        padding: 20,
        maxHeight,
        overflow: "auto",
        fontSize: 15,
        lineHeight: 1.7,
        color: "var(--ink-2)",
        fontFamily: "var(--body)",
        whiteSpace: "pre-wrap",
      }}
    >
      {segments.map((seg, i) =>
        seg.kind === "text" ? (
          <span key={i}>{seg.text}</span>
        ) : (
          <HighlightSpan
            key={i}
            index={i}
            seg={seg}
            isOpen={open === i}
            onToggle={makeToggle(i)}
            onClose={handleClose}
          />
        )
      )}
    </div>
  );
}

function HighlightSpan({
  index,
  seg,
  isOpen,
  onToggle,
  onClose,
}: {
  index: number;
  seg: Extract<Segment, { kind: "mark" }>;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const markRef = useRef<HTMLElement | null>(null);
  const tipId = `hl-tip-${index}`;

  return (
    <span style={{ display: "inline" }}>
      <mark
        ref={markRef}
        className={`h h-${seg.h.type}`}
        title={seg.h.note}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        tabIndex={0}
        role="button"
        aria-expanded={isOpen}
        aria-describedby={isOpen ? tipId : undefined}
      >
        {seg.text}
      </mark>
      {isOpen && (
        <HighlightTooltip
          tipId={tipId}
          anchorRef={markRef}
          highlight={seg.h}
          onClose={onClose}
        />
      )}
    </span>
  );
}

function HighlightTooltip({
  tipId,
  anchorRef,
  highlight,
  onClose,
}: {
  tipId: string;
  anchorRef: RefObject<HTMLElement | null>;
  highlight: Highlight;
  onClose: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // One-shot post-hydration mount flag so we only render the portal client
    // side. The setState here is intentional and runs exactly once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Compute position relative to viewport. We use fixed positioning so the
  // tooltip is not clipped by the article scroll container.
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const POPOVER_WIDTH = 280;
    // Approximate popover height. The tooltip body is short (one label and a
    // one or two line note) so 140px is a safe upper bound for the flip
    // decision. A real measurement would require a second layout pass.
    const POPOVER_HEIGHT = 140;

    function recompute() {
      const a = anchorRef.current;
      if (!a) return;
      const rect = a.getBoundingClientRect();
      const margin = 8;
      let left = rect.left;
      const maxLeft = window.innerWidth - POPOVER_WIDTH - margin;
      if (left > maxLeft) left = Math.max(margin, maxLeft);
      if (left < margin) left = margin;
      let top = rect.bottom + 6;
      // Flip above the anchor when the popover would overflow the viewport
      // bottom. Same 6px gap, opposite side of the mark.
      if (top + POPOVER_HEIGHT > window.innerHeight - margin) {
        top = rect.top - POPOVER_HEIGHT - 6;
      }
      setPos({ top, left });
    }

    recompute();
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
    };
  }, [anchorRef]);

  // Outside click + Escape close.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (popoverRef.current && popoverRef.current.contains(target)) return;
      const anchor = anchorRef.current;
      if (anchor && anchor.contains(target)) return;
      onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [anchorRef, onClose]);

  if (!mounted || !pos || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={popoverRef}
      id={tipId}
      role="tooltip"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 70,
        background: "var(--paper)",
        border: "1px solid var(--rule-2)",
        borderRadius: "var(--radius)",
        padding: "10px 12px",
        width: 280,
        fontSize: 12,
        lineHeight: 1.45,
        color: "var(--ink-2)",
        boxShadow: "var(--shadow-2)",
        whiteSpace: "normal",
      }}
    >
      <span
        className="mono"
        style={{
          display: "block",
          fontSize: 10,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
          marginBottom: 4,
        }}
      >
        {labelFor(highlight.type)}
      </span>
      {highlight.note}
    </div>,
    document.body
  );
}

function labelFor(type: Highlight["type"]): string {
  switch (type) {
    case "loaded":
      return "Loaded language";
    case "tone":
      return "Charged tone";
    case "source-good":
      return "Good sourcing";
    case "source-bad":
      return "Vague sourcing";
    case "fact-good":
      return "Verifiable claim";
    case "fact-bad":
      return "Shaky claim";
  }
}
