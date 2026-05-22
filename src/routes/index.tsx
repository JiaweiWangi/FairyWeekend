import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CHARACTER_CLASSES,
  EMOTION_CHIPS,
  type CharacterClass,
} from "@/lib/quest-types";
import { startRun } from "@/lib/quest-store";
import { getSeedQuest, fallbackSeedQuest } from "@/lib/seed-quests";
import { supabase } from "@/integrations/supabase/client";
import { getAmapKey } from "@/lib/map.functions";
import { PixelAvatar } from "@/components/PixelAvatar";
import { MapPicker } from "@/components/MapPicker";

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
  const [city, setCity] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [amapKey, setAmapKey] = useState("");

  const fetchAmapKey = useServerFn(getAmapKey);

  const finalEmotion =
    [...emotions, customEmotion.trim()].filter(Boolean).join(" · ");
  const canStart = !!selected || finalEmotion.length > 1;

  function inferClassFromEmotion(emotion: string): CharacterClass {
    const e = emotion.toLowerCase();
    if (e.includes("走") || e.includes("山") || e.includes("汗") || e.includes("呼吸"))
      return "山系疗愈师";
    if (e.includes("嘴") || e.includes("馋") || e.includes("吃") || e.includes("甜"))
      return "市井觅食家";
    if (e.includes("安静") || e.includes("呆") || e.includes("吵"))
      return "慢调策展人";
    if (e.includes("夜") || e.includes("睡") || e.includes("晚"))
      return "夜行漫游者";
    return "社区烟火家";
  }

  function toggleEmotion(chip: string) {
    setEmotions((prev) =>
      prev.includes(chip) ? prev.filter((e) => e !== chip) : [...prev, chip],
    );
  }

  function handleLocate() {
    if (!navigator.geolocation) {
      setErrorMsg("浏览器不支持定位，请手动输入城市");
      return;
    }
    setLocating(true);
    setErrorMsg(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        try {
          const { data, error } = await supabase.functions.invoke("resolve-location", {
            body: { lat, lng },
          });
          if (error) throw error;
          const label = (data as { label?: string })?.label;
          if (label) setCity(label);
        } catch (e) {
          console.warn("resolve-location failed", e);
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        console.warn("geolocation error", err);
        setErrorMsg("定位失败，可手动输入城市/区域");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  }

  async function handleStart() {
    if (!canStart) return;
    const character = selected ?? inferClassFromEmotion(finalEmotion);
    const emotionToUse = finalEmotion || "没特别说，交给 DM 了";
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-quest", {
        body: {
          character_class: character,
          emotion_input: emotionToUse,
          weather: "多云",
          time_period: inferTimePeriod(),
          companion: "独行",
          city: city.trim(),
          lat: coords?.lat,
          lng: coords?.lng,
        },
      });
      if (error) throw error;
      const quest = (data as { quest?: unknown })?.quest;
      if (!quest) throw new Error("空响应");
      startRun({
        character,
        emotion: emotionToUse,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        quest: quest as any,
      });
      navigate({ to: "/quest" });
      return;
    } catch (err) {
      console.warn("AI 生成失败，使用种子副本：", err);
    }

    const seed =
      getSeedQuest(character, emotionToUse) ?? fallbackSeedQuest(character);
    startRun({ character, emotion: emotionToUse, quest: seed });
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

      {/* Location */}
      <section className="mb-7 pixel-panel p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs pixel text-primary">▸ 你在哪</h2>
          <button
            onClick={handleLocate}
            disabled={locating}
            className="text-xs pixel text-accent hover:text-primary disabled:opacity-50"
          >
            {locating ? "定位中…" : coords ? "✓ 已定位 · 重新定位" : "📍 自动定位"}
          </button>
        </div>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={coords ? "可留空（用定位） 或 填城市/区域覆盖" : "城市 / 区域，比如：上海·徐汇"}
          className="w-full pixel-panel p-2 text-sm bg-input"
          style={{ fontFamily: "var(--font-serif-cn)" }}
        />
        {coords && (
          <div className="text-[10px] text-muted-foreground mt-1.5 pixel">
            坐标 {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)} · 将在 3km 内搜真实地点
          </div>
        )}
      </section>

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

      {/* OR divider */}
      <div className="flex items-center gap-3 mb-7">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs pixel text-muted-foreground">或</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Emotion input */}
      <section className="mb-7">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xs pixel text-primary">▸ 今日状态</h2>
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
