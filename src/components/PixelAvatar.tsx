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
  // 山系疗愈师：徒步者+背包，绿色户外配色
  山系疗愈师: {
    palette: { ...BASE, h: "#4a3220", b: "#3a6a3a", a: "#8a5a2a", g: "#c4a36a" },
    pixels: [
      "................",
      ".....kkkkkk.....",
      "....khhhhhhk....",
      "...khhhhhhhhk...",
      "...khssssshhk...",
      "...kssksksshk...",
      "...kssssssssk...",
      "....ksskksk.....",
      "....kbbbbbk.....",
      "...kbaaaaabk....",
      "...kbaaaaabk....",
      "...kbaaaaabk....",
      "...kbbbbbbbk....",
      "...kbb.bbbk.....",
      "...kss.kssk.....",
      "...kk...kk......",
    ],
  },
  // 市井觅食家：厨师帽+围裙，暖橙配色，手里像端着碗
  市井觅食家: {
    palette: { ...BASE, h: "#1a1a2e", b: "#c44a2a", a: "#f0e0c4", g: "#e8c46a" },
    pixels: [
      "................",
      "....waaaaaaw....",
      "...waaaaaaaaw...",
      "....kkkkkkkk....",
      "...khhhhhhhhk...",
      "...khssssshhk...",
      "...kssksksshk...",
      "...kssssssssk...",
      "....ksskksk.....",
      "...kbbbbbbbk....",
      "..kbaaaaaaabk...",
      "..kbaggggggbk...",
      "..kbaaaaaaabk...",
      "...kbbbbbbbk....",
      "...kbb.bbbk.....",
      "...kk...kk......",
    ],
  },
  // 慢调策展人：诗人/读书人，紫调
  慢调策展人: {
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
  // 夜行漫游者：连帽衫+月亮符文，深蓝紫调
  夜行漫游者: {
    palette: { ...BASE, h: "#1a1a3e", b: "#2a2a5e", a: "#e8c46a", g: "#a0b0e0" },
    pixels: [
      "................",
      "....hhhhhhhh....",
      "...hhhhhhhhhh...",
      "..hhhhhhhhhhhh..",
      "..hhssssssshhh..",
      "..hssksksssshh..",
      "..hssssssssshh..",
      "...ksskkksk.....",
      "...kbbbbbbbk.aa.",
      "..kbbbbbbbbbka..",
      "..kbbgbbbgbbbk..",
      "..kbbbbbbbbbk...",
      "..kbbbbbbbbbk...",
      "...kbb.bbbk.....",
      "...kss.kssk.....",
      "...kk...kk......",
    ],
  },
  // 社区烟火家：穿外套提灯笼的居家者，暖红黄调
  社区烟火家: {
    palette: { ...BASE, h: "#3a2820", b: "#a85040", a: "#e8a060", g: "#f0d878" },
    pixels: [
      "................",
      ".....kkkkkk.....",
      "....khhhhhhk....",
      "...khhhhhhhhk...",
      "...khssssshhk...",
      "...kssksksshk...",
      "...kssssssssk...",
      "....ksskksk.....",
      "...kbbbbbbbk.gg.",
      "..kbaaaaaaabkggg",
      "..kbaaaaaaabk.gg",
      "..kbbbbbbbbbk.k.",
      "..kbbbbbbbbbk.k.",
      "...kbb.bbbk...k.",
      "...kaa.kaak..kk.",
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
