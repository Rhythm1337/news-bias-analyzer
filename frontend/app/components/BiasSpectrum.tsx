type Props = {
  /** -1 (far left) .. +1 (far right). Backend uses this scale. */
  value: number;
  height?: number;
  showLabels?: boolean;
};

export function BiasSpectrum({ value, height = 12, showLabels = true }: Props) {
  const clamped = Math.max(-1, Math.min(1, value));
  const pct = ((clamped + 1) / 2) * 100;
  // also display a -50..+50 scaled number so it matches the design's spectrum reading.
  const displayNum = Math.round(clamped * 50);

  return (
    // Reserve 28px above the bar for the absolutely-positioned number label
    // (top: -22, ~12px tall) so it has room without being clipped by an
    // ancestor with overflow:hidden or a tight parent layout.
    <div style={{ width: "100%", paddingTop: 28 }}>
      <div
        style={{
          position: "relative",
          height,
          background:
            "linear-gradient(to right, var(--bias-l), var(--bias-c) 50%, var(--bias-r))",
          borderRadius: 999,
          opacity: 0.78,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${pct}%`,
            top: -6,
            width: 2,
            height: height + 12,
            transform: "translateX(-50%)",
            background: "var(--ink)",
            transition: "left 600ms cubic-bezier(.2,.7,.2,1)",
          }}
        />
        <div
          className="mono tnum"
          style={{
            position: "absolute",
            left: `${pct}%`,
            top: -22,
            transform: "translateX(-50%)",
            fontSize: 10,
            color: "var(--ink)",
            whiteSpace: "nowrap",
          }}
        >
          {displayNum > 0 ? "+" : displayNum < 0 ? "−" : ""}
          {Math.abs(displayNum)}
        </div>
      </div>
      {showLabels && (
        <div
          className="mono"
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 6,
            fontSize: 10,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
          }}
        >
          <span>Far Left −50</span>
          <span>Center 0</span>
          <span>Far Right +50</span>
        </div>
      )}
    </div>
  );
}
