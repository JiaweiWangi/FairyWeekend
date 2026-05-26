/**
 * generate-quest Edge Function (Agent 版本)
 * 兼容原有 API 签名
 *
 * 端点：POST /functions/v1/generate-quest
 * 输入/输出格式与原版 generate-quest 完全相同
 */

import { llm } from "llmClient/client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    console.log("[generate-quest] 开始处理");
    console.log("[generate-quest] 人设:", card.identity);
    console.log("[generate-quest] 城市:", city || "未指定");

    // ===== Step 1: 并行获取画像 + 解析位置 =====

    const [profileResult, locationResult] = await Promise.all([
      // 获取玩家画像
      player_key ? getPlayerProfile(player_key) : Promise.resolve(null),
      // 解析位置
      typeof lat === "number" && typeof lng === "number"
        ? resolveLocation(lat, lng, city)
        : Promise.resolve({ city: city || "上海", gcjCoords: null }),
    ]);

    const playerProfile = profileResult;
    const { city: resolvedCity, gcjCoords } = locationResult;

    console.log("[generate-quest] 城市:", resolvedCity);
    console.log("[generate-quest] 玩家画像:", playerProfile ? "有" : "无");

    // ===== Step 2: Agent 1 - 分析人设 + 搜索 POI =====

    const { keywords, candidates } = await runPOIPlanner({
      card,
      city: resolvedCity,
      timePeriod: time_period,
      playerProfile,
      gcjCoords,
    });

    console.log("[generate-quest] 关键词:", keywords.join(", "));
    console.log("[generate-quest] 候选 POI:", candidates.length);

    // ===== Step 3: 验证 POI =====

    if (candidates.length < 3) {
      console.warn("[generate-quest] 候选不足，但继续执行");
    }

    // ===== Step 4: Agent 2 - 生成路线 =====

    const journey = await runStoryGenerator({
      card,
      poiCandidates: candidates,
      timePeriod: time_period,
      companion,
    });

    if (!journey) {
      return new Response(JSON.stringify({ error: "生成失败" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[generate-quest] 完成，场景数:", journey.scenes.length);
    console.log("=".repeat(50));
    console.group("[generated-quest]生成结果：",journey);

    // 返回结果（兼容原版格式）
    return new Response(
      JSON.stringify({
        journey,
        city: resolvedCity,
        poi_count: candidates.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[generate-quest] 错误:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ===== 辅助函数 =====

/**
 * 获取玩家画像
 */
async function getPlayerProfile(playerKey: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/dm_memory?player_key=eq.${playerKey}&select=*`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    const data = await res.json();
    return data?.[0] ?? null;
  } catch (e) {
    console.warn("获取画像失败:", e);
    return null;
  }
}

/**
 * 解析位置：坐标转换 + 逆地理编码
 */
async function resolveLocation(
  lat: number,
  lng: number,
  cityInput: string
): Promise<{ city: string; gcjCoords: { lng: number; lat: number } | null }> {
  const amapKey = Deno.env.get("AMAP_WEB_API_KEY");
  if (!amapKey) {
    return { city: cityInput || "上海", gcjCoords: null };
  }

  let gcjCoords: { lng: number; lat: number } | null = null;

  // WGS84 → GCJ02
  try {
    const cvUrl = `https://restapi.amap.com/v3/assistant/coordinate/convert?locations=${lng},${lat}&coordsys=gps&key=${amapKey}`;
    const cv = await fetch(cvUrl).then((r) => r.json());
    if (cv.status === "1" && cv.locations) {
      const [glng, glat] = String(cv.locations).split(",").map(Number);
      gcjCoords = { lng: glng, lat: glat };
    }
  } catch (e) {
    console.warn("坐标转换失败:", e);
  }

  // 如果已有城市，直接返回
  if (cityInput) {
    return { city: cityInput, gcjCoords };
  }

  // 逆地理编码
  if (gcjCoords) {
    try {
      const regeoUrl = `https://restapi.amap.com/v3/geocode/regeo?location=${gcjCoords.lng},${gcjCoords.lat}&key=${amapKey}`;
      const regeo = await fetch(regeoUrl).then((r) => r.json());
      if (regeo.status === "1") {
        const addr = regeo.regeocode?.addressComponent ?? {};
        const cityName = (typeof addr.city === "string" && addr.city) || addr.province || "";
        const district = (typeof addr.district === "string" && addr.district) || "";
        return {
          city: [cityName, district].filter(Boolean).join("·") || "上海",
          gcjCoords,
        };
      }
    } catch (e) {
      console.warn("逆地理编码失败:", e);
    }
  }

  return { city: "上海", gcjCoords };
}

/**
 * Agent 1: POI 规划师
 */
async function runPOIPlanner(input: {
  card: { identity: string; mood: string; mission: string; rarity: string };
  city: string;
  timePeriod: string;
  playerProfile: any;
  gcjCoords: { lng: number; lat: number } | null;
}): Promise<{ keywords: string[]; candidates: any[] }> {
  const { card, city, timePeriod, playerProfile, gcjCoords } = input;
  const amapKey = Deno.env.get("AMAP_WEB_API_KEY");

  // Step 1: LLM 分析人设，输出关键词
  const systemPrompt = `你是一位城市探索规划师。
根据人设卡输出 3-5 个搜索关键词。
输出 JSON 格式：{ "keywords": string[], "reasoning": string }`;

  const userPrompt = `人设身份：${card.identity}
人设状态：${card.mood}
人设使命：${card.mission}
稀有度：${card.rarity}
城市：${city}
时间段：${timePeriod}
${playerProfile ? `喜欢的标签：${(playerProfile.loved_tags || []).join("、")}` : ""}`;

  let keywords: string[];

  try {
    const result = await llm.askJSON<{ keywords: string[]; reasoning?: string }>(
      userPrompt,
      {
        name: "keywords",
        schema: {
          type: "object",
          properties: {
            keywords: { type: "array", items: { type: "string" } },
            reasoning: { type: "string" },
          },
          required: ["keywords"],
        },
      },
      systemPrompt
    );
    keywords = result.keywords || ["咖啡馆", "公园", "书店"];
  } catch (e) {
    console.warn("LLM 关键词生成失败:", e);
    keywords = ["咖啡馆", "公园", "书店"];
  }

  // Step 2: 并行搜索 POI
  const coords = gcjCoords || { lng: 121.4737, lat: 31.2304 };
  const candidates: any[] = [];
  const seen = new Set<string>();

  const searchPromises = keywords.map((kw) =>
    fetch(
      `https://restapi.amap.com/v3/place/around?key=${amapKey}&location=${coords.lng},${coords.lat}&keywords=${encodeURIComponent(kw)}&radius=3000&offset=5`
    )
      .then((r) => r.json())
      .catch(() => null)
  );

  const results = await Promise.all(searchPromises);

  for (const res of results) {
    if (res?.status === "1" && Array.isArray(res.pois)) {
      for (const p of res.pois) {
        if (!seen.has(p.name)) {
          seen.add(p.name);
          candidates.push({
            name: p.name,
            type: p.type?.split(";")[0] || "",
            address: p.address,
            location: p.location,
          });
        }
      }
    }
  }

  return { keywords, candidates: candidates.slice(0, 25) };
}

/**
 * Agent 2: 故事生成师
 */
async function runStoryGenerator(input: {
  card: any;
  poiCandidates: any[];
  timePeriod: string;
  companion: string;
}): Promise<any> {
  const { card, poiCandidates, timePeriod, companion } = input;

  const systemPrompt = `你是「今日人设 Todaypersona」的故事生成引擎。

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

  // 构建候选 POI 文本
  const candidateBlock = poiCandidates.length
    ? `\n\n【真实候选 POI】（必须从中挑选 3-4 个；location_name 一字不差）:\n` +
      poiCandidates.slice(0, 20).map((p, i) =>
        `${i + 1}. ${p.name}｜${p.type}｜${p.address}`
      ).join("\n")
    : "\n\n（没有真实 POI 数据，请按你对该城市的了解生成可信地点）";

  const userPrompt = `【今日人设卡】
身份：${card.identity}
今日状态：${card.mood}
今日使命：${card.mission}
稀有度：${card.rarity}

城市/区域：上海
时间段：${timePeriod}
同伴：${companion}${candidateBlock}

请以这个人设的视角生成今日剧情路线。`;

  try {
    return await llm.askJSON(
      userPrompt,
      {
        name: "journey",
        schema: {
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
        },
      },
      systemPrompt,
      { maxTokens: 4096 }
    );
  } catch (e) {
    console.error("LLM 路线生成失败:", e);
    return null;
  }
}
