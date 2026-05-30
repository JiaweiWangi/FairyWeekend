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
import { createLLM } from "../langchianClient/index.ts";
import {
  searchPoiTool,
  getPlayerProfileTool,
  reverseGeocodeTool,
  type POI,
  type PlayerProfile,
} from "../tools/index.ts";

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

## 目标
根据用户的人设卡和偏好，找到 15 个左右适合的城市场景候选地点。

## 专业背景
- 深谙城市肌理，擅长从人的情绪和身份出发找到有故事的角落
- 你知道：植物学家看咖啡馆和普通人看咖啡馆是完全不同的
- 偏爱有故事感的日常空间，避开网红打卡点

## 工作流程（必须严格遵循）
1. 分析人设的 identity、mood、mission，推断适合的地点类型
2. 考虑玩家的历史偏好（如果有）
3. 根据稀有度调整地点隐秘程度
4. 调用 search_poi 工具，一次传入 3-5 个关键词数组（如 ['独立咖啡馆', '小众公园', '独立书店', '花店', '艺术空间']）
5. 完成搜索后，直接回复用户，列出候选地点

## 停止条件
- 调用 search_poi 工具 1 次即可（传入多个关键词）
- 收集到足够的地点信息后直接给出结果
- 不要多次调用工具，不要继续分析或追问

## 输出格式
完成搜索后，用以下格式回复：
---
已为你找到以下候选地点：
1. [地点名称] - [类型] - [推荐理由]
2. ...
---`;

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
  const userPrompt = `请为以下人设规划今天的城市探索路线：

**人设信息**
- 身份：${card.identity}
- 状态：${card.mood}
- 使命：${card.mission}
- 稀有度：${card.rarity}

**环境信息**
- 城市：${city}
- 时间段：${timePeriod}
- 坐标：经度 ${coords.lng}，纬度 ${coords.lat}

${playerProfile ? `**玩家偏好**
- 画像：${playerProfile.profile}
- 喜欢的标签：${playerProfile.loved_tags.join("、")}
- 不喜欢的标签：${playerProfile.disliked_tags.join("、")}
- 去过的地方：${playerProfile.visited_pois.slice(0, 10).join("、")}
` : ""}
请立即开始搜索，完成后直接给出结果。`;

  log("📝 构建提示完成", {
    identity: card.identity,
    city,
    hasProfile: !!playerProfile,
    coords,
  });

  try {
    log("⚡ 调用 createReactAgent (流式模式)...");

    const startTime = Date.now();
    let stepCount = 0;

    // 使用 stream 模式，实时打印调用信息，同时收集最终结果
    // 设置 recursionLimit 防止无限循环
    const stream = await poiPlannerAgent.stream(
      {
        messages: [{ role: "user", content: userPrompt }],
      },
      {
        recursionLimit: 10, // 一次调用即可，降低限制
      }
    );

    let finalState: any = null;

    for await (const chunk of stream) {
      stepCount++;

      // chunk 是一个对象，键是节点名
      for (const [nodeName, nodeOutput] of Object.entries(chunk)) {
        // 打印节点名
        const output = nodeOutput as any;

        // 如果是数组，取最后一条消息
        if (Array.isArray(output)) {
          const lastMsg = output[output.length - 1];
          if (lastMsg) {
            // id 可能是数组或字符串，安全处理
            const msgType = Array.isArray(lastMsg.id)
              ? lastMsg.id.join(".")
              : (lastMsg.id || lastMsg.type || "unknown");
            log(`🔄 步骤 ${stepCount} | 节点: ${nodeName} | 消息类型: ${msgType}`);

            // 工具调用
            if (lastMsg.kwargs?.tool_calls?.length) {
              const tools = lastMsg.kwargs.tool_calls.map((tc: any) => tc.name);
              log(`  🔧 LLM 调用工具: ${tools.join(", ")}`);
            }

            // 工具返回
            if (lastMsg.kwargs?.name) {
              const toolName = lastMsg.kwargs.name;
              const content = typeof lastMsg.kwargs.content === "string"
                ? lastMsg.kwargs.content.slice(0, 200)
                : "...";
              log(`  📥 工具返回 (${toolName}): ${content}`);
            }

            // LLM 文本回复
            if (lastMsg.kwargs?.content && typeof lastMsg.kwargs.content === "string" && !lastMsg.kwargs?.name && !lastMsg.kwargs?.tool_calls) {
              log(`  💬 LLM 回复: ${lastMsg.kwargs.content.slice(0, 200)}`);
            }
          }
        }
      }

      // 保存最终状态（每次更新，最终得到完整状态）
      finalState = chunk;
    }

    const elapsed = Date.now() - startTime;
    log(`⏱️ Agent 执行耗时: ${elapsed}ms, 共 ${stepCount} 步`);

    // 调试：打印 finalState 的结构
    log(`🔍 finalState 类型: ${typeof finalState}`);
    if (finalState) {
      const keys = Object.keys(finalState);
      log(`🔍 finalState 键: ${keys.join(", ")}`);
      if (finalState.messages) {
        log(`🔍 messages 数量: ${finalState.messages.length}`);
      }
    }

    // 从流式结果的最终状态中提取 POI 候选（无需再次调用 invoke）
    const candidates = extractPOIsFromResult(finalState);

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
    const content = (msg as { content: unknown }).content;

    if (typeof content === "string") {
      try {
        const parsed = JSON.parse(content);

        // 新格式：{ pois: POI[], searchedKeywords: string[] }
        if (parsed && Array.isArray(parsed.pois)) {
          for (const item of parsed.pois) {
            if (item && typeof item === "object" && "name" in item && "location" in item) {
              pois.push(item as POI);
            }
          }
        }
        // 兼容旧格式：直接是数组
        else if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && typeof item === "object" && "name" in item && "location" in item) {
              pois.push(item as POI);
            }
          }
        }
      } catch {
        // 解析失败，跳过
      }
    }
    // 兼容数组格式
    else if (Array.isArray(content)) {
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
