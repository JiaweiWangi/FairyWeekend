/**
 * Agent 2: 故事生成师
 * 职责：基于候选 POI，生成完整的叙事路线
 *
 * 纯 LLM 调用 + withStructuredOutput：
 * - 无工具，输入已由 poiPlanner 准备好
 * - temperature: 0.7（创意任务，稍高温度）
 */

import { z } from "zod";
import { createLLM } from "../langchianClient/index.ts";
import type { POI } from "../tools/index.ts";
import type { Journey, JourneyScene } from "../state.ts";

// ===== 日志工具 =====

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString().split("T")[1].slice(0, 12);
  const prefix = `[${timestamp}][storyGenerator]`;
  if (data !== undefined) {
    console.log(prefix, message, typeof data === "object" ? JSON.stringify(data, null, 2) : data);
  } else {
    console.log(prefix, message);
  }
}

// ===== System Prompt（对应 CrewAI role + goal + backstory）=====

export const STORY_GENERATOR_PROMPT = `你是「今日人设」的故事引擎。

你的目标是：将真实地点编织成一段有情绪弧线的城市故事。

你的背景：
- 擅长用第二人称叙事
- 知道好的周末不是打卡清单，而是一段有起承转合的故事
- 文字克制但有温度，像朋友在耳边轻声建议
- 总是给具体行动指引，不模糊说"感受氛围"

规则：
1. 从候选地点中选择 3-4 个，地理上能走通
2. 每个场景从人设的第一视角叙事
3. scene_name 是诗意命名（6-10字）
4. action_task 必须具体可执行
5. 整条路线要有情绪弧线

请以 JSON 格式输出结果。`;

// ===== LLM 初始化 =====

log("🤖 初始化 LLM...");

const storyGenerator = createLLM();

log("✅ LLM 初始化完成");

// ===== 输出 Schema =====

const journeySchema = z.object({
  story_opening: z.string().describe("故事开篇（30-50字）"),
  emotion_arc: z.object({
    start: z.string().describe("起始情绪"),
    end: z.string().describe("结束情绪"),
  }),
  scenes: z
    .array(
      z.object({
        order: z.number().describe("场景序号"),
        scene_name: z.string().describe("诗意命名（6-10字）"),
        location_name: z.string().describe("地点名称"),
        location_type: z.string().describe("地点类型"),
        location_hint: z.string().describe("地址提示"),
        persona_narrative: z.string().describe("人设视角叙事"),
        action_task: z.string().describe("具体行动"),
        stay_minutes: z.number().describe("停留时长（分钟）"),
        emotion_tags: z.array(z.string()).describe("情绪标签"),
        meituan_keyword: z.string().describe("美团搜索关键词"),
      })
    )
    .min(3)
    .max(4),
  closing: z.string().describe("故事结语（60-100字）"),
});

// ===== 输入参数 =====

export interface StoryGeneratorInput {
  card: {
    identity: string;
    mood: string;
    mission: string;
    rarity: string;
  };
  poiCandidates: POI[];
  timePeriod: string;
  companion: string;
}

// ===== 执行函数 =====

export async function runStoryGenerator(input: StoryGeneratorInput): Promise<Journey | null> {
  const { card, poiCandidates, timePeriod, companion } = input;

  log("🚀 开始执行故事生成");

  if (poiCandidates.length === 0) {
    log("❌ 无候选 POI，无法生成");
    return null;
  }

  // 格式化候选地点
  const candidatesText = poiCandidates
    .slice(0, 20)
    .map((p, i) => `${i + 1}. ${p.name} | ${p.type} | ${p.address}`)
    .join("\n");

  const userPrompt = `人设身份：${card.identity}
人设状态：${card.mood}
人设使命：${card.mission}
稀有度：${card.rarity}

候选地点（必须从中选择 3-4 个）：
${candidatesText}

时间段：${timePeriod}
同伴：${companion}

请生成一条完整的城市剧情路线。`;

  log("📝 构建提示完成", {
    identity: card.identity,
    candidatesCount: poiCandidates.length,
    timePeriod,
    companion,
  });

  const llmWithSchema = storyGenerator.withStructuredOutput(journeySchema);

  try {
    log("⚡ 调用 LLM (流式输出)...");

    const startTime = Date.now();
    const messages = [
      { role: "system", content: STORY_GENERATOR_PROMPT },
      { role: "user", content: userPrompt },
    ];

    // 先流式输出，显示进度
    let fullContent = "";
    let lastLogTime = 0;

    for await (const chunk of await storyGenerator.stream(messages)) {
      const content = chunk.content;
      if (typeof content === "string") {
        fullContent += content;
        // 每 500ms 打印一次进度
        const now = Date.now();
        if (now - lastLogTime > 500) {
          log(`📝 生成中... (${fullContent.length} 字符)`);
          lastLogTime = now;
        }
      }
    }

    log(`📝 生成完成，共 ${fullContent.length} 字符`);

    const elapsed = Date.now() - startTime;
    log(`⏱️ LLM 执行耗时: ${elapsed}ms`);

    // 解析 JSON
    let result;
    try {
      // 清理可能的 markdown 代码块
      let cleaned = fullContent.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.slice(7);
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith("```")) {
        cleaned = cleaned.slice(0, -3);
      }
      cleaned = cleaned.trim();

      result = JSON.parse(cleaned);
    } catch (parseError) {
      log(`❌ JSON 解析失败，尝试用 withStructuredOutput 重试...`);
      // 回退到 withStructuredOutput
      const llmWithSchema = storyGenerator.withStructuredOutput(journeySchema);
      result = await llmWithSchema.invoke(messages);
    }

    log("✅ 生成完成", {
      scenesCount: result.scenes?.length || 0,
      emotionArc: result.emotion_arc,
    });

    log("📖 故事开篇", result.story_opening?.slice(0, 100) + "...");

    log("🎬 场景列表", result.scenes?.map((s: any) => ({
      order: s.order,
      scene_name: s.scene_name,
      location: s.location_name,
      action: s.action_task?.slice(0, 30),
      emotion: s.emotion_tags,
    })));

    log("📜 故事结语", result.closing?.slice(0, 100) + "...");

    return result as Journey;
  } catch (e) {
    log(`❌ LLM 执行失败: ${e}`);
    console.error(e);
    return null;
  }
}
