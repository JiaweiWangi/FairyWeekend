// Edge function: generate a city RPG quest based on player class + emotion.
// Uses Lovable AI Gateway + Amap (高德) Web Service for real POI data.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `你是「异界漂流」的城市地下城主（DM），一个懂得城市肌理、人类情绪与叙事节奏的神秘向导。

任务：根据冒险者的职业、情绪、天气、时间，以及【真实候选 POI 列表】，挑选其中 3-5 个生成「周末副本」。

规则：
1. location_name 必须严格使用候选列表里某个 POI 的 name（一字不差），location_hint 用候选 POI 的 address。
2. 副本要有统一世界观主题（奇幻隐喻包装真实城市场景）。
3. 关卡是「去做什么」，不是「去看什么」。
4. DM 口吻：神秘有文学感、偶尔吐槽、不做作。
5. 整条副本要有情绪弧线（起点 → 终点）。
6. 必须按候选 POI 的真实位置组织顺序，相邻关卡尽量在地理上能走通。
7. 严格输出 JSON，不要任何额外文字。
8. 如果用户提供了【DM 的长期记忆】，把自己当成 TA 的老朋友：避开 TA 不喜欢的标签、呼应 TA 的口味，可以在 dm_narrative 或 quest_brief 里偶尔点一句熟人感的细节（不要刻意）。`;

const QUEST_SCHEMA = {
  type: "object",
  properties: {
    quest_name: { type: "string" },
    quest_brief: { type: "string" },
    emotion_arc: {
      type: "object",
      properties: { start: { type: "string" }, end: { type: "string" } },
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
          stage_name: { type: "string" },
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
          "order", "stage_name", "location_name", "location_type",
          "location_hint", "mission", "dm_narrative", "stay_minutes",
          "emotion_tags", "unlock_words", "transition", "meituan_keyword",
        ],
        additionalProperties: false,
      },
    },
    completion_speech: { type: "string" },
  },
  required: ["quest_name", "quest_brief", "emotion_arc", "stages", "completion_speech"],
  additionalProperties: false,
};

// 按职业映射高德 POI 关键词（覆盖美团玩乐主要品类）
const CLASS_KEYWORDS: Record<string, string[]> = {
  "山系疗愈师": [
    "公园", "绿道", "山", "江边", "湖", "植物园", "森林",
    "游泳馆", "健身中心", "瑜伽", "羽毛球馆", "体育场馆", "露营地",
    "采摘园", "温泉", "按摩足疗", "汗蒸洗浴",
  ],
  "市井觅食家": [
    "面馆", "小吃", "早餐", "夜市", "苍蝇馆", "老字号",
    "菜市场", "烧烤", "火锅", "茶馆", "甜品", "面包店",
    "美食街", "商场",
  ],
  "慢调策展人": [
    "咖啡", "书店", "美术馆", "博物馆", "展览", "图书馆",
    "画廊", "文创园", "独立电影院", "私人影院", "陶艺", "手工DIY",
    "拼豆", "花艺", "茶馆",
  ],
  "夜行漫游者": [
    "酒吧", "清吧", "Live House", "夜市", "便利店", "24小时",
    "KTV", "电玩", "网吧电竞", "台球馆", "保龄球", "密室逃脱",
    "剧本杀", "桌游", "深夜食堂",
  ],
  "社区烟火家": [
    "菜市场", "公园", "社区", "茶馆", "面包店", "棋牌室",
    "宠物店", "萌宠", "儿童乐园", "商场", "广场",
    "聚餐", "团建", "桌游", "新奇体验",
  ],
};

interface POI {
  name: string;
  address: string;
  type: string;
  location: string; // "lng,lat"
  distance?: string;
}

async function wgs84ToGcj02(amapKey: string, lng: number, lat: number): Promise<[number, number]> {
  try {
    const url = `https://restapi.amap.com/v3/assistant/coordinate/convert?locations=${lng},${lat}&coordsys=gps&key=${amapKey}`;
    const r = await fetch(url);
    const j = await r.json();
    if (j.status === "1" && j.locations) {
      const [a, b] = (j.locations as string).split(",").map(Number);
      return [a, b];
    }
  } catch (e) {
    console.warn("coord convert failed:", e);
  }
  return [lng, lat];
}

