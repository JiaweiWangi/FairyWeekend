/**
 * Agent 1: POI 规划师
 * 职责：分析人设卡，决定搜索什么类型的地点，并收集候选 POI
 *
 * 使用 createReactAgent 实现 ReAct 模式：
 * - Agent 自主决定调用哪些工具、调用多少次
 * - 工具：search_poi, get_player_profile, reverse_geocode
 */

import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { createLLM } from "../langchianClient/index";
import {
  searchPoiTool,
  getPlayerProfileTool,
  reverseGeocodeTool,
  type POI,
  type PlayerProfile,
} from "../tools/index";

// ===== 日志工具 =====

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString().split("T")[1].slice(0, 12);
  const prefix = `[${timestamp}][poiPlanner]`;
  if (data !== undefined) {
    console.log(prefix, message, typeof data === "object" ? JSON.stringify(data, null, 2) : data);
  } else {
    console.log(prefix, message);
  }
}

// ===== System Prompt（对应 CrewAI role + goal + backstory）=====

export const POI_PLANNER_PROMPT = `你是一位城市探索规划师。

你的目标是：根据用户的人设卡和偏好，找到 15-25 个适合的城市场景候选地点。

你的背景：
- 深谙城市肌理，擅长从人的情绪和身份出发找到有故事的角落
- 你知道：植物学家看咖啡馆和普通人看咖啡馆是完全不同的
- 偏爱有故事感的日常空间，避开网红打卡点

规则：
1. 从人设的 identity、mood、mission 出发推断适合的地点类型
2. 考虑玩家的历史偏好（如果有）
3. 稀有度越高，地点越隐秘、越反直觉
4. 使用 search_poi 工具搜索，可以多次调用不同关键词
5. 最终返回 15-25 个候选地点`;

// ===== 创建 Agent =====

log("🤖 初始化 Agent...");

const llm = createLLM();

export const poiPlannerAgent = createReactAgent({
  llm,
  tools: [searchPoiTool, getPlayerProfileTool, reverseGeocodeTool],
  prompt: POI_PLANNER_PROMPT,
});

log("✅ Agent 初始化完成");

// ===== 输入参数 =====

export interface POIPlannerInput {
  card: {
    identity: string;
    mood: string;
    mission: string;
    rarity: string;
  };
  city: string;
  timePeriod: string;
  playerProfile?: PlayerProfile;
  gcjCoords?: { lng: number; lat: number };
}

// ===== 输出结果 =====

export interface POIPlannerOutput {
  keywords: string[];
  reasoning: string;
  candidates: POI[];
}

// ===== 执行函数 =====

export async function runPOIPlanner(input: POIPlannerInput): Promise<POIPlannerOutput> {
  const { card, city, timePeriod, playerProfile, gcjCoords } = input;

  log("🚀 开始执行 POI 规划");

  const coords = gcjCoords || { lng: 121.4737, lat: 31.2304 }; // 默认上海

  // 构建用户提示
  const userPrompt = `人设身份：${card.identity}
人设状态：${card.mood}
人设使命：${card.mission}
稀有度：${card.rarity}

城市：${city}
时间段：${timePeriod}
坐标：经度 ${coords.lng}，纬度 ${coords.lat}

${playerProfile ? `
玩家画像：${playerProfile.profile}
喜欢的标签：${playerProfile.loved_tags.join("、")}
不喜欢的标签：${playerProfile.disliked_tags.join("、")}
去过的地方：${playerProfile.visited_pois.slice(0, 10).join("、")}
` : ""}

请分析这个人设今天应该去什么类型的地点，使用 search_poi 工具搜索并收集 15-25 个候选。`;

  log("📝 构建提示完成", {
    identity: card.identity,
    city,
    hasProfile: !!playerProfile,
    coords,
  });

  try {
    log("⚡ 调用 createReactAgent...");

    const startTime = Date.now();

    // 调用 createReactAgent
    const result = await poiPlannerAgent.invoke({
      messages: [{ role: "user", content: userPrompt }],
    });

    const elapsed = Date.now() - startTime;
    log(`⏱️ Agent 执行耗时: ${elapsed}ms`);

    // 打印消息历史
    const messages = result.messages || [];
    log(`📬 收到 ${messages.length} 条消息`);

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const type = msg.constructor?.name || typeof msg;
      const content = typeof msg.content === "string"
        ? msg.content?.slice(0, 200)
        : JSON.stringify(msg.content)?.slice(0, 200);

      if (msg.tool_calls?.length) {
        log(`  📨 [${i}] ${type} - 工具调用`, msg.tool_calls.map((tc: any) => ({
          name: tc.name,
          args: tc.args,
        })));
      } else if (msg.name) {
        log(`  📨 [${i}] ${type} - 工具返回 (${msg.name})`, content?.slice(0, 100));
      } else {
        log(`  📨 [${i}] ${type}`, content?.slice(0, 100));
      }
    }

    // 从结果中提取 POI 候选
    const candidates = extractPOIsFromResult(result);

    log(`✅ 提取完成，共 ${candidates.length} 个候选 POI`);

    if (candidates.length > 0) {
      log("📍 POI 分布", {
        types: [...new Set(candidates.map(p => p.type))],
        sample: candidates.slice(0, 3).map(p => p.name),
      });
    }

    return {
      keywords: [], // Agent 自主搜索，无预设关键词
      reasoning: "Agent 自主调用工具搜索",
      candidates,
    };
  } catch (e) {
    log(`❌ Agent 执行失败: ${e}`);
    console.error(e);
    return {
      keywords: [],
      reasoning: "Agent 执行失败",
      candidates: [],
    };
  }
}

// ===== 辅助函数：从 Agent 结果中提取 POI =====

function extractPOIsFromResult(result: unknown): POI[] {
  const pois: POI[] = [];
  const messages = (result as { messages: unknown[] }).messages || [];

  for (const msg of messages) {
    // 检查是否是 ToolMessage
    const content = (msg as { content: unknown }).content;
    if (Array.isArray(content)) {
      // 工具返回的是 POI 数组
      for (const item of content) {
        if (item && typeof item === "object" && "name" in item && "location" in item) {
          pois.push(item as POI);
        }
      }
    }
  }

  // 去重（按 location）
  const seen = new Set<string>();
  return pois.filter((p) => {
    if (seen.has(p.location)) return false;
    seen.add(p.location);
    return true;
  });
}
