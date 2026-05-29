/**
 * LangGraph Nodes 实现
 * 节点编排层，调用 agents 和 tools
 */

import type { QuestStateType } from "./state.ts";
import {
  getPlayerProfileTool,
  reverseGeocodeTool,
} from "./tools/index.ts";
import { runPOIPlanner } from "./agents/poi-planner.agent.ts";
import { runStoryGenerator } from "./agents/story-generator.agent.ts";

// ===== 日志工具 =====

function log(node: string, message: string, data?: unknown) {
  const timestamp = new Date().toISOString().split("T")[1].slice(0, 12);
  const prefix = `[${timestamp}][${node}]`;
  if (data !== undefined) {
    console.log(prefix, message, typeof data === "object" ? JSON.stringify(data, null, 2) : data);
  } else {
    console.log(prefix, message);
  }
}

function logWarn(node: string, message: string, error?: unknown) {
  const timestamp = new Date().toISOString().split("T")[1].slice(0, 12);
  console.warn(`[${timestamp}][${node}]`, message, error ?? "");
}

// ===== Node 1: fetchProfile =====

/**
 * 获取玩家画像
 * 并行节点，与 resolveLocation 同时执行
 */
export async function fetchProfile(state: QuestStateType) {
  log("fetchProfile", "🚀 开始执行");

  if (!state.playerKey) {
    log("fetchProfile", "⏭️ 无 playerKey，跳过");
    return { playerProfile: undefined };
  }

  log("fetchProfile", "📥 获取玩家画像...", { playerKey: state.playerKey });

  try {
    const result = await getPlayerProfileTool.invoke({
      playerKey: state.playerKey,
    });

    // 工具返回 JSON 字符串，需要解析
    const profile = typeof result === "string" ? JSON.parse(result) : result;

    log("fetchProfile", "✅ 成功获取画像", {
      profile: profile.profile?.slice(0, 50) + "...",
      loved_tags: profile.loved_tags?.slice(0, 5),
      disliked_tags: profile.disliked_tags?.slice(0, 5),
      visited_count: profile.visited_pois?.length || 0,
    });

    return { playerProfile: profile };
  } catch (e) {
    logWarn("fetchProfile", "❌ 获取失败", e);
    return { playerProfile: undefined };
  }
}

// ===== Node 2: resolveLocation =====

/**
 * 坐标转换 + 逆地理编码
 * 并行节点，与 fetchProfile 同时执行
 */
export async function resolveLocation(state: QuestStateType) {
  log("resolveLocation", "🚀 开始执行");

  if (typeof state.lat !== "number" || typeof state.lng !== "number") {
    log("resolveLocation", "⏭️ 无坐标，跳过");
    return { gcjCoords: undefined };
  }

  log("resolveLocation", "📥 转换坐标...", {
    wgs84: { lng: state.lng, lat: state.lat },
  });

  try {
    const result = await reverseGeocodeTool.invoke({
      lat: state.lat,
      lng: state.lng,
    });

    // 工具返回 JSON 字符串，需要解析
    const geo = typeof result === "string" ? JSON.parse(result) : result;

    if (geo.error) {
      logWarn("resolveLocation", "❌ 逆地理编码失败", geo.error);
      return { gcjCoords: undefined };
    }

    log("resolveLocation", "✅ 成功解析位置", {
      city: geo.city,
      district: geo.district,
      label: geo.label,
      gcj: geo.gcj,
    });

    return {
      gcjCoords: geo.gcj,
      city: state.city || geo.label,
    };
  } catch (e) {
    logWarn("resolveLocation", "❌ 解析失败", e);
    return { gcjCoords: undefined };
  }
}

// ===== Node 3: planPois (调用 Agent 1) =====

/**
 * 分析人设 + 搜索 POI
 * 调用 poi-planner.agent
 */
export async function planPois(state: QuestStateType) {
  log("planPois", "🚀 开始执行");

  log("planPois", "📋 输入参数", {
    identity: state.card.identity,
    mood: state.card.mood,
    mission: state.card.mission,
    rarity: state.card.rarity,
    city: state.city,
    hasProfile: !!state.playerProfile,
    hasCoords: !!state.gcjCoords,
  });

  const startTime = Date.now();

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

  const elapsed = Date.now() - startTime;

  log("planPois", "✅ Agent 执行完成", {
    elapsed: `${elapsed}ms`,
    keywordsCount: result.keywords.length,
    candidatesCount: result.candidates.length,
    keywords: result.keywords,
  });

  if (result.candidates.length > 0) {
    log("planPois", "📍 候选 POI 示例", result.candidates.slice(0, 3).map(p => ({
      name: p.name,
      type: p.type,
      address: p.address?.slice(0, 30),
    })));
  }

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
  log("validatePois", "🚀 开始执行");

  // 确保 poiCandidates 是数组
  const poiCandidates = state.poiCandidates || [];
  const types = new Set(poiCandidates.map((p) => p.type));

  log("validatePois", "📊 统计信息", {
    total: poiCandidates.length,
    typesCount: types.size,
    types: Array.from(types),
  });

  const warnings: string[] = [];

  if (poiCandidates.length < 10) {
    warnings.push(`候选不足 (${poiCandidates.length}/10)`);
  }

  if (types.size < 2) {
    warnings.push(`类型单一 (${types.size}/2)`);
  }

  if (warnings.length > 0) {
    logWarn("validatePois", "⚠️ 验证警告", warnings.join(", "));
  } else {
    log("validatePois", "✅ 验证通过");
  }

  return {};
}

// ===== Node 5: generateJourney (调用 Agent 2) =====

/**
 * 生成叙事路线
 * 调用 story-generator.agent
 */
export async function generateJourney(state: QuestStateType) {
  log("generateJourney", "🚀 开始执行");

  // 确保 poiCandidates 是数组
  const poiCandidates = state.poiCandidates || [];

  log("generateJourney", "📋 输入参数", {
    identity: state.card.identity,
    candidatesCount: poiCandidates.length,
    timePeriod: state.timePeriod,
    companion: state.companion,
  });

  const startTime = Date.now();

  const journey = await runStoryGenerator({
    card: {
      identity: state.card.identity,
      mood: state.card.mood,
      mission: state.card.mission,
      rarity: state.card.rarity,
    },
    poiCandidates: poiCandidates,
    timePeriod: state.timePeriod,
    companion: state.companion,
  });

  const elapsed = Date.now() - startTime;

  if (!journey) {
    logWarn("generateJourney", "❌ 生成失败");
    return {
      journey: undefined,
      error: "生成失败",
    };
  }

  log("generateJourney", "✅ Agent 执行完成", {
    elapsed: `${elapsed}ms`,
    scenesCount: journey.scenes.length,
    emotionArc: journey.emotion_arc,
  });

  log("generateJourney", "📖 故事开篇", journey.story_opening?.slice(0, 100) + "...");

  log("generateJourney", "🎬 场景列表", journey.scenes.map(s => ({
    order: s.order,
    scene_name: s.scene_name,
    location: s.location_name,
    emotion: s.emotion_tags,
  })));

  return {
    journey,
    error: undefined,
  };
}
