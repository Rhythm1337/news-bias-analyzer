type Props = {
  /** values in -1..+1, paragraph-level */
  series: number[];
  height?: number;
};

export function SentimentChart({ series, height = 110 }: Props) {
  if (!series.length) return null;
  const w = 100;
  const n = series.length;
  const step = n === 1 ? 0 : w / (n - 1);
  const path = series
    .map((v, i) => {
      const x = i * step;
      const y = 50 - Math.max(-1, Math.min(1, v)) * 45;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const area = `${path} L${w},50 L0,50 Z`;
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      width="100%"
      height={height}
      style={{ display: "block", overflow: "visible" }}
      aria-hidden
    >
      <line
        x1="0"
        y1="50"
        x2="100"
        y2="50"
        stroke="var(--rule)"
        strokeWidth="0.3"
        strokeDasharray="0.8,0.8"
      />
      <path d={area} fill="var(--c-tone-soft)" opacity="0.85" />
      <path
        d={path}
        stroke="var(--c-tone)"
        strokeWidth="0.7"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
      {series.map((v, i) => (
        <circle
          key={i}
          cx={i * step}
          cy={50 - Math.max(-1, Math.min(1, v)) * 45}
          r="0.6"
          fill="var(--c-tone)"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
