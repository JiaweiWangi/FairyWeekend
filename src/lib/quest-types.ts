// Shared types for the DriftQuest app.

// 角色 = 今天想干啥的「生活意图」。名字保留 RPG 味，但每个都对应一种
// 真实的周末活动模式，用户一眼就知道"这是我今天想要的状态"。
export type CharacterClass =
  | "山系疗愈师"
  | "市井觅食家"
  | "慢调策展人"
  | "夜行漫游者"
  | "社区烟火家";

export interface CharacterClassInfo {
  id: CharacterClass;
  emoji: string;
  /** 一句话讲"这是哪种人 / 今天想干啥" */
  vibe: string;
  /** 情绪/状态关键词 */
  emotion: string;
  /** 活动场域 */
  domain: string;
  /** 角色独白 */
  blurb: string;
}

export const CHARACTER_CLASSES: CharacterClassInfo[] = [
  {
    id: "山系疗愈师",
    emoji: "🌲",
    vibe: "想出门走走，让风把脑子吹干净",
    emotion: "需要呼吸 · 想出汗 · 想发呆",
    domain: "公园 · 绿道 · 江边 · 城市山头",
    blurb: "不用真去登山，城里的一棵大树也算一座山头。",
  },
  {
    id: "市井觅食家",
    emoji: "🍜",
    vibe: "想被一口热的、地道的击中",
    emotion: "嘴馋 · 想被治愈 · 拒绝外卖",
    domain: "苍蝇馆 · 早市 · 夜市 · 老字号",
    blurb: "今天的快乐预算，全花在一碗面或一锅汤上。",
  },
  {
    id: "慢调策展人",
    emoji: "📖",
    vibe: "想安静坐着，被好看的东西包围",
    emotion: "想发呆 · 想被启发 · 拒绝吵闹",
    domain: "咖啡馆 · 独立书店 · 展览 · 博物馆",
    blurb: "一杯咖啡可以坐三小时，一本书可以翻一下午。",
  },
  {
    id: "夜行漫游者",
    emoji: "🌙",
    vibe: "白天太亮了，想躲进城市的夜里",
    emotion: "夜猫子 · 想热闹又想低调 · 不想睡",
    domain: "夜市 · 24h小店 · Live · 江边夜路",
    blurb: "霓虹亮起来之后，城市才真正属于你。",
  },
  {
    id: "社区烟火家",
    emoji: "🏮",
    vibe: "想被巷子口的人间味轻轻接住",
    emotion: "疲惫 · 想被治愈 · 想要慢一点",
    domain: "社区 · 老街 · 菜场 · 长椅 · 公园",
    blurb: "不用走太远，五百米内就有完整的人间。",
  },
];

export const EMOTION_CHIPS = [
  "蔫蔫的",
  "需要被治愈",
  "想出去走走",
  "嘴馋",
  "想安静一下",
  "想躲进夜里",
  "想被惊喜砸到",
];

export interface Stage {
  order: number;
  stage_name: string;
  location_name: string;
  location_type: string;
  location_hint: string;
  mission: string;
  dm_narrative: string;
  stay_minutes: number;
  emotion_tags: string[];
  unlock_words: string;
  transition: string;
  meituan_keyword: string;
}

export interface Quest {
  quest_name: string;
  quest_brief: string;
  emotion_arc: { start: string; end: string };
  stages: Stage[];
  completion_speech: string;
}

export interface QuestRunState {
  character: CharacterClass;
  emotion: string;
  weather?: string;
  time_period?: string;
  companion?: string;
  city?: string;
  quest: Quest;
  unlockedStageOrders: number[];
  createdAt: number;
}