async function reverseGeocode(amapKey: string, lng: number, lat: number): Promise<string | null> {
  try {
    const url = `https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${amapKey}`;
    const r = await fetch(url);
    const j = await r.json();
    if (j.status === "1") {
      const addr = j.regeocode?.addressComponent;
      if (addr) {
        const city = (typeof addr.city === "string" && addr.city) || addr.province || "";
        const district = (typeof addr.district === "string" && addr.district) || "";
        return [city, district].filter(Boolean).join("·") || null;
      }
    }
  } catch (e) {
    console.warn("regeo failed:", e);
  }
  return null;
}

async function searchPOIs(
  amapKey: string,
  keyword: string,
  opts: { lng?: number; lat?: number; city?: string },
): Promise<POI[]> {
  try {
    let url: string;
    if (opts.lng != null && opts.lat != null) {
      // 周边搜索 3km 内
      url = `https://restapi.amap.com/v3/place/around?key=${amapKey}&location=${opts.lng},${opts.lat}&keywords=${encodeURIComponent(keyword)}&radius=3000&offset=10&extensions=base`;
    } else {
      url = `https://restapi.amap.com/v3/place/text?key=${amapKey}&keywords=${encodeURIComponent(keyword)}&city=${encodeURIComponent(opts.city || "上海")}&offset=10&extensions=base`;
    }
    const r = await fetch(url);
    const j = await r.json();
    if (j.status !== "1" || !Array.isArray(j.pois)) return [];
    return j.pois.slice(0, 4).map((p: Record<string, unknown>) => ({
      name: String(p.name ?? ""),
      address: String(p.address ?? ""),
      type: String(p.type ?? "").split(";")[0] || "",
      location: String(p.location ?? ""),
      distance: p.distance ? String(p.distance) : undefined,
    })).filter((p: POI) => p.name);
  } catch (e) {
    console.warn("POI search failed:", keyword, e);
    return [];
  }
}

async function gatherCandidates(
  amapKey: string,
  characterClass: string,
  ctx: { lng?: number; lat?: number; city?: string },
): Promise<POI[]> {
  const keywords = CLASS_KEYWORDS[characterClass] ?? ["公园", "咖啡", "小吃"];
  const all: POI[] = [];
  const seen = new Set<string>();
  for (const kw of keywords) {
    const pois = await searchPOIs(amapKey, kw, ctx);
    for (const p of pois) {
      if (!seen.has(p.name)) {
        seen.add(p.name);
        all.push(p);
      }
    }
    if (all.length >= 24) break;
  }
  return all.slice(0, 24);
}

