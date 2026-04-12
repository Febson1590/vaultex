/**
 * Pure-SVG sparkline — no external deps.
 *
 * Renders a filled line chart that auto-colors based on whether the
 * overall direction is up (emerald) or down (red). Designed to work
 * at tiny sizes (e.g. 80×24) inside exchange-style data rows.
 */
interface SparklineProps {
  data:   number[];
  width?: number;
  height?: number;
  up?:    boolean;
  className?: string;
  /** Use a fixed unique id for the gradient when rendered server-side. */
  idSuffix?: string;
}

export function Sparkline({
  data,
  width  = 96,
  height = 28,
  up,
  className,
  idSuffix = "s",
}: SparklineProps) {
  if (!data || data.length < 2) {
    return (
      <svg width={width} height={height} className={className} aria-hidden="true" />
    );
  }

  // Determine direction automatically if not provided.
  const direction = up ?? data[data.length - 1] >= data[0];
  const stroke = direction ? "#10b981" : "#ef4444";
  const fill   = direction ? "rgba(16, 185, 129, 0.22)" : "rgba(239, 68, 68, 0.22)";

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;

  // Leave 2px padding top & bottom so the line doesn't clip.
  const pad = 2;
  const innerH = height - pad * 2;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = pad + (1 - (v - min) / span) * innerH;
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

  const fillPath =
    linePath +
    ` L${width.toFixed(2)},${height.toFixed(2)} L0,${height.toFixed(2)} Z`;

  const gradId = `vx-spark-${idSuffix}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        stroke={stroke}
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: direction ? "drop-shadow(0 0 3px rgba(16,185,129,0.35))" : "drop-shadow(0 0 3px rgba(239,68,68,0.35))" }}
      />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r={1.8} fill={stroke} />
      {/* Fallback solid color for browsers that don't render the gradient */}
      <path d={fillPath} fill={fill} opacity={0} />
    </svg>
  );
}
