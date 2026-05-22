// Edge function: generate a city RPG quest based on player class + emotion.
// Uses Lovable AI Gateway (no API key required from user).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `你是「异界漂流」的城市地下城主（DM），一个懂得城市肌理、人类情绪与叙事节奏的神秘向导。

你的任务：根据冒险者的职业、情绪状态、天气和时间，生成一条包含 3-5 个城市关卡的「周末副本」。

规则：
1. 副本要有统一的世界观主题（用奇幻隐喻包装真实城市场景）
2. 每个关卡要有「任务目标」——具体的行为指令，不是去参观，是去做什么
3. 关卡推荐要有反直觉性，不要景点，要有人情味的真实城市空间
4. DM 口吻：神秘但不高冷，有时会吐槽，有文学感但不做作
5. 整条副本有情绪弧线（起点状态 → 通关后状态）
6. 严格输出 JSON，不要输出任何其他内容`;

const QUEST_SCHEMA = {
  type: "object",
  properties: {
    quest_name: { type: "string", description: "副本名称（带奇幻感的 4-8 字）" },
    quest_brief: { type: "string", description: "DM 开场白（80-120字，第二人称，带入感强）" },
    emotion_arc: {
      type: "object",
      properties: {
        start: { type: "string" },
        end: { type: "string" },
      },
      required: ["start", "end"],
      additionalProperties: false,
    },
    stages: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          order: { type: "number" },
          stage_name: { type: "string", description: "关卡名（奇幻隐喻）" },
          location_name: { type: "string" },
          location_type: { type: "string" },
          location_hint: { type: "string" },
          mission: { type: "string" },
          dm_narrative: { type: "string" },
          stay_minutes: { type: "number" },
          emotion_tags: { type: "array", items: { type: "string" } },
          unlock_words: { type: "string" },
          transition: { type: "string" },
          meituan_keyword: { type: "string" },
        },
        required: [
          "order",
          "stage_name",
          "location_name",
          "location_type",
          "location_hint",
          "mission",
          "dm_narrative",
          "stay_minutes",
          "emotion_tags",
          "unlock_words",
          "transition",
          "meituan_keyword",
        ],
        additionalProperties: false,
      },
    },
    completion_speech: { type: "string" },
  },
  required: ["quest_name", "quest_brief", "emotion_arc", "stages", "completion_speech"],
  additionalProperties: false,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      character_class = "游荡诗人",
      emotion_input = "蔫蔫的",
      weather = "多云",
      time_period = "下午",
      companion = "独行",
      city = "上海",
    } = body ?? {};

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `职业：${character_class}
今日状态：${emotion_input}
天气：${weather}
时间段：${time_period}
同伴：${companion}
城市/区域：${city}

请生成今日副本。`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "quest",
            strict: true,
            schema: QUEST_SCHEMA,
          },
        },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited", message: "请求过于频繁，稍后再试。" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "payment_required", message: "AI 额度已用尽，请充值。" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "ai_error", detail: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let quest;
    try {
      quest = typeof content === "string" ? JSON.parse(content) : content;
    } catch (e) {
      console.error("Parse error:", e, content);
      return new Response(JSON.stringify({ error: "parse_error", raw: content }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ quest }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-quest error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
