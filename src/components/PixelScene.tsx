// Pixel-art scene illustration that varies by location_type keyword.
// Renders an inline SVG of ~64x32 pixels in a wide banner format.

type Theme = {
  sky: string;
  ground: string;
  accent: string;
  detail: string;
};

function pickTheme(locationType: string): { kind: Kind; theme: Theme } {
  const t = locationType.toLowerCase();
  if (/(咖啡|cafe|book|书|图书|书店)/.test(t))
    return {
      kind: "cafe",
      theme: { sky: "#3a2a4a", ground: "#5a3a2a", accent: "#e8c46a", detail: "#f4d6b0" },
    };
  if (/(公园|park|花园|绿)/.test(t))
    return {
      kind: "park",
      theme: { sky: "#5ab0e8", ground: "#3a7a3a", accent: "#7ac46a", detail: "#f0e8a0" },
    };
  if (/(博物|古|寺|庙|宫|遗|历史)/.test(t))
    return {
      kind: "ruin",
      theme: { sky: "#4a4060", ground: "#6a5a4a", accent: "#c4a36a", detail: "#e8d8a0" },
    };
  if (/(水|江|河|海|湖|码头|桥)/.test(t))
    return {
      kind: "water",
      theme: { sky: "#4a90c4", ground: "#2a6a9a", accent: "#a0d4e8", detail: "#f0e8a0" },
    };
  if (/(市场|集|夜市|小吃|餐|食)/.test(t))
    return {
      kind: "market",
      theme: { sky: "#3a2a4a", ground: "#4a3020", accent: "#e8624a", detail: "#f0c44a" },
    };
  if (/(山|郊|野|林|森)/.test(t))
    return {
      kind: "wild",
      theme: { sky: "#6a8ac4", ground: "#3a5a3a", accent: "#2a4a2a", detail: "#e8e0c4" },
    };
  return {
    kind: "city",
    theme: { sky: "#3a3a5a", ground: "#2a2a3a", accent: "#e8c46a", detail: "#a0a8d0" },
  };
}

type Kind = "cafe" | "park" | "ruin" | "water" | "market" | "wild" | "city";

export function PixelScene({
  locationType,
  height = 100,
  className,
}: {
  locationType: string;
  height?: number;
  className?: string;
}) {
  const { kind, theme } = pickTheme(locationType);
  const W = 64;
  const H = 32;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      shapeRendering="crispEdges"
      className={className}
      style={{ display: "block", imageRendering: "pixelated" as const }}
    >
      {/* sky */}
      <rect width={W} height={H} fill={theme.sky} />
      {/* sun/moon */}
      <rect x={48} y={4} width={4} height={4} fill={theme.detail} />
      <rect x={47} y={5} width={6} height={2} fill={theme.detail} />
      {/* stars / clouds */}
      <rect x={6} y={3} width={1} height={1} fill={theme.detail} />
      <rect x={14} y={6} width={1} height={1} fill={theme.detail} />
      <rect x={22} y={2} width={1} height={1} fill={theme.detail} />
      <rect x={38} y={4} width={1} height={1} fill={theme.detail} />

      {/* ground */}
      <rect x={0} y={H - 8} width={W} height={8} fill={theme.ground} />

      <SceneOverlay kind={kind} theme={theme} W={W} H={H} />
    </svg>
  );
}

