// Compact 16x16 pixel-art landmark icons for map nodes.
// Each "kind" renders a tiny building / terrain motif using <rect>s.

export type MapIconKind =
  | "cafe"
  | "park"
  | "ruin"
  | "water"
  | "market"
  | "wild"
  | "city";

export function pickMapIconKind(locationType: string): MapIconKind {
  const t = locationType.toLowerCase();
  if (/(咖啡|cafe|书|图书|书店)/.test(t)) return "cafe";
  if (/(公园|park|花园|绿)/.test(t)) return "park";
  if (/(博物|古|寺|庙|宫|遗|历史)/.test(t)) return "ruin";
  if (/(水|江|河|海|湖|码头|桥)/.test(t)) return "water";
  if (/(市场|集|夜市|小吃|餐|食)/.test(t)) return "market";
  if (/(山|郊|野|林|森)/.test(t)) return "wild";
  return "city";
}

type Palette = { a: string; b: string; c: string; d: string };

const PALETTES: Record<MapIconKind, Palette> = {
  cafe:   { a: "#6a3a20", b: "#a8643a", c: "#f0c46a", d: "#2a1a10" },
  park:   { a: "#2a5a2a", b: "#4a8a3a", c: "#8ad06a", d: "#3a2a1a" },
  ruin:   { a: "#5a4a3a", b: "#a89070", c: "#e8d8a0", d: "#2a2018" },
  water:  { a: "#2a4a7a", b: "#4a90c4", c: "#a0d4e8", d: "#5a3a2a" },
  market: { a: "#5a2018", b: "#c44a2a", c: "#f0c44a", d: "#2a1a10" },
  wild:   { a: "#2a3a5a", b: "#4a6a4a", c: "#8ab078", d: "#1a2018" },
  city:   { a: "#1a1a2e", b: "#4a4a6a", c: "#e8c46a", d: "#a0a8d0" },
};

export function PixelMapIcon({
  kind,
  size = 40,
  className,
}: {
  kind: MapIconKind;
  size?: number;
  className?: string;
}) {
  const p = PALETTES[kind];
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
      style={{ imageRendering: "pixelated" as const, display: "block" }}
    >
      <Sprite kind={kind} p={p} />
    </svg>
  );
}

function Sprite({ kind, p }: { kind: MapIconKind; p: Palette }) {
  // R = rect helper
  const R = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect x={x} y={y} width={w} height={h} fill={fill} />
  );

  switch (kind) {
    case "cafe":
      // Awning + cup
      return (
        <>
          {R(2, 5, 12, 8, p.a)}
          {R(2, 4, 12, 2, p.b)}
          {/* stripes */}
          {R(3, 4, 2, 2, p.c)}
          {R(7, 4, 2, 2, p.c)}
          {R(11, 4, 2, 2, p.c)}
          {/* door */}
          {R(7, 9, 2, 4, p.d)}
          {/* window */}
          {R(3, 7, 3, 2, p.c)}
          {R(10, 7, 3, 2, p.c)}
          {/* steam */}
          {R(7, 1, 1, 1, p.c)}
          {R(8, 0, 1, 1, p.c)}
        </>
      );
    case "park":
      // Big tree + grass
      return (
        <>
          {/* grass */}
          {R(0, 13, 16, 3, p.a)}
          {/* trunk */}
          {R(7, 9, 2, 5, p.d)}
          {/* foliage */}
          {R(4, 4, 8, 6, p.b)}
          {R(3, 6, 10, 3, p.b)}
          {R(5, 3, 6, 2, p.c)}
          {/* small bush */}
          {R(1, 11, 3, 3, p.b)}
          {R(12, 11, 3, 3, p.b)}
        </>
      );
    case "ruin":
      // Greek columns
      return (
        <>
          {R(0, 13, 16, 3, p.a)}
          {/* pediment */}
          {R(2, 2, 12, 2, p.c)}
          {R(3, 1, 10, 1, p.c)}
          {/* columns */}
          {R(2, 4, 2, 9, p.c)}
          {R(7, 4, 2, 9, p.c)}
          {R(12, 4, 2, 9, p.c)}
          {/* steps */}
          {R(1, 12, 14, 1, p.b)}
          {/* moss */}
          {R(2, 6, 2, 1, p.d)}
        </>
      );
    case "water":
      // Boat on waves
      return (
        <>
          {/* waves */}
          {R(0, 11, 16, 5, p.a)}
          {R(0, 10, 4, 1, p.b)}
          {R(6, 10, 4, 1, p.b)}
          {R(12, 10, 4, 1, p.b)}
          {/* boat hull */}
          {R(3, 8, 10, 3, p.d)}
          {R(2, 9, 12, 2, p.d)}
          {/* mast */}
          {R(7, 2, 1, 6, p.d)}
          {/* sail */}
          {R(8, 3, 4, 4, p.c)}
          {R(8, 2, 3, 1, p.c)}
        </>
      );
    case "market":
      // Lantern stall
      return (
        <>
          {R(0, 13, 16, 3, p.a)}
          {/* stall */}
          {R(2, 7, 12, 6, p.d)}
          {/* awning */}
          {R(1, 5, 14, 2, p.b)}
          {R(2, 4, 12, 1, p.b)}
          {/* stripes */}
          {R(3, 5, 2, 2, p.c)}
          {R(7, 5, 2, 2, p.c)}
          {R(11, 5, 2, 2, p.c)}
          {/* lanterns */}
          {R(3, 8, 2, 2, p.c)}
          {R(11, 8, 2, 2, p.c)}
          {R(7, 9, 2, 3, p.c)}
        </>
      );
    case "wild":
      // Mountain peak
      return (
        <>
          {R(0, 13, 16, 3, p.a)}
          {/* back mountain */}
          <polygon points="2,13 8,3 14,13" fill={p.b} />
          {/* snow cap */}
          <polygon points="6,7 8,3 10,7 9,8 8,7 7,8" fill={p.c} />
          {/* front mountain */}
          <polygon points="8,13 12,7 16,13" fill={p.b} />
          {/* pine */}
          {R(1, 10, 1, 3, p.d)}
          <polygon points="0,10 1.5,6 3,10" fill={p.c} />
        </>
      );
    default:
      // City — towers
      return (
        <>
          {R(0, 13, 16, 3, p.b)}
          {/* tower 1 */}
          {R(1, 4, 4, 9, p.b)}
          {R(2, 5, 1, 1, p.c)}
          {R(2, 7, 1, 1, p.c)}
          {R(2, 9, 1, 1, p.c)}
          {R(3, 5, 1, 1, p.c)}
          {R(3, 9, 1, 1, p.c)}
          {/* tower 2 (tall) */}
          {R(6, 2, 4, 11, p.a)}
          {R(7, 3, 1, 1, p.c)}
          {R(7, 5, 1, 1, p.c)}
          {R(7, 7, 1, 1, p.c)}
          {R(7, 9, 1, 1, p.c)}
          {R(8, 3, 1, 1, p.c)}
          {R(8, 7, 1, 1, p.c)}
          {/* antenna */}
          {R(7, 0, 1, 2, p.d)}
          {/* tower 3 */}
          {R(11, 6, 4, 7, p.b)}
          {R(12, 7, 1, 1, p.c)}
          {R(13, 9, 1, 1, p.c)}
          {R(12, 11, 1, 1, p.c)}
        </>
      );
  }
}
