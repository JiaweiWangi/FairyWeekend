/**
 * Agent 2: 故事生成师
 * 职责：基于候选 POI，生成完整的叙事路线
 *
 * 参考 CrewAI 设计原则：
 * - role + goal + backstory → System Prompt
 * - temperature: 0.7（创意任务，稍高温度）
 * - 无工具（纯创作，输入已准备好）
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import type { POI } from "../tools/index";
import type { Journey, JourneyScene } from "../state";

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
5. 整条路线要有情绪弧线`;

// ===== LLM 初始化 =====

const storyGenerator = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.7,
});

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

  if (poiCandidates.length === 0) {
    console.error("[storyGenerator] 无候选 POI，无法生成");
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

  const llmWithSchema = storyGenerator.withStructuredOutput(journeySchema);

  try {
    const result = await llmWithSchema.invoke([
      { role: "system", content: STORY_GENERATOR_PROMPT },
      { role: "user", content: userPrompt },
    ]);

    console.log("[storyGenerator] 成功，场景数:", result.scenes.length);
    console.log("[storyGenerator] 开篇:", result.story_opening.slice(0, 50) + "...");

    return result as Journey;
  } catch (e) {
    console.error("[storyGenerator] 失败:", e);
    return null;
  }
}
