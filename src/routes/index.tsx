import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  CHARACTER_CLASSES,
  EMOTION_CHIPS,
  type CharacterClass,
} from "@/lib/quest-types";
import { startRun } from "@/lib/quest-store";
import { getSeedQuest, fallbackSeedQuest } from "@/lib/seed-quests";
import { supabase } from "@/integrations/supabase/client";
import { PixelAvatar } from "@/components/PixelAvatar";

export const Route = createFileRoute("/")({
  component: Index,
});

function inferTimePeriod(): string {
  const h = new Date().getHours();
  if (h < 6) return "深夜";
  if (h < 11) return "早晨";
  if (h < 14) return "正午";
  if (h < 18) return "下午";
  if (h < 21) return "黄昏";
  return "夜里";
}

function Index() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<CharacterClass | null>(null);
  const [emotions, setEmotions] = useState<string[]>([]);
  const [customEmotion, setCustomEmotion] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const finalEmotion =
    [...emotions, customEmotion.trim()].filter(Boolean).join(" · ");
  const canStart = !!selected && finalEmotion.length > 0;

  function toggleEmotion(chip: string) {
    setEmotions((prev) =>
      prev.includes(chip) ? prev.filter((e) => e !== chip) : [...prev, chip],
    );
  }

  async function handleStart() {
    if (!selected || !finalEmotion) return;
    setLoading(true);
    setErrorMsg(null);

    // First, try AI generation via edge function.
    try {
      const { data, error } = await supabase.functions.invoke("generate-quest", {
        body: {
          character_class: selected,
          emotion_input: finalEmotion,
          weather: "多云",
          time_period: inferTimePeriod(),
          companion: "独行",
          city: "上海",
        },
      });
      if (error) throw error;
      const quest = (data as { quest?: unknown })?.quest;
      if (!quest) throw new Error("空响应");
      startRun({
        character: selected,
        emotion: finalEmotion,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        quest: quest as any,
      });
      navigate({ to: "/quest" });
      return;
    } catch (err) {
      console.warn("AI 生成失败，使用种子副本：", err);
    }

    // Fallback to seed data so the demo always works.
    const seed =
      getSeedQuest(selected, finalEmotion) ?? fallbackSeedQuest(selected);
    startRun({ character: selected, emotion: finalEmotion, quest: seed });
    navigate({ to: "/quest" });
  }

  return (
    <div className="crt-overlay min-h-screen px-5 py-8 max-w-xl mx-auto">
      {/* Header */}
      <header className="text-center mb-8">
        <div className="text-xs pixel text-accent mb-2">[ DRIFTQUEST · v0.1 ]</div>
        <h1 className="text-3xl pixel text-primary leading-tight">
          异界<br />漂流
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          你的城市，你的剧本，你的周末副本
        </p>
      </header>

      {/* Class select */}
      <section className="mb-7">
        <h2 className="text-xs pixel text-primary mb-3">▸ 选择职业</h2>
        <div className="grid grid-cols-1 gap-3">
          {CHARACTER_CLASSES.map((c) => {
            const active = selected === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className="pixel-panel text-left p-4 transition-colors"
                style={{
                  background: active
                    ? "color-mix(in oklab, var(--color-primary) 18%, var(--color-card))"
                    : undefined,
                  borderColor: active ? "var(--color-primary)" : undefined,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="pixel-panel flex-shrink-0 p-1"
                    style={{
                      background: "color-mix(in oklab, var(--color-primary) 12%, #0a0a18)",
                    }}
                  >
                    <PixelAvatar character={c.id} size={64} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-bold">
                      {c.id}
                      {active && (
                        <span className="ml-2 text-xs pixel text-primary">◆ 已选</span>
                      )}
                    </div>
                    <div
                      className="text-sm mt-1 text-foreground/90"
                      style={{ fontFamily: "var(--font-serif-cn)" }}
                    >
                      「{c.vibe}」
                    </div>
                    <div className="text-xs text-accent mt-1.5">{c.emotion}</div>
                    <div className="text-xs text-muted-foreground mt-1">{c.blurb}</div>
                    <div className="text-xs text-muted-foreground mt-1.5">
                      场域：{c.domain}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Emotion input */}
      <section className="mb-7">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xs pixel text-primary">▸ 今日状态（可多选）</h2>
          <span className="text-xs text-muted-foreground">
            已选 {emotions.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {EMOTION_CHIPS.map((chip) => {
            const active = emotions.includes(chip);
            return (
              <button
                key={chip}
                onClick={() => toggleEmotion(chip)}
                className="px-3 py-2 text-sm pixel-panel transition-colors"
                style={{
                  background: active ? "var(--color-primary)" : undefined,
                  color: active ? "var(--color-primary-foreground)" : undefined,
                  borderColor: active ? "var(--color-primary)" : undefined,
                  fontFamily: "var(--font-serif-cn)",
                }}
              >
                {active ? "✓ " : ""}
                {chip}
              </button>
            );
          })}
        </div>
        <textarea
          value={customEmotion}
          onChange={(e) => setCustomEmotion(e.target.value)}
          placeholder="还想补一句？告诉 DM 今天的具体状态…"
          rows={2}
          className="w-full pixel-panel p-3 text-sm bg-input resize-none"
          style={{ fontFamily: "var(--font-serif-cn)" }}
        />
      </section>

      {errorMsg && (
        <div className="mb-4 pixel-panel p-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      <button
        onClick={handleStart}
        disabled={!canStart || loading}
        className="pixel-btn w-full text-base"
      >
        {loading ? "DM 正在召唤中…" : "▶ 召唤今日副本"}
      </button>

      <footer className="mt-10 text-center text-xs text-muted-foreground pixel">
        © 2026 · 美团黑客松 · 城市漂流
      </footer>
    </div>
  );
}
