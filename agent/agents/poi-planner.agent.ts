/**
 * Agent 1: POI 规划师
 * 职责：分析人设卡，决定搜索什么类型的地点，并收集候选 POI
 *
 * 参考 CrewAI 设计原则：
 * - role + goal + backstory → System Prompt
 * - temperature: 0.3（任务明确，不需随机性）
 * - 3 个工具（符合"3-5 个"原则）
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import type { PlayerProfile, POI } from "../tools/index";
import { searchPoisParallel } from "../tools/index";

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
4. 输出 3-5 个搜索关键词，我会用这些关键词搜索真实地点`;

// ===== LLM 初始化 =====

const poiPlanner = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.3,
});

// ===== 输出 Schema =====

const poiKeywordsSchema = z.object({
  keywords: z.array(z.string()).min(3).max(5).describe("搜索关键词列表"),
  reasoning: z.string().describe("决策理由"),
});

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

  // Step 1: LLM 分析人设，输出搜索关键词
  const userPrompt = `人设身份：${card.identity}
人设状态：${card.mood}
人设使命：${card.mission}
稀有度：${card.rarity}

城市：${city}
时间段：${timePeriod}

${playerProfile ? `
玩家画像：${playerProfile.profile}
喜欢的标签：${playerProfile.loved_tags.join("、")}
不喜欢的标签：${playerProfile.disliked_tags.join("、")}
去过的地方：${playerProfile.visited_pois.slice(0, 10).join("、")}
` : ""}

请分析这个人设今天应该去什么类型的地点，输出 3-5 个搜索关键词。`;

  const llmWithSchema = poiPlanner.withStructuredOutput(poiKeywordsSchema);

  let keywords: string[];
  let reasoning: string;

  try {
    const result = await llmWithSchema.invoke([
      { role: "system", content: POI_PLANNER_PROMPT },
      { role: "user", content: userPrompt },
    ]);
    keywords = result.keywords;
    reasoning = result.reasoning;
    console.log("[poiPlanner] 关键词:", keywords.join(", "));
    console.log("[poiPlanner] 理由:", reasoning.slice(0, 100));
  } catch (e) {
    console.warn("[poiPlanner] LLM 调用失败，使用默认关键词:", e);
    keywords = ["咖啡馆", "公园", "书店", "餐厅"];
    reasoning = "LLM 调用失败，使用默认关键词";
  }

  // Step 2: 并行搜索 POI
  const coords = gcjCoords || { lng: 121.4737, lat: 31.2304 }; // 默认上海

  const candidates = await searchPoisParallel(keywords, {
    lng: coords.lng,
    lat: coords.lat,
    radius: 3000,
    excludePois: playerProfile?.visited_pois || [],
  });

  console.log(`[poiPlanner] 找到 ${candidates.length} 个候选 POI`);

  return { keywords, reasoning, candidates };
}