async function fetchMemory(playerKey: string): Promise<{
  profile: string;
  loved: string[];
  disliked: string[];
  visited: string[];
  totalRuns: number;
  recent: Array<{ quest_name: string; city: string; rating: number | null; feedback: string | null; created_at: string }>;
}> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const empty = { profile: "", loved: [], disliked: [], visited: [], totalRuns: 0, recent: [] };
  if (!url || !key) return empty;
  try {
    const headers = { apikey: key, Authorization: `Bearer ${key}` };
    const [memRes, histRes] = await Promise.all([
      fetch(`${url}/rest/v1/dm_memory?player_key=eq.${playerKey}&select=*`, { headers }),
      fetch(`${url}/rest/v1/quest_history?player_key=eq.${playerKey}&select=quest,city,rating,feedback,created_at&order=created_at.desc&limit=5`, { headers }),
    ]);
    const mem = (await memRes.json())?.[0] ?? {};
    const hist = (await histRes.json()) ?? [];
    return {
      profile: mem.profile ?? "",
      loved: mem.loved_tags ?? [],
      disliked: mem.disliked_tags ?? [],
      visited: mem.visited_pois ?? [],
      totalRuns: mem.total_runs ?? 0,
      recent: hist.map((h: { quest: { quest_name?: string }; city: string; rating: number | null; feedback: string | null; created_at: string }) => ({
        quest_name: h.quest?.quest_name ?? "",
        city: h.city,
        rating: h.rating,
        feedback: h.feedback,
        created_at: h.created_at,
      })),
    };
  } catch (e) {
    console.warn("fetchMemory failed:", e);
    return empty;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      character_class = "社区烟火家",
      emotion_input = "蔫蔫的",
      weather = "多云",
      time_period = "下午",
      companion = "独行",
      city: cityInput = "",
      lat,
      lng,
      player_key = "default",
    } = body ?? {};

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const amapKey = Deno.env.get("AMAP_WEB_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 0. 拉长期记忆
    const memory = await fetchMemory(player_key);

    // 1. 拿真实候选 POI
    let resolvedCity = cityInput || "";
    let candidates: POI[] = [];
    if (amapKey) {
      let useLng: number | undefined;
      let useLat: number | undefined;
      if (typeof lng === "number" && typeof lat === "number") {
        const [glng, glat] = await wgs84ToGcj02(amapKey, lng, lat);
        useLng = glng;
        useLat = glat;
        if (!resolvedCity) {
          const c = await reverseGeocode(amapKey, glng, glat);
          if (c) resolvedCity = c;
        }
      }
      candidates = await gatherCandidates(amapKey, character_class, {
        lng: useLng, lat: useLat, city: resolvedCity || "上海",
      });
    } else {
      console.warn("AMAP_WEB_API_KEY not set, falling back to pure AI generation");
    }

    if (!resolvedCity) resolvedCity = "上海";

    // 过滤掉最近去过的 POI，避免重复
    const visitedSet = new Set(memory.visited);
    const filtered = candidates.filter((p) => !visitedSet.has(p.name));
    const useCandidates = filtered.length >= 6 ? filtered : candidates;

    // 2. 构造 prompt
    const candidateBlock = useCandidates.length
      ? `\n\n【真实候选 POI】（必须从中挑选 3-5 个；location_name 一字不差）:\n` +
        useCandidates.map((p, i) =>
          `${i + 1}. ${p.name}｜${p.type}｜${p.address}${p.distance ? `｜约${p.distance}米` : ""}`
        ).join("\n")
      : "\n\n（没有真实 POI 数据，请按你对该城市的了解生成可信地点）";

    const memoryBlock = memory.totalRuns > 0
      ? `\n\n【DM 的长期记忆】（你已经带 TA 玩过 ${memory.totalRuns} 次，请像老朋友一样懂 TA）:
- 长期画像：${memory.profile || "（暂无）"}
- 喜欢的标签：${memory.loved.join("、") || "（暂无）"}
- 不喜欢的标签：${memory.disliked.join("、") || "（暂无）"}
- 最近去过的地方（避免重复）：${memory.visited.slice(0, 12).join("、") || "（暂无）"}
- 最近副本：${memory.recent.map((r) => `《${r.quest_name}》${r.rating ? `★${r.rating}` : ""}${r.feedback ? `「${r.feedback}」` : ""}`).join("；") || "（暂无）"}

请基于这些记忆做个性化：避开 TA 不喜欢的标签，巧妙呼应 TA 的偏好，可以在 dm_narrative 里偶尔提一句"上次去过的XX，这次换个口味"之类的熟人感细节。`
      : "";

    const userPrompt = `职业：${character_class}
今日状态：${emotion_input}
天气：${weather}
时间段：${time_period}
同伴：${companion}
城市/区域：${resolvedCity}${memoryBlock}${candidateBlock}

请生成今日副本。`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "quest", strict: true, schema: QUEST_SCHEMA },
        },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500;
      return new Response(JSON.stringify({ error: "ai_error", status, detail: errText }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ quest, city: resolvedCity, poi_count: candidates.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-quest error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
