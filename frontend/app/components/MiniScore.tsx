type Props = {
  label: string;
  /** 0..1 */
  value: number;
  note?: string;
  color?: string;
};

export function MiniScore({ label, value, note, color = "var(--accent)" }: Props) {
  const v = Math.max(0, Math.min(1, value));
  const num = Math.round(v * 100);
  const trimmedNote = note?.trim() ?? "";
  // The backend backfills missing sub-metrics with value=0 and note="" so the
  // shape stays consistent. That is indistinguishable from a confident 0/100.
  // Render an "unrated" state instead so users do not read a backfill as a real
  // score.
  const unrated = value === 0 && trimmedNote === "";

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 6 }}>
        {label}
      </div>
      {unrated ? (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              className="mono tnum"
              style={{
                fontSize: 26,
                fontWeight: 500,
                color: "var(--ink-4)",
                opacity: 0.65,
              }}
            >
              --
            </span>
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                color: "var(--ink-3)",
                border: "1px solid var(--rule)",
                borderRadius: 999,
                padding: "2px 8px",
              }}
            >
              no signal
            </span>
          </div>
          <div
            className="meter"
            style={{
              marginTop: 8,
              borderStyle: "dashed",
              opacity: 0.5,
            }}
          >
            <div style={{ width: 0, background: "transparent" }} />
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="mono tnum" style={{ fontSize: 26, fontWeight: 500, color: "var(--ink)" }}>
              {num}
            </span>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>/100</span>
          </div>
          {note && (
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", margin: "4px 0 8px", lineHeight: 1.4 }}>
              {note}
            </div>
          )}
          <div className="meter" style={{ marginTop: note ? 0 : 8 }}>
            <div style={{ width: `${num}%`, background: color }} />
          </div>
        </>
      )}
    </div>
  );
}
