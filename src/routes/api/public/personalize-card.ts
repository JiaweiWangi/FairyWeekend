import { createFileRoute } from "@tanstack/react-router";

interface Body {
  userPhoto: string; // data URL
  cardCover: string; // data URL or http url
  identity: string;
  mood: string;
  illustration_keyword: string;
}

export const Route = createFileRoute("/api/personalize-card")({
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
        if (!body.userPhoto || !body.cardCover) {
          return new Response("Missing photo or cover", { status: 400 });
        }

        const prompt = [
          `Create a stylized illustrated portrait card cover.`,
          `The first image is the user's real photo — keep their face, hair and overall look recognizable.`,
          `The second image shows the original card's art style, mood and color palette — match it closely.`,
          `Card persona: "${body.identity}". Mood: ${body.mood}. Style keyword: ${body.illustration_keyword}.`,
          `Render the user as the protagonist of this persona, painterly editorial illustration, soft cinematic lighting, tasteful composition, no text, no logos, no watermarks.`,
          `Output a single square (1:1) image suitable as a card hero cover.`,
        ].join(" ");

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
                model: "google/gemini-2.5-flash-image",
                modalities: ["image", "text"],
                messages: [
                  {
                    role: "user",
                    content: [
                      { type: "text", text: prompt },
                      { type: "image_url", image_url: { url: body.userPhoto } },
                      { type: "image_url", image_url: { url: body.cardCover } },
                    ],
                  },
                ],
              }),
              signal: request.signal,
            },
          );

          if (!upstream.ok) {
            const text = await upstream.text();
            return new Response(text || "AI failed", { status: upstream.status });
          }

          const json = (await upstream.json()) as {
            choices?: Array<{
              message?: {
                images?: Array<{ image_url?: { url?: string } }>;
              };
            }>;
          };
          const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (!url) {
            return new Response(JSON.stringify({ error: "no image" }), {
              status: 502,
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ image: url }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : "failed" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
