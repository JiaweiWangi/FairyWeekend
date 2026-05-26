/**
 * LLM Client - 封装 Lovable AI Gateway 调用
 * 支持普通对话和 JSON 结构化输出
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface JSONSchema {
  name: string;
  schema: Record<string, any>;
  strict?: boolean;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface JSONOptions extends ChatOptions {
  schema: JSONSchema;
}

/**
 * LLM 客户端
 */
export class LLMClient {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(options?: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  }) {
    this.apiKey = options?.apiKey || Deno.env.get("LOVABLE_API_KEY") || "";
    this.baseUrl = options?.baseUrl || "https://ai.gateway.lovable.dev/v1";
    this.defaultModel = options?.model || "google/gemini-2.5-flash";

    if (!this.apiKey) {
      console.warn("[LLMClient] 警告: 未配置 LOVABLE_API_KEY 环境变量");
    }
  }

  /**
   * 发送聊天请求
   */
  async chat(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<string> {
    const { model = this.defaultModel, temperature = 0.7, maxTokens } = options || {};

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        ...(maxTokens && { max_tokens: maxTokens }),
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`LLM API 错误 (${res.status}): ${error}`);
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "";
  }

  /**
   * 发送聊天请求，返回 JSON
   */
  async chatJSON<T = any>(
    messages: ChatMessage[],
    options: JSONOptions
  ): Promise<T> {
    const { model = this.defaultModel, temperature = 0.7, schema } = options;

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: schema.name,
            strict: schema.strict ?? true,
            schema: schema.schema,
          },
        },
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`LLM API 错误 (${res.status}): ${error}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";

    try {
      return typeof content === "string" ? JSON.parse(content) : content;
    } catch (e) {
      throw new Error(`JSON 解析失败: ${content.slice(0, 100)}...`);
    }
  }

  /**
   * 便捷方法：单轮对话
   */
  async ask(
    prompt: string,
    systemPrompt?: string,
    options?: ChatOptions
  ): Promise<string> {
    const messages: ChatMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });
    return this.chat(messages, options);
  }

  /**
   * 便捷方法：单轮对话，返回 JSON
   */
  async askJSON<T = any>(
    prompt: string,
    schema: JSONSchema,
    systemPrompt?: string,
    options?: Omit<JSONOptions, "schema">
  ): Promise<T> {
    const messages: ChatMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });
    return this.chatJSON<T>(messages, { ...options, schema });
  }
}

/**
 * 创建默认客户端实例
 */
export function createLLMClient(): LLMClient {
  return new LLMClient();
}
