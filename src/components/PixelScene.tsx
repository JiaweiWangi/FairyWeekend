// Pixel-art scene illustration that varies by location_type keyword.
// 64x32 banner with animated elements: NPCs, lights, smoke, waves.

type Theme = {
  sky: string;
  skyTop: string;
  ground: string;
  groundDark: string;
  accent: string;
  detail: string;
};

type Kind =
  | "cafe"
  | "park"
  | "ruin"
  | "water"
  | "market"
  | "wild"
  | "store"
  | "city";

function pickTheme(locationType: string): { kind: Kind; theme: Theme } {
  const t = locationType.toLowerCase();
  if (/(便利|店|购物|7-?eleven|超市|商店)/.test(t))
    return {
      kind: "store",
      theme: {
        sky: "#1a1a3a",
        skyTop: "#0a0a22",
        ground: "#2a2a3a",
        groundDark: "#1a1a26",
        accent: "#7ae8c4",
        detail: "#fff6c0",
      },
    };
  if (/(咖啡|cafe|book|书|图书|书店)/.test(t))
    return {
      kind: "cafe",
      theme: {
        sky: "#3a2a4a",
        skyTop: "#1a0f24",
        ground: "#5a3a2a",
        groundDark: "#3a2418",
        accent: "#e8c46a",
        detail: "#f4d6b0",
      },
    };
  if (/(公园|park|花园|绿)/.test(t))
    return {
      kind: "park",
      theme: {
        sky: "#5ab0e8",
        skyTop: "#9ad0f0",
        ground: "#3a7a3a",
        groundDark: "#245a24",
        accent: "#7ac46a",
        detail: "#f0e8a0",
      },
    };
  if (/(博物|古|寺|庙|宫|遗|历史|展)/.test(t))
    return {
      kind: "ruin",
      theme: {
        sky: "#4a4060",
        skyTop: "#241a3a",
        ground: "#6a5a4a",
        groundDark: "#3a3024",
        accent: "#c4a36a",
        detail: "#e8d8a0",
      },
    };
  if (/(水|江|河|海|湖|码头|桥)/.test(t))
    return {
      kind: "water",
      theme: {
        sky: "#4a90c4",
        skyTop: "#1a3a6a",
        ground: "#2a6a9a",
        groundDark: "#16466a",
        accent: "#a0d4e8",
        detail: "#f0e8a0",
      },
    };
  if (/(市场|集|夜市|小吃|餐|食|馆)/.test(t))
    return {
      kind: "market",
      theme: {
        sky: "#3a2a4a",
        skyTop: "#1a0f24",
        ground: "#4a3020",
        groundDark: "#2a1a10",
        accent: "#e8624a",
        detail: "#f0c44a",
      },
    };
  if (/(山|郊|野|林|森)/.test(t))
    return {
      kind: "wild",
      theme: {
        sky: "#6a8ac4",
        skyTop: "#3a4a8a",
        ground: "#3a5a3a",
        groundDark: "#1f3a1f",
        accent: "#2a4a2a",
        detail: "#e8e0c4",
      },
    };
  return {
    kind: "city",
    theme: {
      sky: "#3a3a5a",
      skyTop: "#16162a",
      ground: "#2a2a3a",
      groundDark: "#15151f",
      accent: "#e8c46a",
      detail: "#a0a8d0",
    },
  };
}

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
      <defs>
        <linearGradient id={`sky-${kind}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={theme.skyTop} />
          <stop offset="100%" stopColor={theme.sky} />
        </linearGradient>
        <linearGradient id={`ground-${kind}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={theme.ground} />
          <stop offset="100%" stopColor={theme.groundDark} />
        </linearGradient>
      </defs>

      {/* sky gradient */}
      <rect width={W} height={H} fill={`url(#sky-${kind})`} />

      {/* moon/sun */}
      <rect x={48} y={4} width={4} height={4} fill={theme.detail} />
      <rect x={47} y={5} width={6} height={2} fill={theme.detail} />
      <rect x={49} y={3} width={2} height={1} fill={theme.detail} opacity={0.6} />

      {/* twinkling stars */}
      {[
        [6, 3, 0],
        [14, 6, 0.4],
        [22, 2, 0.8],
        [38, 4, 1.2],
        [10, 9, 0.2],
        [42, 8, 0.6],
      ].map(([x, y, delay], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={1}
          height={1}
          fill={theme.detail}
        >
          <animate
            attributeName="opacity"
            values="0.2;1;0.2"
            dur="2.4s"
            begin={`${delay}s`}
            repeatCount="indefinite"
          />
        </rect>
      ))}

      {/* ground gradient */}
      <rect x={0} y={H - 8} width={W} height={8} fill={`url(#ground-${kind})`} />
      {/* ground edge highlight */}
      <rect x={0} y={H - 8} width={W} height={1} fill={theme.accent} opacity={0.3} />

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
          {/* distant hill */}
          <ellipse cx={32} cy={gy + 2} rx={40} ry={6} fill={theme.groundDark} opacity={0.5} />
          {/* trees with swaying canopy */}
          {[8, 24, 40, 54].map((x, i) => (
            <g key={i}>
              <rect x={x + 1} y={gy - 6} width={2} height={6} fill="#3a2a1a" />
              <g>
                <rect x={x - 2} y={gy - 12} width={8} height={6} fill={theme.accent} />
                <rect x={x - 1} y={gy - 14} width={6} height={4} fill={theme.accent} />
                <rect x={x} y={gy - 15} width={4} height={2} fill={theme.detail} opacity={0.5} />
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values={`-1 ${x + 2} ${gy - 6}; 1 ${x + 2} ${gy - 6}; -1 ${x + 2} ${gy - 6}`}
                  dur={`${2.5 + i * 0.3}s`}
                  repeatCount="indefinite"
                />
              </g>
            </g>
          ))}
          {/* bird */}
          <g>
            <rect x={20} y={6} width={2} height={1} fill="#000" />
            <rect x={22} y={5} width={1} height={1} fill="#000" />
            <rect x={19} y={5} width={1} height={1} fill="#000" />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; 30 -2; 60 0"
              dur="8s"
              repeatCount="indefinite"
            />
          </g>
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
          {/* warm windows */}
          {[20, 28, 36].map((x, i) => (
            <g key={i}>
              <rect x={x} y={gy - 12} width={4} height={4} fill={theme.accent}>
                <animate
                  attributeName="opacity"
                  values="0.7;1;0.7"
                  dur={`${1.6 + i * 0.4}s`}
                  repeatCount="indefinite"
                />
              </rect>
              <rect x={x + 1} y={gy - 11} width={1} height={1} fill={theme.detail} />
            </g>
          ))}
          <rect x={30} y={gy - 6} width={4} height={6} fill="#1a0a0a" />
          <rect x={32} y={gy - 4} width={1} height={1} fill={theme.detail} />
          {/* sign */}
          <rect x={26} y={gy - 18} width={12} height={3} fill={theme.detail} />
          <rect x={28} y={gy - 17} width={2} height={1} fill="#000" />
          <rect x={32} y={gy - 17} width={2} height={1} fill="#000" />
          <rect x={34} y={gy - 17} width={2} height={1} fill="#000" />
          {/* awning stripes */}
          <rect x={16} y={gy - 16} width={32} height={2} fill={theme.accent} />
          {[18, 22, 26, 30, 34, 38, 42].map((x, i) => (
            <rect key={i} x={x} y={gy - 16} width={2} height={2} fill="#000" opacity={0.15} />
          ))}
          {/* steam from chimney */}
          <g opacity={0.8}>
            <circle cx={44} cy={gy - 18} r={1.5} fill={theme.detail}>
              <animate attributeName="cy" values={`${gy - 18};${gy - 24}`} dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx={45} cy={gy - 20} r={1} fill={theme.detail}>
              <animate attributeName="cy" values={`${gy - 20};${gy - 26}`} dur="3s" begin="1s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="3s" begin="1s" repeatCount="indefinite" />
            </circle>
          </g>
          {/* customer walking */}
          <g>
            <rect x={6} y={gy - 4} width={2} height={4} fill={theme.detail} />
            <rect x={6} y={gy - 6} width={2} height={2} fill="#222" />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; 8 0; 0 0"
              dur="6s"
              repeatCount="indefinite"
            />
          </g>
        </>
      );
    case "ruin":
      return (
        <>
          {/* columns */}
          {[10, 22, 42, 54].map((x, i) => (
            <g key={i}>
              <rect x={x} y={gy - 16} width={4} height={16} fill={theme.detail} />
              <rect x={x - 1} y={gy - 16} width={6} height={2} fill={theme.accent} />
              <rect x={x + 1} y={gy - 12} width={1} height={12} fill="#000" opacity={0.2} />
            </g>
          ))}
          {/* broken roof */}
          <rect x={6} y={gy - 18} width={20} height={2} fill={theme.accent} />
          <rect x={38} y={gy - 18} width={22} height={2} fill={theme.accent} />
          {/* glow orb */}
          <circle cx={32} cy={gy - 10} r={2} fill={theme.detail}>
            <animate attributeName="r" values="2;3;2" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
          </circle>
          {/* moon */}
          <rect x={32} y={6} width={3} height={3} fill={theme.detail} />
        </>
      );
    case "water":
      return (
        <>
          {/* reflection band */}
          <rect x={0} y={gy - 1} width={W} height={1} fill={theme.detail} opacity={0.3} />
          {/* boat */}
          <g>
            <rect x={24} y={gy - 4} width={14} height={3} fill="#5a3a2a" />
            <rect x={30} y={gy - 12} width={1} height={8} fill="#3a2a1a" />
            <rect x={31} y={gy - 11} width={5} height={5} fill={theme.detail} />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; 0 -0.5; 0 0"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </g>
          {/* waves */}
          {[2, 12, 44, 56].map((x, i) => (
            <rect key={i} x={x} y={gy - 1} width={4} height={1} fill={theme.accent}>
              <animate
                attributeName="x"
                values={`${x};${x + 2};${x}`}
                dur={`${1.5 + i * 0.3}s`}
                repeatCount="indefinite"
              />
            </rect>
          ))}
          {/* far lighthouse */}
          <rect x={56} y={gy - 10} width={2} height={10} fill={theme.detail} />
          <rect x={55} y={gy - 12} width={4} height={2} fill={theme.accent}>
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
          </rect>
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
              {/* steam */}
              <circle cx={x + 6} cy={gy - 12} r={1} fill={theme.detail} opacity={0.7}>
                <animate attributeName="cy" values={`${gy - 12};${gy - 18}`} dur="2.5s" begin={`${i * 0.6}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0" dur="2.5s" begin={`${i * 0.6}s`} repeatCount="indefinite" />
              </circle>
            </g>
          ))}
          {/* hanging lanterns */}
          {[12, 32, 52].map((x, i) => (
            <g key={i}>
              <rect x={x} y={0} width={1} height={4} fill={theme.detail} opacity={0.4} />
              <rect x={x - 1} y={4} width={3} height={4} fill={theme.accent}>
                <animate
                  attributeName="opacity"
                  values="0.7;1;0.7"
                  dur={`${1.5 + i * 0.4}s`}
                  repeatCount="indefinite"
                />
              </rect>
              <rect x={x} y={5} width={1} height={2} fill={theme.detail} />
            </g>
          ))}
          {/* customer */}
          <rect x={38} y={gy - 4} width={2} height={4} fill={theme.detail} />
          <rect x={38} y={gy - 6} width={2} height={2} fill="#222" />
        </>
      );
    case "wild":
      return (
        <>
          {/* mountains */}
          <polygon points={`0,${gy} 12,${gy - 14} 24,${gy}`} fill={theme.accent} />
          <polygon points={`20,${gy} 36,${gy - 18} 52,${gy}`} fill={theme.accent} />
          <polygon points={`48,${gy} 60,${gy - 12} 72,${gy}`} fill={theme.accent} />
          {/* snow caps */}
          <polygon points={`10,${gy - 12} 12,${gy - 14} 14,${gy - 12}`} fill={theme.detail} />
          <polygon points={`33,${gy - 15} 36,${gy - 18} 39,${gy - 15}`} fill={theme.detail} />
          {/* pines */}
          {[8, 30, 52].map((x, i) => (
            <g key={i}>
              <rect x={x} y={gy - 6} width={2} height={6} fill="#3a2a1a" />
              <polygon
                points={`${x - 2},${gy - 6} ${x + 1},${gy - 14} ${x + 4},${gy - 6}`}
                fill={theme.detail}
              />
              <polygon
                points={`${x - 1},${gy - 9} ${x + 1},${gy - 12} ${x + 3},${gy - 9}`}
                fill={theme.accent}
                opacity={0.6}
              />
            </g>
          ))}
          {/* eagle */}
          <g>
            <rect x={32} y={6} width={1} height={1} fill="#000" />
            <rect x={33} y={5} width={2} height={1} fill="#000" />
            <rect x={35} y={6} width={1} height={1} fill="#000" />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; -20 -1; 0 0"
              dur="10s"
              repeatCount="indefinite"
            />
          </g>
        </>
      );
    case "store":
      return (
        <>
          {/* distant city silhouette */}
          {[2, 10, 18, 50, 58].map((x, i) => {
            const h = 4 + ((i * 3) % 6);
            return (
              <rect key={i} x={x} y={gy - h} width={6} height={h} fill={theme.groundDark} opacity={0.7} />
            );
          })}
          {/* convenience store */}
          <rect x={22} y={gy - 14} width={22} height={14} fill="#f4f6f8" />
          {/* roof stripes (signature) */}
          <rect x={20} y={gy - 16} width={26} height={2} fill="#e8624a" />
          <rect x={20} y={gy - 18} width={26} height={2} fill="#4a8ae8" />
          <rect x={20} y={gy - 20} width={26} height={2} fill="#3aa05a" />
          {/* sign text dots */}
          <rect x={28} y={gy - 13} width={2} height={2} fill="#222" />
          <rect x={31} y={gy - 13} width={2} height={2} fill="#222" />
          <rect x={34} y={gy - 13} width={2} height={2} fill="#222" />
          <rect x={37} y={gy - 13} width={2} height={2} fill="#222" />
          {/* big glowing window */}
          <rect x={24} y={gy - 10} width={18} height={8} fill={theme.detail}>
            <animate attributeName="opacity" values="0.85;1;0.85" dur="2s" repeatCount="indefinite" />
          </rect>
          {/* shelves inside */}
          <rect x={26} y={gy - 8} width={4} height={5} fill="#e8624a" opacity={0.5} />
          <rect x={31} y={gy - 8} width={4} height={5} fill="#4a8ae8" opacity={0.5} />
          <rect x={36} y={gy - 8} width={4} height={5} fill="#3aa05a" opacity={0.5} />
          {/* door */}
          <rect x={32} y={gy - 5} width={4} height={5} fill="#1a2a3a" />
          {/* light spill on ground */}
          <polygon
            points={`24,${gy} 42,${gy} 46,${gy + 4} 20,${gy + 4}`}
            fill={theme.detail}
            opacity={0.15}
          />
          {/* customer */}
          <g>
            <rect x={48} y={gy - 4} width={2} height={4} fill={theme.accent} />
            <rect x={48} y={gy - 6} width={2} height={2} fill="#222" />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; -6 0; 0 0"
              dur="5s"
              repeatCount="indefinite"
            />
          </g>
          {/* lamp post */}
          <rect x={12} y={gy - 12} width={1} height={12} fill="#888" />
          <rect x={10} y={gy - 13} width={5} height={2} fill={theme.detail}>
            <animate attributeName="opacity" values="0.7;1;0.7" dur="1.8s" repeatCount="indefinite" />
          </rect>
          {/* moth circling lamp */}
          <circle cx={12} cy={gy - 11} r={0.5} fill={theme.detail}>
            <animateMotion
              path="M 0,0 a 3,2 0 1,1 0.1,0"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
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
                  >
                    <animate
                      attributeName="opacity"
                      values="0.4;1;0.4"
                      dur={`${1.5 + (i + j) * 0.3}s`}
                      repeatCount="indefinite"
                    />
                  </rect>
                ))}
              </g>
            );
          })}
          {/* tiny car */}
          <g>
            <rect x={0} y={gy - 2} width={4} height={2} fill={theme.accent} />
            <rect x={0} y={gy - 1} width={1} height={1} fill={theme.detail} />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; 70 0"
              dur="9s"
              repeatCount="indefinite"
            />
          </g>
        </>
      );
  }
}
