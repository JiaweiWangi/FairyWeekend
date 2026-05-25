/**
 * LangGraph Nodes 实现
 * 节点编排层，调用 agents 和 tools
 */

import type { QuestStateType } from "./state";
import {
  getPlayerProfileTool,
  reverseGeocodeTool,
  type PlayerProfile,
} from "./tools/index";
import { runPOIPlanner } from "./agents/poi-planner.agent";
import { runStoryGenerator } from "./agents/story-generator.agent";

// ===== Node 1: fetchProfile =====

/**
 * 获取玩家画像
 * 并行节点，与 resolveLocation 同时执行
 */
export async function fetchProfile(state: QuestStateType) {
  if (!state.playerKey) {
    console.log("[fetchProfile] 无 playerKey，跳过");
    return { playerProfile: undefined };
  }

  console.log("[fetchProfile] 获取玩家画像:", state.playerKey);

  try {
    const result = await getPlayerProfileTool.invoke({
      playerKey: state.playerKey,
    });
    const profile: PlayerProfile = JSON.parse(result);

    console.log(
      "[fetchProfile] 成功，喜欢标签:",
      profile.loved_tags.slice(0, 3).join(", ")
    );

    return { playerProfile: profile };
  } catch (e) {
    console.warn("[fetchProfile] 失败:", e);
    return { playerProfile: undefined };
  }
}

// ===== Node 2: resolveLocation =====

/**
 * 坐标转换 + 逆地理编码
 * 并行节点，与 fetchProfile 同时执行
 */
export async function resolveLocation(state: QuestStateType) {
  if (typeof state.lat !== "number" || typeof state.lng !== "number") {
    console.log("[resolveLocation] 无坐标，跳过");
    return { gcjCoords: undefined };
  }

  console.log("[resolveLocation] 转换坐标:", state.lng, state.lat);

  try {
    const result = await reverseGeocodeTool.invoke({
      lat: state.lat,
      lng: state.lng,
    });
    const geo = JSON.parse(result);

    if (geo.error) {
      console.warn("[resolveLocation] 逆地理编码失败");
      return { gcjCoords: undefined };
    }

    console.log("[resolveLocation] 成功，城市:", geo.label);

    return {
      gcjCoords: geo.gcj,
      city: state.city || geo.label,
    };
  } catch (e) {
    console.warn("[resolveLocation] 失败:", e);
    return { gcjCoords: undefined };
  }
}

// ===== Node 3: planPois (调用 Agent 1) =====

/**
 * 分析人设 + 搜索 POI
 * 调用 poi-planner.agent
 */
export async function planPois(state: QuestStateType) {
  console.log("[planPois] 调用 poiPlanner...");

  const result = await runPOIPlanner({
    card: {
      identity: state.card.identity,
      mood: state.card.mood,
      mission: state.card.mission,
      rarity: state.card.rarity,
    },
    city: state.city,
    timePeriod: state.timePeriod,
    playerProfile: state.playerProfile,
    gcjCoords: state.gcjCoords,
  });

  return {
    poiKeywords: result.keywords,
    poiCandidates: result.candidates,
  };
}

// ===== Node 4: validatePois =====

/**
 * 验证候选 POI
 * 简单验证，失败只记录警告，不重试
 */
export async function validatePois(state: QuestStateType) {
  const { poiCandidates } = state;

  console.log("[validatePois] 验证候选 POI...");

  const warnings: string[] = [];

  if (poiCandidates.length < 10) {
    warnings.push(`候选不足 (${poiCandidates.length}/10)`);
  }

  const types = new Set(poiCandidates.map((p) => p.type));
  if (types.size < 2) {
    warnings.push(`类型单一 (${types.size}/2)`);
  }

  if (warnings.length > 0) {
    console.warn("[validatePois] 警告:", warnings.join(", "));
  } else {
    console.log("[validatePois] 验证通过");
  }

  return {};
}

// ===== Node 5: generateJourney (调用 Agent 2) =====

/**
 * 生成叙事路线
 * 调用 story-generator.agent
 */
export async function generateJourney(state: QuestStateType) {
  console.log("[generateJourney] 调用 storyGenerator...");

  const journey = await runStoryGenerator({
    card: {
      identity: state.card.identity,
      mood: state.card.mood,
      mission: state.card.mission,
      rarity: state.card.rarity,
    },
    poiCandidates: state.poiCandidates,
    timePeriod: state.timePeriod,
    companion: state.companion,
  });

  if (!journey) {
    return {
      journey: undefined,
      error: "生成失败",
    };
  }

  return {
    journey,
    error: undefined,
  };
}