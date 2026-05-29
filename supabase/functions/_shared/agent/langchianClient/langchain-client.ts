/**
 * LangChain LLM Client 统一入口
 * 根据环境变量 LLM_PROVIDER 选择供应商
 *
 * 使用方式：
 *   import { createLLM } from "./langchain-client.ts";
 *   const llm = createLLM();
 *   const llmWithSchema = llm.withStructuredOutput(schema);
 *   const result = await llmWithSchema.invoke(messages);
 *
 * 环境变量：
 *   LLM_PROVIDER=openai
 *   OPENAI_API_KEY=xxx
 *   OPENAI_BASE_URL=https://... (可选)
 *   OPENAI_MODEL=gpt-4o-mini (可选)
 */

import { ChatOpenAI } from "@langchain/openai";
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
export type LLMProvider = "openai" | "deepseek" | "qwen";

/**
 * 创建 LangChain 兼容的 LLM 客户端
 */
export function createLLM(provider?: LLMProvider): BaseChatModel {
  const selectedProvider = provider || (getEnv("LLM_PROVIDER") as LLMProvider) || "openai";

  console.log(`[LLM] 使用供应商: ${selectedProvider}`);

  const apiKey = getEnv("OPENAI_API_KEY");
  const baseUrl = getEnv("OPENAI_BASE_URL");
  const model = getEnv("OPENAI_MODEL") || "gpt-4o-mini";

  console.log(`[LLM] Model: ${model}`);
  if (baseUrl) {
    console.log(`[LLM] Base URL: ${baseUrl}`);
  }

  // 统一使用 ChatOpenAI（支持 OpenAI 协议）
  return new ChatOpenAI({
    apiKey,
    configuration: baseUrl ? { baseURL: baseUrl } : undefined,
    model,
    temperature: 0.7,
    modelKwargs: {
      enable_thinking: false,
    },
  });
}

// 导出
export { ChatOpenAI };
