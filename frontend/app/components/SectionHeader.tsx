type Props = {
  eyebrow?: string;
  title: string;
  kicker?: string;
  right?: React.ReactNode;
};

export function SectionHeader({ eyebrow, title, kicker, right }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 14,
      }}
    >
      <div>
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>}
        <h2
          className="serif"
          style={{
            fontSize: 28,
            margin: 0,
            fontWeight: 500,
            lineHeight: 1.1,
          }}
        >
          {title}
        </h2>
        {kicker && (
          <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>
            {kicker}
          </div>
        )}
      </div>
      {right}
    </div>
  );
}
