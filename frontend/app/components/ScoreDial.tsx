type Props = {
  /** 0..1 fill fraction; signed values are absolute-valued for the ring */
  value: number;
  size?: number;
  color?: string;
  track?: string;
  /** Number rendered in the middle (defaults to value*100, signed if `signed`) */
  display?: number;
  signed?: boolean;
  /**
   * 0..1 minimum visible arc when value is near zero. Useful for signed
   * metrics where a true center value is meaningful and should still show
   * a small tick of color rather than rendering as an empty ring.
   */
  minVisibleFill?: number;
};

export function ScoreDial({
  value,
  size = 88,
  color = "var(--c-bias)",
  track = "var(--rule)",
  display,
  signed = false,
  minVisibleFill = 0,
}: Props) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const rawFill = Math.max(0, Math.min(1, Math.abs(value)));
  const minFloor = Math.max(0, Math.min(1, minVisibleFill));
  const fill = minFloor > 0 ? Math.max(minFloor, rawFill) : rawFill;
  const off = c * (1 - fill);
  const num = display ?? Math.round(value * 100);
  const numFontSize = size * 0.28;

  return (
    <div className="dial-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={6} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "center",
            transition: "stroke-dashoffset 800ms cubic-bezier(.2,.7,.2,1)",
          }}
        />
      </svg>
      <div className="dial-num" style={{ fontSize: numFontSize }}>
        {signed && num > 0 ? "+" : ""}
        {num}
      </div>
    </div>
  );
}
