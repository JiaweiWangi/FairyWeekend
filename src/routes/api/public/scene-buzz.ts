import { createFileRoute } from "@tanstack/react-router";

interface Body {
  scene_name: string;
  location_name: string;
  location_type: string;
  identity?: string;
  city?: string;
}

interface Review {
  name: string;
  rating: number; // 1-5
  tag: string;   // 短标签 例如 "氛围满分"
  text: string;  // 30-60 字短评
}

export const Route = createFileRoute("/api/public/scene-buzz")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        if (!body.scene_name || !body.location_name) {
          return new Response("Missing fields", { status: 400 });
        }

        const sys = `你为中文生活方式 App 生成「大众点评式」用户短评。要求：
- 输出 3 条不同口吻的中文评价（女性/男性混合、年轻人语气，可带 emoji）
- 每条 30~55 字，真实可信，不要广告腔，不要重复
- 给一个 4 或 5 星（不要满分），一个 5 星，一个 4 星
- 每条带一个 3~5 字的氛围标签，例如「治愈氛围」「出片神器」「人均不贵」
- 紧贴这个场景的实际体验：${body.location_type}，${body.location_name}${body.city ? "，在" + body.city : ""}
- 名字用「小X」「X先生」「X姑娘」「@昵称」等社交网络风格
仅输出 JSON：{"reviews":[{"name":"","rating":5,"tag":"","text":""}, ...]}`;

        const userPrompt = `场景：${body.scene_name}\n地点：${body.location_name}（${body.location_type}）${body.identity ? "\n人设：" + body.identity : ""}`;

        try {
          const upstream = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  { role: "system", content: sys },
                  { role: "user", content: userPrompt },
                ],
                response_format: { type: "json_object" },
              }),
              signal: request.signal,
            },
          );

          if (!upstream.ok) {
            const text = await upstream.text();
            return new Response(text || "AI failed", { status: upstream.status });
          }

          const json = (await upstream.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const raw = json.choices?.[0]?.message?.content ?? "{}";
          let parsed: { reviews?: Review[] } = {};
          try { parsed = JSON.parse(raw); } catch { /* ignore */ }
          const reviews = (parsed.reviews ?? []).slice(0, 3);
          return new Response(JSON.stringify({ reviews }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: String(e) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
