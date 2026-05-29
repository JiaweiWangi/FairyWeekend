/**
 * LLM Client 模块入口
 *
 * 两套客户端：
 * 1. 轻量客户端（非 LangChain）：llm, LovableClient, OpenAIClient
 * 2. LangChain 兼容客户端：createLLM, ChatLovable, ChatOpenAI
 */

// ===== LangChain 兼容客户端（推荐）=====
export { createLLM, ChatLovable, ChatOpenAI } from "./langchain-client.ts";
export type { LLMProvider } from "./langchain-client.ts";

// ===== 轻量客户端（无依赖）=====
export { llm, LovableClient as SimpleLovableClient, OpenAIClient as SimpleOpenAIClient } from "./client.ts";
export type { ILLMClient, ChatMessage, JSONSchema, ChatOptions, JSONOptions } from "./client.ts";
