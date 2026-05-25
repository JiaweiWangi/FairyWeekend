/**
 * LangGraph State 定义
 * 参考设计文档 5.1 状态定义
 */

import { Annotation } from "@langchain/langgraph";
import type { POI, PlayerProfile } from "./tools/index";

// ===== 类型定义 =====

/**
 * 人设卡
 */
export interface PersonaCard {
  id: string;
  rarity: "N" | "R" | "SR" | "SSR";
  identity: string;    // 身份
  mood: string;        // 今日状态
  mission: string;     // 今日使命
  colors: string[];    // 卡片配色
  illustration_keyword: string;
  cover?: string;
}

/**
 * 场景
 */
export interface JourneyScene {
  order: number;
  scene_name: string;        // 诗意命名
  location_name: string;
  location_type: string;
  location_hint: string;
  persona_narrative: string; // 人设视角叙事
  action_task: string;       // 具体行动
  stay_minutes: number;
  emotion_tags: string[];
  meituan_keyword: string;
}

/**
 * 路线
 */
export interface Journey {
  story_opening: string;
  emotion_arc: {
    start: string;
    end: string;
  };
  scenes: JourneyScene[];
  closing: string;
}

/**
 * POI 关键词输出（Agent 1 的结构化输出）
 */
export interface POIKeywordsOutput {
  keywords: string[];    // 搜索关键词列表
  reasoning: string;     // 决策理由（调试用）
}

// ===== State 定义 =====

/**
 * QuestState - LangGraph 图状态
 *
 * 数据流：
 *   输入 → fetch_profile/resolve_location (并行) → plan_pois → generate_journey → 输出
 */
export const QuestState = Annotation.Root({
  // ===== 输入 =====
  /** 人设卡 */
  card: Annotation<PersonaCard>,

  /** 城市名称 */
  city: Annotation<string>,

  /** 用户纬度 (WGS84) */
  lat: Annotation<number | undefined>,

  /** 用户经度 (WGS84) */
  lng: Annotation<number | undefined>,

  /** 玩家唯一标识 */
  playerKey: Annotation<string | undefined>,

  /** 时间段：上午/下午/傍晚/晚上 */
  timePeriod: Annotation<string>,

  /** 同伴：独行/情侣/朋友/家人 */
  companion: Annotation<string>,

  // ===== 中间状态 =====
  /** 玩家画像（从 dm_memory 读取） */
  playerProfile: Annotation<PlayerProfile | undefined>,

  /** GCJ02 坐标（坐标转换后） */
  gcjCoords: Annotation<{ lng: number; lat: number } | undefined>,

  /** POI 搜索关键词（Agent 1 分析结果） */
  poiKeywords: Annotation<string[]>,

  /** 候选 POI 列表 */
  poiCandidates: Annotation<POI[]>,

  // ===== 输出 =====
  /** 最终生成的路线 */
  journey: Annotation<Journey | undefined>,

  /** 错误信息 */
  error: Annotation<string | undefined>,
});

// 导出 State 类型（用于 Node 函数参数）
export type QuestStateType = typeof QuestState.State;