function SceneOverlay({
  kind,
  theme,
  W,
  H,
}: {
  kind: Kind;
  theme: Theme;
  W: number;
  H: number;
}) {
  const gy = H - 8;
  switch (kind) {
    case "park":
      return (
        <>
          {[8, 24, 40, 54].map((x, i) => (
            <g key={i}>
              <rect x={x + 1} y={gy - 6} width={2} height={6} fill="#3a2a1a" />
              <rect x={x - 2} y={gy - 12} width={8} height={6} fill={theme.accent} />
              <rect x={x - 1} y={gy - 14} width={6} height={4} fill={theme.accent} />
            </g>
          ))}
          {/* flowers */}
          {[12, 30, 46].map((x, i) => (
            <rect key={i} x={x} y={gy - 1} width={1} height={1} fill={theme.detail} />
          ))}
        </>
      );
    case "cafe":
      return (
        <>
          {/* building */}
          <rect x={18} y={gy - 14} width={28} height={14} fill={theme.ground} />
          <rect x={20} y={gy - 12} width={4} height={4} fill={theme.accent} />
          <rect x={28} y={gy - 12} width={4} height={4} fill={theme.accent} />
          <rect x={36} y={gy - 12} width={4} height={4} fill={theme.accent} />
          <rect x={30} y={gy - 6} width={4} height={6} fill="#1a0a0a" />
          {/* sign */}
          <rect x={26} y={gy - 18} width={12} height={3} fill={theme.detail} />
          <rect x={28} y={gy - 17} width={2} height={1} fill="#000" />
          <rect x={32} y={gy - 17} width={2} height={1} fill="#000" />
          <rect x={34} y={gy - 17} width={2} height={1} fill="#000" />
          {/* awning */}
          <rect x={16} y={gy - 16} width={32} height={2} fill={theme.accent} />
        </>
      );
    case "ruin":
      return (
        <>
          {/* columns */}
          {[10, 22, 42, 54].map((x, i) => (
            <rect key={i} x={x} y={gy - 16} width={4} height={16} fill={theme.detail} />
          ))}
          {/* broken roof */}
          <rect x={6} y={gy - 18} width={20} height={2} fill={theme.accent} />
          <rect x={38} y={gy - 18} width={22} height={2} fill={theme.accent} />
          {/* moon */}
          <rect x={32} y={6} width={3} height={3} fill={theme.detail} />
        </>
      );
    case "water":
      return (
        <>
          {/* boat */}
          <rect x={24} y={gy - 4} width={14} height={3} fill="#5a3a2a" />
          <rect x={30} y={gy - 12} width={1} height={8} fill="#3a2a1a" />
          <rect x={31} y={gy - 11} width={5} height={5} fill={theme.detail} />
          {/* waves */}
          {[2, 12, 44, 56].map((x, i) => (
            <rect key={i} x={x} y={gy - 1} width={4} height={1} fill={theme.accent} />
          ))}
        </>
      );
    case "market":
      return (
        <>
          {/* stalls */}
          {[6, 26, 46].map((x, i) => (
            <g key={i}>
              <rect x={x} y={gy - 10} width={12} height={10} fill={theme.ground} />
              <rect x={x - 1} y={gy - 12} width={14} height={2} fill={theme.accent} />
              <rect x={x + 2} y={gy - 8} width={2} height={2} fill={theme.detail} />
              <rect x={x + 6} y={gy - 8} width={2} height={2} fill={theme.detail} />
            </g>
          ))}
          {/* lanterns */}
          {[12, 32, 52].map((x, i) => (
            <rect key={i} x={x} y={4} width={2} height={3} fill={theme.accent} />
          ))}
        </>
      );
    case "wild":
      return (
        <>
          {/* mountains */}
          <polygon points={`0,${gy} 12,${gy - 14} 24,${gy}`} fill={theme.accent} />
          <polygon points={`20,${gy} 36,${gy - 18} 52,${gy}`} fill={theme.accent} />
          <polygon points={`48,${gy} 60,${gy - 12} 72,${gy}`} fill={theme.accent} />
          {/* pine */}
          {[8, 30, 52].map((x, i) => (
            <g key={i}>
              <rect x={x} y={gy - 6} width={2} height={6} fill="#3a2a1a" />
              <polygon
                points={`${x - 2},${gy - 6} ${x + 1},${gy - 14} ${x + 4},${gy - 6}`}
                fill={theme.detail}
              />
            </g>
          ))}
        </>
      );
    default:
      return (
        <>
          {/* skyline */}
          {[4, 16, 28, 38, 50].map((x, i) => {
            const h = 6 + ((i * 3) % 10);
            return (
              <g key={i}>
                <rect x={x} y={gy - h} width={8} height={h} fill={theme.detail} />
                {Array.from({ length: 3 }).map((_, j) => (
                  <rect
                    key={j}
                    x={x + 1 + j * 2}
                    y={gy - h + 2}
                    width={1}
                    height={1}
                    fill={theme.accent}
                  />
                ))}
              </g>
            );
          })}
        </>
      );
  }
}
