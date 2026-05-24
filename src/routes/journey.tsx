import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadRun, completeScene } from "@/lib/persona-store";
import type { JourneyRunState, JourneyScene } from "@/lib/persona-types";

export const Route = createFileRoute("/journey")({ component: JourneyPage });

function JourneyPage() {
  const navigate = useNavigate();
  const [run, setRun] = useState<JourneyRunState | null>(null);
  const [openingShown, setOpeningShown] = useState("");

  useEffect(() => {
    const r = loadRun();
    if (!r) { navigate({ to: "/" }); return; }
    setRun(r);
    // 打字机展示 story_opening
    const text = r.journey.story_opening;
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setOpeningShown(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, 55);
    return () => clearInterval(t);
  }, [navigate]);

  if (!run) return null;

  const { card, journey, city, completedSceneOrders } = run;
  const allDone = completedSceneOrders.length >= journey.scenes.length;

  function toggle(order: number) {
    completeScene(order);
    const r = loadRun();
    if (r) setRun(r);
  }

  const [a, b] = card.colors;

  return (
    <div className="min-h-screen pb-20">
      {/* Hero banner */}
      <div
        className="relative h-56 overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${a} 0%, ${b} 100%)` }}
      >
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              `radial-gradient(circle at 25% 25%, ${card.colors[2]} 0%, transparent 50%), radial-gradient(circle at 80% 70%, ${a} 0%, transparent 55%)`,
          }}
        />
        <div className="relative h-full max-w-xl mx-auto px-5 flex flex-col justify-end pb-5">
          <button
            onClick={() => navigate({ to: "/card" })}
            className="display text-[11px] tracking-[0.3em] text-[var(--ink)] opacity-70 mb-3 self-start"
          >
            ← 返回人设卡
          </button>
          <div className="rarity-chip self-start mb-2" data-rarity={card.rarity}>
            ✦ {card.rarity}
          </div>
          <h1 className="cn-serif text-[22px] text-[var(--ink)] leading-snug">
            {card.identity}
          </h1>
          <div className="cn-serif text-[13px] text-[var(--ink)] opacity-80 mt-1">
            「{card.mission}」
            {city && <span className="ml-2 display italic text-[11px]">· {city}</span>}
          </div>
        </div>
      </div>

      {/* Story opening */}
      <div className="max-w-xl mx-auto px-5 mt-8">
        <div className="display text-[10px] tracking-[0.35em] text-[var(--ink-soft)] mb-3">
          OPENING · 开篇
        </div>
        <p className="cn-serif text-[17px] leading-[1.85] text-[var(--ink)] cursor-blink">
          {openingShown}
        </p>
        <div className="mt-3 display italic text-[12px] text-[var(--ink-soft)]">
          情绪弧线 · {journey.emotion_arc.start} → {journey.emotion_arc.end}
        </div>
      </div>

      {/* Scenes */}
      <div className="max-w-xl mx-auto px-5 mt-10 space-y-6">
        {journey.scenes.map((s, idx) => (
          <SceneCard
            key={s.order}
            scene={s}
            index={idx}
            done={completedSceneOrders.includes(s.order)}
            cardColors={card.colors}
            city={city}
            onToggle={() => toggle(s.order)}
          />
        ))}
      </div>

      {/* Finale link */}
      <div className="max-w-xl mx-auto px-5 mt-10 text-center">
        <button
          onClick={() => navigate({ to: "/finale" })}
          disabled={!allDone}
          className="btn-soft"
        >
          {allDone ? "解锁今日结语 ✶" : `完成 ${completedSceneOrders.length}/${journey.scenes.length} · 全部走完后解锁`}
        </button>
      </div>
    </div>
  );
}

function SceneCard({
  scene, index, done, cardColors, city, onToggle,
}: {
  scene: JourneyScene;
  index: number;
  done: boolean;
  cardColors: string[];
  city?: string;
  onToggle: () => void;
}) {
  const [a, b, c] = cardColors;
  const gradients = [
    `linear-gradient(160deg, ${a}, #ffffff)`,
    `linear-gradient(160deg, ${b}, ${a})`,
    `linear-gradient(160deg, ${c}, ${b})`,
    `linear-gradient(160deg, ${a}, ${c})`,
  ];
  const mapHref = `https://uri.amap.com/marker?name=${encodeURIComponent(scene.location_name)}&src=todaypersona&coordinate=gaode&callnative=1`;
  const meituanHref = `https://i.meituan.com/s/${encodeURIComponent(scene.meituan_keyword || scene.location_name)}`;

  return (
    <article
      className="scene-card fade-up"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div
        className="scene-illu relative"
        style={{ background: gradients[index % gradients.length] }}
      >
        <div className="absolute inset-0 opacity-50"
          style={{
            background: `radial-gradient(circle at 20% 30%, ${c} 0%, transparent 50%), radial-gradient(circle at 80% 70%, ${a} 0%, transparent 55%)`,
          }}
        />
        <div className="absolute top-3 left-4 scene-chip">SCENE 0{scene.order}</div>
        <div className="absolute bottom-3 right-4 display italic text-[12px] text-[var(--ink)] opacity-70">
          停留 ~{scene.stay_minutes}min
        </div>
      </div>

      <div className="p-5">
        <h3 className="cn-serif text-[20px] text-[var(--ink)] leading-snug">
          「{scene.scene_name}」
        </h3>
        <div className="cn-serif text-[13px] text-[var(--ink-soft)] mt-1">
          {scene.location_name}
          <span className="ml-2 opacity-70">· {scene.location_type}</span>
        </div>
        {scene.location_hint && (
          <div className="cn-serif text-[12px] text-[var(--ink-soft)] mt-0.5">
            📍 {scene.location_hint}{city ? ` · ${city}` : ""}
          </div>
        )}

        <p className="cn-serif text-[15px] leading-[1.85] text-[var(--ink)] mt-4">
          {scene.persona_narrative}
        </p>

        <div className="mt-4 px-4 py-3 rounded-2xl bg-[oklch(0.97_0.025_60)] border border-[var(--border)]">
          <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)] mb-1.5">
            YOUR TASK
          </div>
          <div className="cn-serif text-[14px] text-[var(--ink)] italic">
            {scene.action_task}
          </div>
        </div>

        {scene.emotion_tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {scene.emotion_tags.map((t) => (
              <span key={t} className="cn-serif text-[11px] px-2.5 py-1 rounded-full bg-[var(--muted)] text-[var(--ink-soft)]">
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <a href={mapHref} target="_blank" rel="noreferrer" className="btn-ghost flex-1 justify-center">
            🧭 导航
          </a>
          <a href={meituanHref} target="_blank" rel="noreferrer" className="btn-ghost flex-1 justify-center">
            🥡 美团
          </a>
          <button onClick={onToggle} className="btn-soft" style={{ padding: "10px 16px" }}>
            {done ? "✓ 已打卡" : "打卡"}
          </button>
        </div>
      </div>
    </article>
  );
}
