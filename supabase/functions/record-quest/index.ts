// Edge function: store a completed quest run and update DM long-term memory.

// 配置了deno.json 路径是正确的
import { llm } from "llmClient/client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Quest {
  quest_name: string;
  quest_brief?: string;
  stages: Array<{
    order: number;
    stage_name: string;
    location_name: string;
    location_type?: string;
    emotion_tags?: string[];
  }>;
}

async function summarizeProfile(
  current: {
    profile: string;
    loved: string[];
    disliked: string[];
    totalRuns: number;
  },
  latest: {
    character_class: string;
    emotion: string;
    city: string;
    quest: Quest;
    rating: number | null;
    feedback: string | null;
    likedStages: Array<{ stage_name: string; location_name: string; location_type?: string; emotion_tags?: string[] }>;
    unlikedStages: Array<{ stage_name: string; location_name: string; location_type?: string; emotion_tags?: string[] }>;
  },
): Promise<{ profile: string; loved: string[]; disliked: string[] }> {
  const prompt = `你是一位 DM，正在更新对老玩家的长期画像。请基于历史画像+本次反馈，输出新的画像 JSON。

【历史画像】
- 文字描述：${current.profile || "（无）"}
- 喜欢的标签：${current.loved.join("、") || "（无）"}
- 不喜欢的标签：${current.disliked.join("、") || "（无）"}
- 累计场次：${current.totalRuns}

【本次副本】
- 职业：${latest.character_class}
- 情绪：${latest.emotion}
- 城市：${latest.city}
- 副本：《${latest.quest.quest_name}》
- 用户评分：${latest.rating ?? "未评"}
- 用户反馈：${latest.feedback || "（无）"}
- 用户喜欢的关卡：${latest.likedStages.map((s) => `${s.stage_name}(${s.location_type ?? ""})${(s.emotion_tags ?? []).join("/")}`).join("；") || "（无）"}
- 用户没勾选的关卡：${latest.unlikedStages.map((s) => `${s.stage_name}(${s.location_type ?? ""})`).join("；") || "（无）"}

请输出 JSON：
- profile: 一段 80 字以内中文画像，像 DM 写的玩家小档案（口味、节奏、性格）。
- loved_tags: 最多 8 个标签（品类/氛围/情绪），按重要性排序。
- disliked_tags: 最多 5 个。
保留有用旧信息，融合新观察，不要无脑覆盖。`;

  try {
    const result = await llm.askJSON<{
      profile: string;
      loved_tags: string[];
      disliked_tags: string[];
    }>(
      prompt,
      {
        name: "profile",
        schema: {
          type: "object",
          properties: {
            profile: { type: "string" },
            loved_tags: { type: "array", items: { type: "string" } },
            disliked_tags: { type: "array", items: { type: "string" } },
          },
          required: ["profile", "loved_tags", "disliked_tags"],
          additionalProperties: false,
        },
      }
    );

    return {
      profile: result.profile ?? current.profile,
      loved: (result.loved_tags ?? []).slice(0, 8),
      disliked: (result.disliked_tags ?? []).slice(0, 5),
    };
  } catch (e) {
    console.error("summarize failed:", e);
    return { profile: current.profile, loved: current.loved, disliked: current.disliked };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      player_key = "default",
      character_class,
      emotion = "",
      city = "",
      quest,
      stages_unlocked = 0,
      rating = null,
      feedback = "",
      liked_stage_orders = [],
    } = body ?? {};

    if (!quest || !character_class) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supaUrl = Deno.env.get("SUPABASE_URL");
    const supaKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supaUrl || !supaKey) {
      return new Response(JSON.stringify({ error: "supabase env missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const headers = {
      apikey: supaKey,
      Authorization: `Bearer ${supaKey}`,
      "Content-Type": "application/json",
    };

    // 1. 插入历史
    await fetch(`${supaUrl}/rest/v1/quest_history`, {
      method: "POST",
      headers,
      body: JSON.stringify([{
        player_key, character_class, emotion, city, quest,
        stages_unlocked, rating, feedback,
        liked_stage_orders,
      }]),
    });

    // 2. 读旧 memory
    const memRes = await fetch(
      `${supaUrl}/rest/v1/dm_memory?player_key=eq.${player_key}&select=*`,
      { headers },
    );
    const memArr = await memRes.json();
    const old = memArr?.[0] ?? { profile: "", loved_tags: [], disliked_tags: [], visited_pois: [], total_runs: 0 };

    // 3. 算新增 visited
    const newVisited: string[] = (quest.stages ?? [])
      .map((s: { location_name: string }) => s.location_name)
      .filter(Boolean);
    const mergedVisited = Array.from(new Set([...newVisited, ...(old.visited_pois ?? [])])).slice(0, 60);

    // 4. AI 更新画像
    const likedSet = new Set<number>(liked_stage_orders);
    const likedStages = (quest.stages ?? []).filter((s: { order: number }) => likedSet.has(s.order));
    const unlikedStages = (quest.stages ?? []).filter((s: { order: number }) => !likedSet.has(s.order));

    const updated = await summarizeProfile(
      { profile: old.profile ?? "", loved: old.loved_tags ?? [], disliked: old.disliked_tags ?? [], totalRuns: old.total_runs ?? 0 },
      { character_class, emotion, city, quest, rating, feedback, likedStages, unlikedStages },
    );

    // 5. upsert memory
    await fetch(`${supaUrl}/rest/v1/dm_memory?on_conflict=player_key`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify([{
        player_key,
        profile: updated.profile,
        loved_tags: updated.loved,
        disliked_tags: updated.disliked,
        visited_pois: mergedVisited,
        total_runs: (old.total_runs ?? 0) + 1,
        updated_at: new Date().toISOString(),
      }]),
    });

    return new Response(JSON.stringify({ ok: true, profile: updated.profile, loved: updated.loved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("record-quest error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
