/**
 * LangChain 兼容的 OpenAI LLM Client
 * 继承 BaseChatModel，支持 .withStructuredOutput()、.bindTools() 等
 *
 * 注意：LangChain 官方已有 @langchain/openai 的 ChatOpenAI
 * 此文件提供自定义实现，支持自定义 baseUrl（代理）
 *
 * 使用方式：
 *   import { ChatOpenAI } from "./langchain-openai.ts";
 *   const llm = new ChatOpenAI();
 *   const result = await llm.invoke(messages);
 *
 * 环境变量：
 *   OPENAI_API_KEY=sk-xxx
 *   OPENAI_MODEL=gpt-4o-mini (可选)
 *   OPENAI_BASE_URL=https://api.openai.com/v1 (可选)
 */

import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { BaseMessage, AIMessageChunk } from "@langchain/core/messages";
import { ChatResult, ChatGenerationChunk } from "@langchain/core/outputs";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";

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

export interface ChatOpenAIInput {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * OpenAI - LangChain 兼容客户端
 */
export class ChatOpenAI extends BaseChatModel {
  lc_serializable = true;
  lc_namespace = ["chat", "openai"];

  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private temperature: number;
  private maxTokens?: number;

  constructor(fields?: ChatOpenAIInput) {
    super(fields);

    this.apiKey = fields?.apiKey || getEnv("OPENAI_API_KEY") || "";
    this.baseUrl = fields?.baseUrl || getEnv("OPENAI_BASE_URL") || "https://api.openai.com/v1";
    this.model = fields?.model || getEnv("OPENAI_MODEL") || "gpt-4o-mini";
    this.temperature = fields?.temperature ?? 0.7;
    this.maxTokens = fields?.maxTokens;

    if (!this.apiKey) {
      console.warn("[ChatOpenAI] 警告: 未配置 OPENAI_API_KEY 环境变量");
    }
  }

  _llmType(): string {
    return "openai";
  }

  /**
   * 核心生成方法
   */
  async _generate(
    messages: BaseMessage[],
    options?: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    const formattedMessages = this._formatMessages(messages);

    const body: Record<string, any> = {
      model: this.model,
      messages: formattedMessages,
      temperature: this.temperature,
    };

    if (this.maxTokens) {
      body.max_tokens = this.maxTokens;
    }

    // 处理 response_format
    if (options?.response_format) {
      body.response_format = options.response_format;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API 错误 (${response.status}): ${error}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const tokenUsage = data?.usage;

    return {
      generations: [
        {
          text: content,
          message: new AIMessageChunk(content),
        },
      ],
      llmOutput: {
        tokenUsage: tokenUsage
          ? {
              promptTokens: tokenUsage.prompt_tokens,
              completionTokens: tokenUsage.completion_tokens,
              totalTokens: tokenUsage.total_tokens,
            }
          : undefined,
      },
    };
  }

  /**
   * 流式生成
   */
  async *_stream(
    messages: BaseMessage[],
    options?: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<ChatGenerationChunk> {
    const formattedMessages = this._formatMessages(messages);

    const body: Record<string, any> = {
      model: this.model,
      messages: formattedMessages,
      temperature: this.temperature,
      stream: true,
    };

    if (this.maxTokens) {
      body.max_tokens = this.maxTokens;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API 错误 (${response.status}): ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed?.choices?.[0]?.delta?.content;
            if (content) {
              yield new ChatGenerationChunk({
                text: content,
                message: new AIMessageChunk(content),
              });
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  }

  /**
   * 格式化消息为 OpenAI 格式
   */
  private _formatMessages(messages: BaseMessage[]): Array<{ role: string; content: string }> {
    return messages.map((msg) => ({
      role: msg._getType() === "human" ? "user" :
            msg._getType() === "ai" ? "assistant" :
            msg._getType(),
      content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
    }));
  }

  /**
   * 绑定结构化输出
   * OpenAI 支持 json_schema（gpt-4o 及以上）
   */
  withStructuredOutput<T extends Record<string, any>>(
    schema: T,
    config?: { name?: string; strict?: boolean }
  ) {
    const responseFormat = {
      type: "json_schema",
      json_schema: {
        name: config?.name || "response",
        strict: config?.strict ?? true,
        schema: schema,
      },
    };

    return this.bind({ response_format: responseFormat });
  }

  /**
   * 获取模型标识
   */
  get modelId(): string {
    return this.model;
  }
}
