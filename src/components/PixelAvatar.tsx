import type { CharacterClass } from "@/lib/quest-types";

// 16x16 pixel art per character. Each string row = 16 chars.
// Legend: . transparent  | k outline (dark)  | s skin  | h hair  | a accent  | b body  | g gold  | w white
type Palette = Record<string, string>;

const BASE: Palette = {
  k: "#0d0d18",
  s: "#f4d6b0",
  w: "#f8f5e8",
};

interface Sprite {
  pixels: string[];
  palette: Palette;
}

const SPRITES: Record<CharacterClass, Sprite> = {
  游荡诗人: {
    palette: { ...BASE, h: "#3a2f4a", b: "#6b4a8a", a: "#d4a84a", g: "#e8c46a" },
    pixels: [
      "................",
      ".....kkkkkk.....",
      "....khhhhhhk....",
      "...khhhhhhhhk...",
      "...khssssshhk...",
      "...kssksksshk...",
      "...kssssssssk...",
      "....ksskksk.....",
      ".....kssk.......",
      "....kbbbbk......",
      "...kbbabbbk.....",
      "...kbbabbbk..gg.",
      "...kbbabbbk.gkg.",
      "...kbb.bbbk.gkg.",
      "...kss.kssk..g..",
      "...kk...kk......",
    ],
  },
  边境游侠: {
    palette: { ...BASE, h: "#4a3220", b: "#3a5a3a", a: "#8a6a3a", g: "#c4a36a" },
    pixels: [
      "................",
      ".....kkkkkk.....",
      "....khhhhhhk....",
      "...khhhhhhhhk...",
      "...khssssshhk...",
      "...kssksksshk...",
      "...kssssssssk...",
      "....ksskksk.....",
      "....kbbbbbk.aaa.",
      "...kbabababk.a..",
      "...kbabababk.a..",
      "...kbabababk.a..",
      "...kbabababk.a..",
      "...kbb.bbbk..a..",
      "...kss.kssk..a..",
      "...kk...kk...a..",
    ],
  },
  失忆法师: {
    palette: { ...BASE, h: "#d8d4c8", b: "#2a4a8a", a: "#e8c46a", g: "#c4d8f0" },
    pixels: [
      "........k.......",
      ".......kak......",
      "......kaaak.....",
      ".....kaaaaak....",
      "....kkkkkkkk....",
      "...khhhhhhhhk...",
      "...khssssshhk...",
      "...kssksksshk...",
      "...kssssssssk...",
      "....ksskksk.....",
      "...kbbbbbbbk....",
      "..kbgbbbbbgbk.k.",
      "..kbbbbbbbbbk.k.",
      "..kbbbbbbbbbk.k.",
      "...kbb.bbbk...k.",
      "...kk...kk....k.",
    ],
  },
  归家骑士: {
    palette: { ...BASE, h: "#3a2820", b: "#a0a8b0", a: "#5a6068", g: "#e8c46a" },
    pixels: [
      "................",
      "....kkkkkkkk....",
      "...kaaaaaaaak...",
      "...khssssshhk...",
      "...kssksksshk...",
      "...kssssssssk...",
      "....ksskksk.....",
      "...kbbbbbbbk....",
      "..kbbggggbbbk...",
      "..kbgbbbbbgbk...",
      "..kbbbbbbbbbk...",
      "..kbbbbbbbbbk.k.",
      "...kbbbbbbbk..k.",
      "...kbb.bbbk...k.",
      "...kaa.kaak..kk.",
      "...kk...kk....k.",
    ],
  },
  混沌术士: {
    palette: { ...BASE, h: "#1a1a2e", b: "#5a2a6a", a: "#e84a8a", g: "#f0e84a" },
    pixels: [
      "................",
      "....kkkkkkkk....",
      "...khhhhhhhhk...",
      "..khhaaaaahhhk..",
      "..khhssssshhhk..",
      "..khssksksshhk..",
      "..khssssssssk...",
      "...ksskksk......",
      "...kbbgbbbk.....",
      "..kbgbgbbgbk....",
      "..kbbbgbbbbk.gg.",
      "..kbbbbbbbbk.gg.",
      "..kbbbbbbbbk..g.",
      "...kbb.bbbk..g..",
      "...ks..kssk.g...",
      "...kk...kk......",
    ],
  },
};

export function PixelAvatar({
  character,
  size = 96,
  className,
}: {
  character: CharacterClass;
  size?: number;
  className?: string;
}) {
  const sprite = SPRITES[character];
  const grid = 16;
  const cell = size / grid;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${grid} ${grid}`}
      shapeRendering="crispEdges"
      className={className}
      aria-label={character}
    >
      {sprite.pixels.map((row, y) =>
        row.split("").map((ch, x) => {
          if (ch === ".") return null;
          const fill = sprite.palette[ch] ?? "#fff";
          return (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1.02}
              height={1.02}
              fill={fill}
            />
          );
        }),
      )}
      {/* base shadow */}
      <ellipse
        cx={grid / 2}
        cy={grid - 0.3}
        rx={3.5}
        ry={0.5}
        fill="#000"
        opacity="0.35"
      />
      <style>{`svg { image-rendering: pixelated; }`}</style>
      {/* invisible — just to silence unused cell var */}
      <rect width="0" height="0" x={cell * 0} />
    </svg>
  );
}
