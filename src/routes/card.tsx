import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { loadPendingCard, startRun } from "@/lib/persona-store";
import { RARITY_LABEL } from "@/lib/cards";
import type { PersonaCard, Journey } from "@/lib/persona-types";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/card")({ component: CardPage });

const LOADING_LINES = [
  "正在打开今日的剧本……",
  "AI 正在用这个人设的眼睛重新看城市……",
  "在 3 公里内找一个有故事感的角落……",
  "把这一天写成一段小说……",
];

const CITY_PRESETS = [
  "上海", "北京", "广州", "深圳", "杭州", "成都",
  "南京", "苏州", "重庆", "武汉", "西安", "厦门",
];

function CardPage() {
  const navigate = useNavigate();
  const [card, setCard] = useState<PersonaCard | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [locating, setLocating] = useState(false);
  const [autoLocated, setAutoLocated] = useState(false);
  const [loadingIdx, setLoadingIdx] = useState(0);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const c = loadPendingCard();
    if (!c) { navigate({ to: "/" }); return; }
    setCard(c);
  }, [navigate]);

  function handleAutoLocate() {
    if (!navigator.geolocation) {
      setError("浏览器不支持定位，挑一个城市吧");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setAutoLocated(true);
        setCity(""); // 让 AI 根据经纬度反查
        setLocating(false);
      },
      () => { setLocating(false); setError("定位失败，挑一个城市吧"); },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  }

  useEffect(() => {
    if (!generating) return;
    const t = setInterval(() => setLoadingIdx((i) => (i + 1) % LOADING_LINES.length), 1800);
    return () => clearInterval(t);
  }, [generating]);

  async function handleStart() {
    if (!card) return;
    setGenerating(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quest", {
        body: {
          card,
          city: city.trim(),
          lat: coordsRef.current?.lat,
          lng: coordsRef.current?.lng,
          time_period: inferTimePeriod(),
        },
      });
      if (error) throw error;
      const journey = (data as { journey?: Journey })?.journey;
      const resolvedCity = (data as { city?: string })?.city;
      if (!journey) throw new Error("空响应");
      startRun(card, journey, resolvedCity);
      navigate({ to: "/journey" });
    } catch (e) {
      console.error(e);
      setError("生成失败，再试一次试试？");
      setGenerating(false);
    }
  }

  if (!card) return null;
  const [a, b, c] = card.colors;

  return (
    <div className="min-h-screen px-5 pt-10 pb-16 max-w-xl mx-auto fade-up">
      <button
        onClick={() => navigate({ to: "/" })}
        className="display text-[11px] tracking-[0.3em] text-[var(--ink-soft)] mb-6"
      >
        ← 再抽一次
      </button>

      <div className="persona-card relative" data-rarity={card.rarity} style={{ minHeight: 540 }}>
        <div
          className="relative h-72 overflow-hidden"
          style={
            card.cover
              ? undefined
              : { background: `linear-gradient(160deg, ${a} 0%, ${b} 100%)` }
          }
        >
          {card.cover ? (
            <img src={card.cover} alt={card.identity} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div
              className="absolute inset-0 opacity-70"
              style={{
                background: `radial-gradient(circle at 20% 30%, ${c} 0%, transparent 50%), radial-gradient(circle at 80% 70%, ${a} 0%, transparent 55%)`,
              }}
            />
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />
          <div className="absolute top-4 left-4 rarity-chip" data-rarity={card.rarity}>
            ✦ {card.rarity} · {RARITY_LABEL[card.rarity]}
          </div>
          <div className="absolute bottom-4 right-4 display italic text-sm text-white/90 drop-shadow">
            {card.id.replace("card_", "No.")}
          </div>
        </div>

        <div className="p-7">
          <div className="cn-serif text-[11px] tracking-[0.3em] text-[var(--ink-soft)]">
            今日的你是
          </div>
          <h2 className="cn-serif text-[26px] leading-snug mt-2 text-[var(--ink)]">
            {card.identity}
          </h2>

          <div className="mt-6 cn-serif text-[11px] tracking-[0.3em] text-[var(--ink-soft)]">
            MOOD
          </div>
          <p className="cn-serif text-[15px] text-[var(--ink)] mt-1">{card.mood}</p>

          <div className="mt-5 cn-serif text-[11px] tracking-[0.3em] text-[var(--ink-soft)]">
            MISSION
          </div>
          <p className="cn-serif text-[16px] italic text-[var(--ink)] mt-1">
            「{card.mission}」
          </p>
        </div>
      </div>

      {/* City input */}
      <div className="mt-8">
        <label className="cn-serif text-[11px] tracking-[0.3em] text-[var(--ink-soft)] block mb-2">
          你今天在哪
        </label>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="例：上海·静安   /   北京·东城"
          className="w-full px-4 py-3 rounded-2xl bg-[var(--input)] border border-[var(--border)] cn-serif text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-soft)]"
        />
        <div className="text-[11px] cn-serif text-[var(--ink-soft)] mt-2">
          留空也行，AI 会按城市猜——开启定位后会更准。
        </div>
      </div>

      {error && (
        <div className="mt-5 px-4 py-3 rounded-2xl bg-[oklch(0.95_0.05_25)] cn-serif text-sm text-[oklch(0.4_0.15_25)]">
          {error}
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-3">
        <button onClick={handleStart} disabled={generating} className="btn-soft w-full justify-center">
          {generating ? (
            <span className="cursor-blink">{LOADING_LINES[loadingIdx]}</span>
          ) : (
            "开始今日剧情 →"
          )}
        </button>
        {!generating && (
          <button onClick={() => navigate({ to: "/" })} className="btn-ghost">
            再抽一次
          </button>
        )}
      </div>
    </div>
  );
}

function inferTimePeriod(): string {
  const h = new Date().getHours();
  if (h < 6) return "深夜";
  if (h < 11) return "早晨";
  if (h < 14) return "正午";
  if (h < 18) return "下午";
  if (h < 21) return "黄昏";
  return "夜里";
}
