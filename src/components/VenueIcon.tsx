// Q-version venue illustrations. Picks a glyph based on location_type / name keywords.

export type VenueKind =
  | "cafe" | "bakery" | "dessert" | "bar" | "restaurant" | "noodle" | "market"
  | "bookstore" | "flower" | "plant" | "park" | "museum" | "gallery"
  | "cinema" | "spa" | "temple" | "river" | "shop" | "street" | "default";

export function detectVenue(type: string, name = ""): VenueKind {
  const s = `${type} ${name}`.toLowerCase();
  if (/咖啡|coffee|cafe/.test(s)) return "cafe";
  if (/面包|烘焙|bakery/.test(s)) return "bakery";
  if (/甜品|蛋糕|dessert|冰淇淋|奶茶/.test(s)) return "dessert";
  if (/酒馆|酒吧|bar|清吧/.test(s)) return "bar";
  if (/面馆|拉面|noodle/.test(s)) return "noodle";
  if (/餐|馆子|苍蝇|食堂|小吃|夜市/.test(s)) return "restaurant";
  if (/菜市场|集市|市集|market/.test(s)) return "market";
  if (/书店|书|图书|bookstore/.test(s)) return "bookstore";
  if (/花|花店|flower/.test(s)) return "flower";
  if (/植物|盆栽|绿植/.test(s)) return "plant";
  if (/公园|绿地|植物园|广场|park/.test(s)) return "park";
  if (/美术|画廊|gallery|展览|展厅/.test(s)) return "gallery";
  if (/博物|museum/.test(s)) return "museum";
  if (/影院|电影|cinema/.test(s)) return "cinema";
  if (/spa|按摩|理疗|汤泉/.test(s)) return "spa";
  if (/寺|庙|教堂|道观/.test(s)) return "temple";
  if (/江|河|湖|海|滨|岸/.test(s)) return "river";
  if (/老街|弄堂|巷|胡同|街/.test(s)) return "street";
  if (/便利店|杂货|店/.test(s)) return "shop";
  return "default";
}

interface Props { kind: VenueKind; size?: number; className?: string; }

/**
 * Q-version venue icon, designed inside a 64x64 box.
 * All icons sit on a soft pastel cushion so they read at small sizes on the map.
 */
export function VenueIcon({ kind, size = 56, className }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={{ display: "block" }}
    >
      {renderIcon(kind)}
    </svg>
  );
}

function renderIcon(k: VenueKind) {
  switch (k) {
    case "cafe": return <Cafe />;
    case "bakery": return <Bakery />;
    case "dessert": return <Dessert />;
    case "bar": return <Bar />;
    case "noodle": return <Noodle />;
    case "restaurant": return <Restaurant />;
    case "market": return <Market />;
    case "bookstore": return <Bookstore />;
    case "flower": return <Flower />;
    case "plant": return <Plant />;
    case "park": return <Park />;
    case "gallery":
    case "museum": return <Museum />;
    case "cinema": return <Cinema />;
    case "spa": return <Spa />;
    case "temple": return <Temple />;
    case "river": return <River />;
    case "street": return <Street />;
    case "shop": return <Shop />;
    default: return <DefaultIcon />;
  }
}

/* ============ Shared building blocks ============ */
const Roof = ({ fill }: { fill: string }) => (
  <path d="M 12 26 L 32 12 L 52 26 Z" fill={fill} />
);
const Body = ({ fill }: { fill: string }) => (
  <rect x="14" y="26" width="36" height="24" rx="3" fill={fill} />
);
const Ground = () => (
  <ellipse cx="32" cy="54" rx="22" ry="3" fill="#000" opacity="0.08" />
);

