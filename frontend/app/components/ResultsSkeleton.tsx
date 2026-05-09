export function ResultsSkeleton() {
  const bar: React.CSSProperties = {
    background: "var(--bg-3)",
    borderRadius: 2,
  };
  return (
    <section
      className="card animate-pulse"
      style={{
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          paddingBottom: 16,
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <div style={{ ...bar, height: 20, width: "66%" }} />
        <div style={{ ...bar, height: 12, width: "50%" }} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 16,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <div style={{ ...bar, height: 12, width: 96 }} />
            <div style={{ ...bar, height: 20, width: 80 }} />
            <div style={{ ...bar, height: 8, width: "100%", borderRadius: 999 }} />
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius)",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ ...bar, height: 12, width: 128 }} />
            <div style={{ ...bar, height: 28, width: 80 }} />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ ...bar, height: 12, width: 80 }} />
        <div style={{ ...bar, height: 12, width: "100%" }} />
        <div style={{ ...bar, height: 12, width: "92%" }} />
        <div style={{ ...bar, height: 12, width: "75%" }} />
      </div>
    </section>
  );
}
