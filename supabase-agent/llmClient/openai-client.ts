/**
 * OpenAI LLM Client
 * 支持 GPT-4o 等模型
 *
 * 注意：OpenAI 不支持 json_schema，只支持 json_object 模式
 * 所以 JSON 输出时会在 system prompt 里加入格式要求
 *
 * 环境变量：
 *   OPENAI_API_KEY=sk-xxx
 *   OPENAI_MODEL=gpt-4o-mini (可选)
 *   OPENAI_BASE_URL=https://api.openai.com/v1 (可选，用于代理)
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
 * OpenAI LLM 客户端
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
    this.apiKey = options?.apiKey || Deno.env.get("OPENAI_API_KEY") || "";
    this.baseUrl = options?.baseUrl || Deno.env.get("OPENAI_BASE_URL") || "https://api.openai.com/v1";
    this.defaultModel = options?.model || Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

    if (!this.apiKey) {
      console.warn("[OpenAIClient] 警告: 未配置 OPENAI_API_KEY 环境变量");
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
      throw new Error(`OpenAI API 错误 (${res.status}): ${error}`);
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "";
  }

  /**
   * 发送聊天请求，返回 JSON
   * OpenAI 只支持 json_object 模式，不支持 json_schema
   * 所以在 system prompt 里加入 JSON 格式说明
   */
  async chatJSON<T = any>(
    messages: ChatMessage[],
    options: JSONOptions
  ): Promise<T> {
    const { model = this.defaultModel, temperature = 0.7, schema } = options;

    // 在 system prompt 里加入 JSON 格式要求
    const schemaHint = this.generateSchemaHint(schema);
    const enhancedMessages: ChatMessage[] = messages.map((m) => {
      if (m.role === "system") {
        return { ...m, content: `${m.content}\n\n${schemaHint}` };
      }
      return m;
    });

    // 如果没有 system message，加一个
    if (!enhancedMessages.some((m) => m.role === "system")) {
      enhancedMessages.unshift({ role: "system", content: schemaHint });
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: enhancedMessages,
        temperature,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`OpenAI API 错误 (${res.status}): ${error}`);
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
   * 根据 JSON Schema 生成提示文本
   */
  private generateSchemaHint(schema: JSONSchema): string {
    const props = schema.schema?.properties || {};
    const required = schema.schema?.required || [];

    const fields = Object.entries(props).map(([key, value]: [string, any]) => {
      const type = value.type || "any";
      const isRequired = required.includes(key);
      const items = value.items?.type ? ` of ${value.items.type}` : "";
      return `  - ${key}: ${type}${items}${isRequired ? " (必填)" : ""}`;
    });

    return `请输出 JSON 格式，包含以下字段：
${fields.join("\n")}

注意：必须输出合法的 JSON，不要包含任何其他文字。`;
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