/* ============ Specific icons ============ */
function Cafe() {
  return (
    <g>
      <Ground />
      <Roof fill="#c47a5b" />
      <Body fill="#f3e6d2" />
      <rect x="14" y="26" width="36" height="4" fill="#a86a4f" />
      {/* door */}
      <rect x="28" y="36" width="8" height="14" rx="1" fill="#7a5340" />
      {/* coffee cup window */}
      <rect x="17" y="33" width="9" height="9" rx="1" fill="#fff8e8" />
      <ellipse cx="21.5" cy="38" rx="3" ry="2" fill="#7a4a30" />
      <path d="M 24 36 q 2 1 0 3" stroke="#7a4a30" strokeWidth="0.8" fill="none" />
      {/* sign */}
      <rect x="38" y="33" width="9" height="6" rx="1" fill="#fff8e8" />
      <text x="42.5" y="37.5" textAnchor="middle" fontSize="4" fill="#7a4a30" fontFamily="serif">CAFÉ</text>
      {/* steam */}
      <path d="M 28 14 q 2 -3 0 -5 M 32 13 q 2 -3 0 -5 M 36 14 q 2 -3 0 -5" stroke="#c9c2b0" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Bakery() {
  return (
    <g>
      <Ground />
      <path d="M 10 28 Q 32 18 54 28 L 50 30 L 14 30 Z" fill="#e8a566" />
      <Body fill="#fff1d6" />
      <rect x="18" y="34" width="12" height="10" rx="1" fill="#fff8e8" />
      {/* bread */}
      <ellipse cx="24" cy="39" rx="4" ry="2.5" fill="#d49a5e" />
      <path d="M 21 39 q 3 -2 6 0" stroke="#a06a3a" strokeWidth="0.6" fill="none" />
      <rect x="34" y="34" width="12" height="10" rx="1" fill="#fff8e8" />
      <circle cx="40" cy="39" r="3" fill="#e8c97a" />
      <rect x="28" y="44" width="8" height="6" fill="#a86a4f" />
    </g>
  );
}

function Dessert() {
  return (
    <g>
      <Ground />
      {/* cake stand */}
      <rect x="18" y="44" width="28" height="3" rx="1.5" fill="#d8c8b8" />
      <rect x="30" y="47" width="4" height="5" fill="#d8c8b8" />
      {/* cake */}
      <rect x="22" y="32" width="20" height="12" rx="2" fill="#fff1d6" />
      <path d="M 22 36 q 5 -3 10 0 t 10 0 L 42 32 L 22 32 Z" fill="#f5b8c4" />
      {/* cherry */}
      <circle cx="32" cy="28" r="3" fill="#e85d6f" />
      <path d="M 32 25 q 1 -3 4 -4" stroke="#5d7846" strokeWidth="1" fill="none" />
      {/* sprinkles */}
      <circle cx="27" cy="39" r="0.8" fill="#e8c97a" />
      <circle cx="32" cy="40" r="0.8" fill="#a78bf0" />
      <circle cx="37" cy="39" r="0.8" fill="#7ec48b" />
    </g>
  );
}

function Bar() {
  return (
    <g>
      <Ground />
      <Body fill="#3d3a4a" />
      <Roof fill="#22202a" />
      <rect x="18" y="32" width="28" height="8" rx="1" fill="#f5b8c4" opacity="0.7" />
      <text x="32" y="38" textAnchor="middle" fontSize="5" fill="#fff8e8" fontFamily="serif" fontStyle="italic">Bar</text>
      <rect x="28" y="42" width="8" height="8" fill="#22202a" />
      {/* neon */}
      <circle cx="20" cy="22" r="1.5" fill="#f5b8c4" />
      <circle cx="44" cy="22" r="1.5" fill="#a78bf0" />
    </g>
  );
}

function Noodle() {
  return (
    <g>
      <Ground />
      {/* bowl */}
      <path d="M 12 32 Q 32 56 52 32 Z" fill="#d63a3a" />
      <path d="M 14 33 Q 32 50 50 33 Z" fill="#f5b8a0" />
      {/* noodles */}
      <path d="M 20 32 q 3 -6 6 0 t 6 0 t 6 0 t 6 0" stroke="#fff1d6" strokeWidth="1.5" fill="none" />
      <path d="M 22 30 q 3 -5 6 0 t 6 0 t 6 0" stroke="#fff8e8" strokeWidth="1.2" fill="none" />
      {/* egg */}
      <ellipse cx="28" cy="34" rx="3" ry="2.2" fill="#fff8e8" />
      <circle cx="28" cy="34" r="1.2" fill="#e8a73d" />
      {/* greens */}
      <circle cx="38" cy="33" r="1.5" fill="#5d7846" />
      {/* steam */}
      <path d="M 26 22 q 2 -3 0 -5 M 32 21 q 2 -3 0 -5 M 38 22 q 2 -3 0 -5" stroke="#c9c2b0" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Restaurant() {
  return (
    <g>
      <Ground />
      <Roof fill="#8c2a2a" />
      {/* eaves curl (Chinese tile feel) */}
      <path d="M 10 26 Q 12 22 16 26" stroke="#8c2a2a" strokeWidth="2" fill="none" />
      <path d="M 54 26 Q 52 22 48 26" stroke="#8c2a2a" strokeWidth="2" fill="none" />
      <Body fill="#fff1d6" />
      <rect x="28" y="34" width="8" height="16" fill="#8c2a2a" />
      <rect x="17" y="32" width="9" height="9" rx="1" fill="#fff8e8" />
      <rect x="38" y="32" width="9" height="9" rx="1" fill="#fff8e8" />
      <circle cx="32" cy="22" r="2.5" fill="#f5d68a" />
      <text x="32" y="44" textAnchor="middle" fontSize="5" fill="#8c2a2a" fontFamily="serif">食</text>
    </g>
  );
}

function Market() {
  return (
    <g>
      <Ground />
      {/* stripe canopy */}
      <path d="M 10 26 L 54 26 L 50 30 L 14 30 Z" fill="#e85d6f" />
      <path d="M 14 26 L 18 30 M 22 26 L 26 30 M 30 26 L 34 30 M 38 26 L 42 30 M 46 26 L 50 30" stroke="#fff8e8" strokeWidth="2" />
      <Body fill="#fff1d6" />
      {/* fruits */}
      <circle cx="22" cy="40" r="3" fill="#e8794a" />
      <circle cx="32" cy="40" r="3" fill="#7ec48b" />
      <circle cx="42" cy="40" r="3" fill="#e8c97a" />
      <rect x="16" y="44" width="32" height="6" fill="#a86a4f" />
    </g>
  );
}

function Bookstore() {
  return (
    <g>
      <Ground />
      <Roof fill="#5d7846" />
      <Body fill="#f3e6d2" />
      <rect x="18" y="32" width="28" height="14" fill="#a86a4f" />
      {/* books */}
      <rect x="20" y="34" width="3" height="10" fill="#e85d6f" />
      <rect x="23.5" y="34" width="3" height="10" fill="#e8c97a" />
      <rect x="27" y="34" width="3" height="10" fill="#a78bf0" />
      <rect x="30.5" y="34" width="3" height="10" fill="#7ec48b" />
      <rect x="34" y="34" width="3" height="10" fill="#f5b8c4" />
      <rect x="37.5" y="34" width="3" height="10" fill="#5d7846" />
      <rect x="41" y="34" width="3" height="10" fill="#c47a5b" />
      <text x="32" y="24" textAnchor="middle" fontSize="6" fill="#fff8e8" fontFamily="serif">书</text>
    </g>
  );
}

function Flower() {
  return (
    <g>
      <Ground />
      {/* vase */}
      <path d="M 22 36 L 24 50 L 40 50 L 42 36 Z" fill="#a8c7d6" />
      <rect x="20" y="34" width="24" height="4" rx="1" fill="#7ea8bd" />
      {/* stems */}
      <path d="M 28 36 q -2 -8 -2 -14 M 32 36 q 0 -10 0 -16 M 36 36 q 2 -8 2 -14" stroke="#5d7846" strokeWidth="1.2" fill="none" />
      {/* flowers */}
      <circle cx="26" cy="20" r="4" fill="#f5b8c4" />
      <circle cx="32" cy="16" r="4.5" fill="#e85d6f" />
      <circle cx="38" cy="20" r="4" fill="#e8c97a" />
      <circle cx="26" cy="20" r="1.5" fill="#fff8e8" />
      <circle cx="32" cy="16" r="1.5" fill="#fff8e8" />
      <circle cx="38" cy="20" r="1.5" fill="#fff8e8" />
      {/* leaves */}
      <ellipse cx="22" cy="30" rx="3" ry="1.5" fill="#7ec48b" transform="rotate(-20 22 30)" />
      <ellipse cx="42" cy="30" rx="3" ry="1.5" fill="#7ec48b" transform="rotate(20 42 30)" />
    </g>
  );
}

function Plant() {
  return (
    <g>
      <Ground />
      {/* pot */}
      <path d="M 22 38 L 24 50 L 40 50 L 42 38 Z" fill="#c47a5b" />
      <rect x="20" y="36" width="24" height="3" fill="#a86a4f" />
      {/* monstera leaves */}
      <path d="M 32 38 q -10 -8 -8 -20 q 8 4 8 14" fill="#5d7846" />
      <path d="M 32 38 q 10 -8 8 -20 q -8 4 -8 14" fill="#7ec48b" />
      <path d="M 32 38 q 0 -10 0 -22" stroke="#5d7846" strokeWidth="1.5" fill="none" />
    </g>
  );
}

function Park() {
  return (
    <g>
      <Ground />
      {/* big tree */}
      <rect x="30" y="34" width="4" height="14" fill="#7a5340" />
      <circle cx="32" cy="26" r="14" fill="#7ec48b" />
      <circle cx="24" cy="28" r="8" fill="#5d7846" />
      <circle cx="40" cy="28" r="8" fill="#88a36b" />
      {/* bench */}
      <rect x="14" y="46" width="10" height="2" fill="#7a5340" />
      <rect x="14" y="48" width="2" height="3" fill="#7a5340" />
      <rect x="22" y="48" width="2" height="3" fill="#7a5340" />
      <rect x="42" y="46" width="10" height="2" fill="#7a5340" />
      <rect x="42" y="48" width="2" height="3" fill="#7a5340" />
      <rect x="50" y="48" width="2" height="3" fill="#7a5340" />
    </g>
  );
}

function Museum() {
  return (
    <g>
      <Ground />
      <path d="M 8 26 L 32 12 L 56 26 Z" fill="#e8dcc6" />
      <rect x="12" y="26" width="40" height="4" fill="#d8c8b8" />
      {/* columns */}
      <rect x="16" y="30" width="3" height="18" fill="#fff8e8" />
      <rect x="24" y="30" width="3" height="18" fill="#fff8e8" />
      <rect x="32" y="30" width="3" height="18" fill="#fff8e8" />
      <rect x="40" y="30" width="3" height="18" fill="#fff8e8" />
      <rect x="48" y="30" width="3" height="18" fill="#fff8e8" />
      <rect x="12" y="48" width="40" height="3" fill="#d8c8b8" />
    </g>
  );
}

function Cinema() {
  return (
    <g>
      <Ground />
      <Body fill="#3d3a4a" />
      <rect x="18" y="30" width="28" height="14" rx="1" fill="#fff1d6" />
      <text x="32" y="40" textAnchor="middle" fontSize="8" fill="#3d3a4a" fontFamily="serif" fontWeight="bold">▶</text>
      <rect x="14" y="46" width="36" height="4" fill="#e8c97a" />
      <circle cx="20" cy="48" r="0.8" fill="#e85d6f" />
      <circle cx="26" cy="48" r="0.8" fill="#e85d6f" />
      <circle cx="32" cy="48" r="0.8" fill="#e85d6f" />
      <circle cx="38" cy="48" r="0.8" fill="#e85d6f" />
      <circle cx="44" cy="48" r="0.8" fill="#e85d6f" />
    </g>
  );
}

function Spa() {
  return (
    <g>
      <Ground />
      {/* bowl */}
      <path d="M 14 36 Q 32 56 50 36 Z" fill="#e8dcc6" />
      <path d="M 16 36 Q 32 50 48 36 Z" fill="#a8c7d6" />
      {/* lotus petals */}
      <ellipse cx="32" cy="34" rx="6" ry="3" fill="#f5b8c4" />
      <ellipse cx="28" cy="33" rx="4" ry="2.5" fill="#e85d6f" opacity="0.7" />
      <ellipse cx="36" cy="33" rx="4" ry="2.5" fill="#e85d6f" opacity="0.7" />
      <circle cx="32" cy="32" r="1.5" fill="#e8c97a" />
      {/* steam */}
      <path d="M 22 26 q 2 -3 0 -6 M 32 24 q 2 -3 0 -6 M 42 26 q 2 -3 0 -6" stroke="#c9c2b0" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Temple() {
  return (
    <g>
      <Ground />
      <path d="M 8 22 L 32 8 L 56 22 L 52 24 L 12 24 Z" fill="#8c2a2a" />
      <path d="M 10 22 Q 8 18 6 20 M 54 22 Q 56 18 58 20" stroke="#8c2a2a" strokeWidth="2" fill="none" />
      <Body fill="#d8a05a" />
      <path d="M 12 30 L 52 30 L 50 34 L 14 34 Z" fill="#8c2a2a" />
      <rect x="28" y="36" width="8" height="14" fill="#5d2a1a" />
      <circle cx="32" cy="44" r="0.8" fill="#e8c97a" />
    </g>
  );
}

function River() {
  return (
    <g>
      <Ground />
      <rect x="6" y="32" width="52" height="16" rx="3" fill="#a8c7d6" />
      <path d="M 10 36 q 6 -2 12 0 t 12 0 t 12 0 t 12 0" stroke="#fff8e8" strokeWidth="1" fill="none" />
      <path d="M 10 42 q 6 -2 12 0 t 12 0 t 12 0 t 12 0" stroke="#fff8e8" strokeWidth="1" fill="none" />
      {/* boat */}
      <path d="M 24 30 L 40 30 L 38 34 L 26 34 Z" fill="#7a5340" />
      <rect x="31" y="22" width="2" height="8" fill="#7a5340" />
      <path d="M 33 22 L 40 28 L 33 28 Z" fill="#fff8e8" />
    </g>
  );
}

function Street() {
  return (
    <g>
      <Ground />
      {/* lantern */}
      <rect x="31" y="10" width="2" height="6" fill="#7a5340" />
      <ellipse cx="32" cy="22" rx="6" ry="7" fill="#e85d6f" />
      <rect x="28" y="20" width="8" height="2" fill="#8c2a2a" />
      <rect x="28" y="24" width="8" height="2" fill="#8c2a2a" />
      <path d="M 32 29 L 32 32" stroke="#e8c97a" strokeWidth="1" />
      <path d="M 30 32 L 34 32" stroke="#e8c97a" strokeWidth="1" />
      {/* path */}
      <path d="M 8 50 L 56 50 L 48 36 L 16 36 Z" fill="#d8c8b8" />
      <path d="M 16 36 L 48 36 M 12 43 L 52 43" stroke="#a86a4f" strokeWidth="0.5" strokeDasharray="3 3" />
    </g>
  );
}

function Shop() {
  return (
    <g>
      <Ground />
      <Roof fill="#5d7846" />
      <Body fill="#fff1d6" />
      <rect x="14" y="26" width="36" height="3" fill="#3d3a4a" />
      <rect x="18" y="32" width="28" height="12" rx="1" fill="#fff8e8" />
      <text x="32" y="40" textAnchor="middle" fontSize="6" fill="#3d3a4a" fontFamily="serif">店</text>
      <rect x="14" y="44" width="36" height="6" fill="#a86a4f" />
    </g>
  );
}

function DefaultIcon() {
  return (
    <g>
      <Ground />
      <Roof fill="#a78bf0" />
      <Body fill="#fff1d6" />
      <rect x="28" y="36" width="8" height="14" rx="1" fill="#7a5340" />
      <circle cx="22" cy="36" r="3" fill="#f5b8c4" />
      <circle cx="42" cy="36" r="3" fill="#e8c97a" />
    </g>
  );
}
