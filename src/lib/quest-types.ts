// Shared types for the DriftQuest app.

export type CharacterClass =
  | "游荡诗人"
  | "边境游侠"
  | "失忆法师"
  | "归家骑士"
  | "混沌术士";

export interface CharacterClassInfo {
  id: CharacterClass;
  emoji: string;
  emotion: string;
  domain: string;
  blurb: string;
}

export const CHARACTER_CLASSES: CharacterClassInfo[] = [
  {
    id: "游荡诗人",
    emoji: "🪶",
    emotion: "感性 · 漂泊 · 孤独",
    domain: "艺术区 · 街头 · 书店",
    blurb: "携带半本未写完的诗集，靠着街角的风押韵。",
  },
  {
    id: "边境游侠",
    emoji: "🏹",
    emotion: "野生感 · 冒险 · 躁动",
    domain: "城郊 · 市集 · 隐秘小店",
    blurb: "城市的边界就是他的猎场，越没人去越好。",
  },
  {
    id: "失忆法师",
    emoji: "📜",
    emotion: "迷茫 · 空白 · 需要答案",
    domain: "博物馆 · 古建筑 · 图书馆",
    blurb: "记忆掉了一半，需要在旧物里找回咒语。",
  },
  {
    id: "归家骑士",
    emoji: "🛡️",
    emotion: "疲惫 · 需要治愈 · 温暖",
    domain: "餐厅 · 公园 · 社区",
    blurb: "盔甲有点重，但还想再走最后一段路。",
  },
  {
    id: "混沌术士",
    emoji: "🎲",
    emotion: "无聊 · 什么都行 · 随便",
    domain: "随机生成 · 反直觉路线",
    blurb: "把骰子交给城市，听天由命。",
  },
];

export const EMOTION_CHIPS = [
  "蔫蔫的",
  "野生感",
  "需要被人间治愈",
  "想消失又舍不得",
  "混沌待机中",
  "莫名躁",
  "今天想被惊喜",
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
