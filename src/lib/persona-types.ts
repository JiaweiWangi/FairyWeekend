export type Rarity = "N" | "R" | "SR" | "SSR";

export interface PersonaCard {
  id: string;
  rarity: Rarity;
  identity: string;          // 身份
  mood: string;              // 今日状态
  mission: string;           // 今日使命
  colors: string[];          // 卡片配色（3 色）
  illustration_keyword: string;
}

export interface JourneyScene {
  order: number;
  scene_name: string;            // 诗意命名
  location_name: string;
  location_type: string;
  location_hint: string;
  persona_narrative: string;     // 人设视角叙事
  action_task: string;           // 具体行动
  stay_minutes: number;
  emotion_tags: string[];
  meituan_keyword: string;
}

export interface Journey {
  story_opening: string;
  emotion_arc: { start: string; end: string };
  scenes: JourneyScene[];
  closing: string;
}

export interface JourneyRunState {
  card: PersonaCard;
  city?: string;
  journey: Journey;
  completedSceneOrders: number[];
  createdAt: number;
}
