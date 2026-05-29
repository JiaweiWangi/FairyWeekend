/**
 * generate-quest-agent Edge Function
 * 使用 LangChain + LangGraph Agent 实现
 *
 * 端点：POST /functions/v1/generate-quest-agent
 * 输入/输出格式与原版 generate-quest 完全相同
 *
 * 流程（LangGraph）：
 *   START
 *     │
 *     ├── fetch_profile (并行)
 *     └── resolve_location (并行)
 *           │
 *           ▼
 *       plan_pois (createReactAgent)
 *           │
 *           ▼
 *       validate_pois
 *           │
 *           ▼
 *       generate_journey (纯 LLM + withStructuredOutput)
 *           │
 *           ▼
 *          END
 */

import { runQuest } from "agent/graph.ts";
import type { PersonaCard } from "agent/state.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // CORS 预检
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 解析请求
    const body = await req.json();
    const {
      card,
      city = "",
      lat,
      lng,
      time_period = "下午",
      companion = "独行",
      player_key,
    } = body ?? {};

    // 参数校验
    if (!card?.identity || !card?.mood || !card?.mission) {
      return new Response(JSON.stringify({ error: "missing card" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("=".repeat(50));
    console.log("[generate-quest-agent] LangChain Agent 版本");
    console.log("[generate-quest-agent] 人设:", card.identity);
    console.log("[generate-quest-agent] 城市:", city || "未指定");
    console.log("[generate-quest-agent] 玩家:", player_key || "匿名");

    // ===== 调用 LangGraph 流程 =====

    const result = await runQuest({
      card: {
        id: card.id || "temp",
        rarity: card.rarity || "N",
        identity: card.identity,
        mood: card.mood,
        mission: card.mission,
        colors: card.colors || [],
        illustration_keyword: card.illustration_keyword || "",
        cover: card.cover,
      } as PersonaCard,
      city,
      lat,
      lng,
      playerKey: player_key,
      timePeriod: time_period,
      companion,
    });

    // 错误处理
    if (result.error) {
      console.error("[generate-quest-agent] 执行错误:", result.error);
      return new Response(
        JSON.stringify({ error: result.error }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 无结果
    if (!result.journey) {
      console.error("[generate-quest-agent] 无路线生成");
      return new Response(
        JSON.stringify({ error: "生成失败" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[generate-quest-agent] 完成，场景数:", result.journey.scenes.length);
    console.log("[generate-quest-agent] POI 数:", result.poiCount);
    console.log("=".repeat(50));

    // 返回结果（兼容原版格式）
    return new Response(
      JSON.stringify({
        journey: result.journey,
        city: result.city,
        poi_count: result.poiCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[generate-quest-agent] 异常:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});