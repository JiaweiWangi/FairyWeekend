import type { PersonaCard, Rarity } from "./persona-types";
import cover001 from "@/assets/persona/card_001.png";
import cover002 from "@/assets/persona/card_002.png";
import cover003 from "@/assets/persona/card_003.png";
import cover004 from "@/assets/persona/card_004.png";
import cover005 from "@/assets/persona/card_005.png";
import cover006 from "@/assets/persona/card_006.png";

const COVERS: Record<string, string> = {
  card_001: cover001,
  card_002: cover002,
  card_003: cover003,
  card_004: cover004,
  card_005: cover005,
  card_006: cover006,
};

const _PERSONA_CARDS_BASE: PersonaCard[] = [
  {
    id: "card_001",
    rarity: "SR",
    identity: "在异乡漂泊的植物学家",
    mood: "对城市重新感到好奇",
    mission: "寻找三种让你感到安心的气味",
    colors: ["#f0e6d3", "#8fbc8f", "#d4a896"],
    illustration_keyword: "botanical_wanderer",
  },
  {
    id: "card_002",
    rarity: "N",
    identity: "喜欢在家的人，今天破例出门",
    mood: "有点懒，但想被惊喜",
    mission: "找一个让你想多坐一会儿的地方",
    colors: ["#faf0e6", "#deb887", "#f5deb3"],
    illustration_keyword: "cozy_homebody",
  },
  {
    id: "card_003",
    rarity: "SSR",
    identity: "刚从长期隐居中回归人间的人",
    mood: "对一切感到新鲜和陌生",
    mission: "和一个陌生人说一句话",
    colors: ["#e8e0f0", "#b19cd9", "#f8f0ff"],
    illustration_keyword: "returning_wanderer",
  },
  {
    id: "card_004",
    rarity: "R",
    identity: "在城市里寻找野生感的人",
    mood: "有点燥，需要出口",
    mission: "走进一条没走过的街，走到尽头为止",
    colors: ["#f0f4e8", "#7fb069", "#e8f0d8"],
    illustration_keyword: "urban_wanderer",
  },
  {
    id: "card_005",
    rarity: "SR",
    identity: "刚失恋三天，决定重新爱上生活的人",
    mood: "脆弱但在修复",
    mission: "给自己买一样平时舍不得买的东西",
    colors: ["#fce4ec", "#f48fb1", "#fdf0f5"],
    illustration_keyword: "healing_soul",
  },
  {
    id: "card_006",
    rarity: "SSR",
    identity: "某个平行宇宙里选择留在这座城市的你",
    mood: "带着遗憾，也带着释然",
    mission: "去一个「如果当初留下来会常去」的地方",
    colors: ["#e8eaf6", "#9fa8da", "#ede7f6"],
    illustration_keyword: "parallel_self",
  },
  {
    id: "card_007",
    rarity: "R",
    identity: "把今天当作最后一个周末的人",
    mood: "珍惜，有点感性",
    mission: "拍下三张「值得被记住」的画面",
    colors: ["#fff8e1", "#ffcc80", "#fff3e0"],
    illustration_keyword: "last_weekend",
  },
  {
    id: "card_008",
    rarity: "N",
    identity: "想假装自己是本地人的外地人",
    mood: "好奇，有点紧张",
    mission: "去一家没有英文菜单的小馆子吃饭",
    colors: ["#e0f2f1", "#80cbc4", "#e8f5e9"],
    illustration_keyword: "local_pretender",
  },
];

export const PERSONA_CARDS: PersonaCard[] = _PERSONA_CARDS_BASE.map((c) => ({
  ...c,
  cover: COVERS[c.id],
}));

// 抽卡权重（百分比，合计 100）
const RARITY_WEIGHTS: Record<Rarity, number> = {
  N: 50,
  R: 30,
  SR: 15,
  SSR: 5,
};

export function drawCard(exclude?: string): PersonaCard {
  // 按稀有度先抽稀有度，再从该稀有度内随机一张
  const roll = Math.random() * 100;
  let acc = 0;
  let chosen: Rarity = "N";
  for (const r of ["N", "R", "SR", "SSR"] as Rarity[]) {
    acc += RARITY_WEIGHTS[r];
    if (roll < acc) { chosen = r; break; }
  }
  let pool = PERSONA_CARDS.filter((c) => c.rarity === chosen);
  if (exclude) pool = pool.filter((c) => c.id !== exclude);
  if (pool.length === 0) pool = PERSONA_CARDS.filter((c) => c.rarity === chosen);
  return pool[Math.floor(Math.random() * pool.length)];
}

export const RARITY_LABEL: Record<Rarity, string> = {
  N: "Normal",
  R: "Rare",
  SR: "Super Rare",
  SSR: "Super Super Rare",
};
