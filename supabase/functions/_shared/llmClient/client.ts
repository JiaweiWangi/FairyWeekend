/**
 * LLM Client 统一入口
 * 根据环境变量 LLM_PROVIDER 选择供应商
 *
 * 使用方式：
 *   import { llm } from "../../llmClient/client.ts";
 *   const result = await llm.askJSON(prompt, schema);
 *
 * 环境变量：
 *   LLM_PROVIDER=lovable | openai | deepseek | zhipu
 *   LOVABLE_API_KEY=xxx (当 LLM_PROVIDER=lovable)
 *   OPENAI_API_KEY=xxx (当 LLM_PROVIDER=openai)
 */

import { LLMClient as LovableClient } from "./lovable-client.ts";
import { LLMClient as OpenAIClient } from "./openai-client.ts";

// 供应商类型
type LLMProvider = "lovable" | "openai" | "deepseek" | "zhipu";

// 从环境变量读取供应商配置
const provider = (Deno.env.get("LLM_PROVIDER") as LLMProvider) || "lovable";

// 客户端接口（所有供应商都实现这个接口）
type ILLMClient = LovableClient | OpenAIClient;

/**
 * 创建 LLM 客户端实例
 * 根据环境变量选择对应的供应商实现
 */
function createClient(): ILLMClient {
  console.log(`[LLM] 使用供应商: ${provider}`);

  switch (provider) {
    case "lovable":
      return new LovableClient();

    case "openai":
      console.log(`[LLM] OpenAI 配置 - Model: ${Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini"}`);
      return new OpenAIClient({
        apiKey: Deno.env.get("OPENAI_API_KEY"),
        baseUrl: Deno.env.get("OPENAI_BASE_URL"),
        model: Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini",
        
      });

    case "deepseek":
      // TODO: 实现 DeepSeek 客户端
      console.warn("[LLM] DeepSeek 客户端未实现，回退到 OpenAI");
      return new OpenAIClient({
        baseUrl: "https://api.deepseek.com/v1",
        apiKey: Deno.env.get("DEEPSEEK_API_KEY"),
        model: "deepseek-chat",
      });

    case "zhipu":
      // TODO: 实现智谱客户端
      console.warn("[LLM] 智谱客户端未实现，回退到 Lovable");
      return new LovableClient();

    default:
      console.warn(`[LLM] 未知供应商 "${provider}"，回退到 Lovable`);
      return new LovableClient();
  }
}

// 导出统一的客户端实例
export const llm = createClient();

// 也导出类型和创建函数，方便需要自定义配置的场景
export { LovableClient, OpenAIClient };
export type { LLMProvider, ILLMClient };
