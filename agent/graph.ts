/**
 * LangGraph Graph 构建
 * 参考设计文档 5.3 图构建 + 5.4 并行优化
 *
 * 流程：
 *   START
 *     │
 *     ├── fetch_profile (并行)
 *     └── resolve_location (并行)
 *           │
 *           ▼
 *       plan_pois (Agent 1)
 *           │
 *           ▼
 *       validate_pois
 *           │
 *           ▼
 *       generate_journey (Agent 2)
 *           │
 *           ▼
 *          END
 */

import { StateGraph, START, END } from "@langchain/langgraph";
import { QuestState } from "./state";
import {
  fetchProfile,
  resolveLocation,
  planPois,
  validatePois,
  generateJourney,
} from "./nodes";

// ===== Graph 构建 =====

const workflow = new StateGraph(QuestState)
  // ===== 添加节点 =====
  .addNode("fetch_profile", fetchProfile)
  .addNode("resolve_location", resolveLocation)
  .addNode("plan_pois", planPois)
  .addNode("validate_pois", validatePois)
  .addNode("generate_journey", generateJourney)

  // ===== 并行入口（从 START 同时触发两个节点）=====
  .addEdge(START, "fetch_profile")
  .addEdge(START, "resolve_location")

  // ===== 汇合点（两个并行节点都完成后，进入 plan_pois）=====
  .addEdge("fetch_profile", "plan_pois")
  .addEdge("resolve_location", "plan_pois")

  // ===== 顺序流程 =====
  .addEdge("plan_pois", "validate_pois")
  .addEdge("validate_pois", "generate_journey")
  .addEdge("generate_journey", END);

// ===== 编译 Graph =====

export const questGraph = workflow.compile();

// ===== 执行函数 =====

import type { PersonaCard, Journey } from "./state";

export interface QuestInput {
  card: PersonaCard;
  city?: string;
  lat?: number;
  lng?: number;
  playerKey?: string;
  timePeriod?: string;
  companion?: string;
}

export interface QuestOutput {
  journey: Journey | undefined;
  city: string;
  poiCount: number;
  keywords: string[];
  error?: string;
}

/**
 * 执行完整的 Quest 流程
 */
export async function runQuest(input: QuestInput): Promise<QuestOutput> {
  const initialState = {
    card: input.card,
    city: input.city || "上海",
    lat: input.lat,
    lng: input.lng,
    playerKey: input.playerKey,
    timePeriod: input.timePeriod || "下午",
    companion: input.companion || "独行",

    // 初始状态
    playerProfile: undefined,
    gcjCoords: undefined,
    poiKeywords: [],
    poiCandidates: [],
    journey: undefined,
    error: undefined,
  };

  console.log("[Quest] 开始执行，人设:", input.card.identity);

  try {
    const result = await questGraph.invoke(initialState);

    console.log("[Quest] 执行完成，场景数:", result.journey?.scenes?.length || 0);

    return {
      journey: result.journey,
      city: result.city,
      poiCount: result.poiCandidates.length,
      keywords: result.poiKeywords,
      error: result.error,
    };
  } catch (e) {
    console.error("[Quest] 执行失败:", e);
    return {
      journey: undefined,
      city: input.city || "上海",
      poiCount: 0,
      keywords: [],
      error: String(e),
    };
  }
}
