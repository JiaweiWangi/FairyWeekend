// Edge function: generate a "今日人设" persona-driven city journey.
// Uses Lovable AI Gateway + Amap (高德) Web Service for real POI data.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `你是「今日人设 Todaypersona」的故事生成引擎。

用户今天抽到一张「人设卡」，包含三个维度：身份、今日状态、今日使命。
你要以这个人设的第一视角，为用户生成一段真实可走的城市剧情路线。

输出三件事：
① story_opening：今日故事开篇（30-50 字，小说式开头，第二/第三人称均可，要有画面感）
② scenes：3-4 个城市场景节点
③ closing：今日结语（60-100 字，像这个人设傍晚写下的日记最后一段，有余韵、不煽情）

规则：
1. 所有叙事必须从「这个人设」的视角出发——植物学家看咖啡馆和普通人看咖啡馆，描述完全不同。
2. 场景要真实、有人情味，避免热门景点，偏爱有故事感的日常空间。
3. action_task 必须具体可执行（不是"感受氛围"，而是"做一件具体的事"）。
4. scene_name 是诗意命名 6-10 字（如「有阳光漏进来的角落」）。
5. 如果提供了【真实候选 POI 列表】，location_name 必须严格使用候选里某个 POI 的 name（一字不差），location_hint 用候选 POI 的 address。
6. 整条路线要有情绪弧线，从 emotion_arc.start 走到 emotion_arc.end。
7. 相邻场景在地理上尽量能走通。
8. 稀有度越高，路线越反直觉、越隐秘——SSR 要明显不同于 N。
9. 严格输出 JSON，不输出任何额外文字。`;

const JOURNEY_SCHEMA = {
  type: "object",
  properties: {
    story_opening: { type: "string" },
    emotion_arc: {
      type: "object",
      properties: { start: { type: "string" }, end: { type: "string" } },
      required: ["start", "end"],
      additionalProperties: false,
    },
    scenes: {
      type: "array",
      minItems: 3,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          order: { type: "number" },
          scene_name: { type: "string" },
          location_name: { type: "string" },
          location_type: { type: "string" },
          location_hint: { type: "string" },
          persona_narrative: { type: "string" },
          action_task: { type: "string" },
          stay_minutes: { type: "number" },
          emotion_tags: { type: "array", items: { type: "string" } },
          meituan_keyword: { type: "string" },
        },
        required: [
          "order", "scene_name", "location_name", "location_type",
          "location_hint", "persona_narrative", "action_task",
          "stay_minutes", "emotion_tags", "meituan_keyword",
        ],
        additionalProperties: false,
      },
    },
    closing: { type: "string" },
  },
  required: ["story_opening", "emotion_arc", "scenes", "closing"],
  additionalProperties: false,
};

// 按人设身份关键词映射高德 POI 类目
function pickKeywords(identity: string, mood: string): string[] {
  const text = `${identity} ${mood}`;
  const all: string[] = [];
  const add = (...ks: string[]) => { for (const k of ks) if (!all.includes(k)) all.push(k); }

  if (/植物|气味|花|自然|野生|安静/.test(text)) add("公园", "花店", "植物园", "咖啡", "独立书店", "茶馆");
  if (/家|懒|破例|宅/.test(text)) add("咖啡", "甜品", "面包店", "公园", "小酒馆", "杂货");
  if (/隐居|回归|陌生|新鲜/.test(text)) add("菜市场", "公园", "咖啡", "理发店", "便利店", "广场");
  if (/野生|燥|街/.test(text)) add("老街", "巷子", "市集", "公园", "夜市", "球场");
  if (/失恋|脆弱|修复|甜/.test(text)) add("甜品", "花店", "独立书店", "电影院", "按摩", "Spa");
  if (/平行|遗憾|留下/.test(text)) add("老弄堂", "社区咖啡", "江边", "公园", "面馆", "老字号");
  if (/最后|珍惜|拍/.test(text)) add("展览", "美术馆", "江边", "天台", "公园", "市集");
  if (/本地|外地|菜单|馆子/.test(text)) add("面馆", "小吃", "苍蝇馆", "老字号", "菜市场", "夜市");

  if (all.length === 0) add("咖啡", "公园", "独立书店", "小吃", "市集", "甜品");
  return all.slice(0, 8);
}

interface POI { name: string; address: string; type: string; location: string; distance?: string; }

async function wgs84ToGcj02(amapKey: string, lng: number, lat: number): Promise<[number, number]> {
  try {
    const url = `https://restapi.amap.com/v3/assistant/coordinate/convert?locations=${lng},${lat}&coordsys=gps&key=${amapKey}`;
    const j = await (await fetch(url)).json();
    if (j.status === "1" && j.locations) {
      const [a, b] = (j.locations as string).split(",").map(Number);
      return [a, b];
    }
  } catch (e) { console.warn("coord convert failed:", e); }
  return [lng, lat];
}

