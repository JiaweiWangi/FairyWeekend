/**
 * LangChain LLM Client 统一入口
 * 根据环境变量 LLM_PROVIDER 选择供应商
 *
 * 使用方式：
 *   import { createLLM } from "./llmClient/langchain-client.ts";
 *   const llm = createLLM();
 *   const llmWithSchema = llm.withStructuredOutput(schema);
 *   const result = await llmWithSchema.invoke(messages);
 *
 * 环境变量：
 *   LLM_PROVIDER=lovable | openai | deepseek
 *   LOVABLE_API_KEY=xxx
 *   OPENAI_API_KEY=xxx
 */

import { ChatLovable } from "./langchain-lovable.ts";
import { ChatOpenAI } from "./langchain-openai.ts";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

// 环境变量读取（兼容 Node.js 和 Deno）
const getEnv = (key: string): string | undefined => {
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }
  // @ts-ignore
  if (typeof Deno !== "undefined") {
    // @ts-ignore
    return Deno.env.get(key);
  }
  return undefined;
};

// 供应商类型
export type LLMProvider = "lovable" | "openai" | "deepseek";

/**
 * 创建 LangChain 兼容的 LLM 客户端
 */
export function createLLM(provider?: LLMProvider): BaseChatModel {
  const selectedProvider = provider || (getEnv("LLM_PROVIDER") as LLMProvider) || "lovable";

  console.log(`[LLM] 使用供应商: ${selectedProvider}`);

  switch (selectedProvider) {
    case "lovable":
      return new ChatLovable({
        apiKey: getEnv("LOVABLE_API_KEY"),
        baseUrl: getEnv("LOVABLE_BASE_URL"),
        model: getEnv("LOVABLE_MODEL") || "google/gemini-2.5-flash",
      });

    case "openai":
      console.log(`[LLM] OpenAI Model: ${getEnv("OPENAI_MODEL") || "gpt-4o-mini"}`);
      return new ChatOpenAI({
        apiKey: getEnv("OPENAI_API_KEY"),
        baseUrl: getEnv("OPENAI_BASE_URL"),
        model: getEnv("OPENAI_MODEL") || "gpt-4o-mini",
      });

    default:
      console.warn(`[LLM] 未知供应商 "${selectedProvider}"，回退到 Lovable`);
      return new ChatLovable();
  }
}

// 导出类和类型
export { ChatLovable, ChatOpenAI };