async function reverseGeocode(amapKey: string, lng: number, lat: number): Promise<string | null> {
  try {
    const url = `https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${amapKey}`;
    const j = await (await fetch(url)).json();
    if (j.status === "1") {
      const addr = j.regeocode?.addressComponent;
      if (addr) {
        const city = (typeof addr.city === "string" && addr.city) || addr.province || "";
        const district = (typeof addr.district === "string" && addr.district) || "";
        return [city, district].filter(Boolean).join("·") || null;
      }
    }
  } catch (e) { console.warn("regeo failed:", e); }
  return null;
}

async function searchPOIs(amapKey: string, keyword: string, opts: { lng?: number; lat?: number; city?: string }): Promise<POI[]> {
  try {
    let url: string;
    if (opts.lng != null && opts.lat != null) {
      url = `https://restapi.amap.com/v3/place/around?key=${amapKey}&location=${opts.lng},${opts.lat}&keywords=${encodeURIComponent(keyword)}&radius=3000&offset=8&extensions=base`;
    } else {
      url = `https://restapi.amap.com/v3/place/text?key=${amapKey}&keywords=${encodeURIComponent(keyword)}&city=${encodeURIComponent(opts.city || "上海")}&offset=8&extensions=base`;
    }
    const j = await (await fetch(url)).json();
    if (j.status !== "1" || !Array.isArray(j.pois)) return [];
    return j.pois.slice(0, 4).map((p: Record<string, unknown>) => ({
      name: String(p.name ?? ""),
      address: String(p.address ?? ""),
      type: String(p.type ?? "").split(";")[0] || "",
      location: String(p.location ?? ""),
      distance: p.distance ? String(p.distance) : undefined,
    })).filter((p: POI) => p.name);
  } catch (e) { console.warn("POI search failed:", keyword, e); return []; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      card, // PersonaCard from client
      city: cityInput = "",
      lat, lng,
      time_period = "下午",
      companion = "独行",
    } = body ?? {};

    if (!card?.identity || !card?.mood || !card?.mission) {
      return new Response(JSON.stringify({ error: "missing card" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const amapKey = Deno.env.get("AMAP_WEB_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let resolvedCity = cityInput || "";
    let candidates: POI[] = [];
    if (amapKey) {
      let useLng: number | undefined;
      let useLat: number | undefined;
      if (typeof lng === "number" && typeof lat === "number") {
        const [glng, glat] = await wgs84ToGcj02(amapKey, lng, lat);
        useLng = glng; useLat = glat;
        if (!resolvedCity) {
          const c = await reverseGeocode(amapKey, glng, glat);
          if (c) resolvedCity = c;
        }
      }
      const keywords = pickKeywords(card.identity, card.mood);
      const seen = new Set<string>();
      for (const kw of keywords) {
        const pois = await searchPOIs(amapKey, kw, { lng: useLng, lat: useLat, city: resolvedCity || "上海" });
        for (const p of pois) {
          if (!seen.has(p.name)) { seen.add(p.name); candidates.push(p); }
        }
        if (candidates.length >= 20) break;
      }
    }
    if (!resolvedCity) resolvedCity = "上海";

    const candidateBlock = candidates.length
      ? `\n\n【真实候选 POI】（必须从中挑选 3-4 个；location_name 一字不差）:\n` +
        candidates.slice(0, 20).map((p, i) =>
          `${i + 1}. ${p.name}｜${p.type}｜${p.address}${p.distance ? `｜约${p.distance}米` : ""}`
        ).join("\n")
      : "\n\n（没有真实 POI 数据，请按你对该城市的了解生成可信地点）";

    const userPrompt = `【今日人设卡】
身份：${card.identity}
今日状态：${card.mood}
今日使命：${card.mission}
稀有度：${card.rarity}

城市/区域：${resolvedCity}
时间段：${time_period}
同伴：${companion}${candidateBlock}

请以这个人设的视角生成今日剧情路线。`;

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
          json_schema: { name: "journey", strict: true, schema: JOURNEY_SCHEMA },
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
    let journey;
    try { journey = typeof content === "string" ? JSON.parse(content) : content; }
    catch (e) {
      console.error("Parse error:", e, content);
      return new Response(JSON.stringify({ error: "parse_error", raw: content }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ journey, city: resolvedCity, poi_count: candidates.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-quest error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
