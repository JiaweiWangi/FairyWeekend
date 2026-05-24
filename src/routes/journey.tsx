import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { loadRun, completeScene } from "@/lib/persona-store";
import type { JourneyRunState, JourneyScene } from "@/lib/persona-types";
import { VenueIcon, detectVenue } from "@/components/VenueIcon";


export const Route = createFileRoute("/journey")({ component: JourneyPage });

function JourneyPage() {
  const navigate = useNavigate();
  const [run, setRun] = useState<JourneyRunState | null>(null);
  const [openScene, setOpenScene] = useState<JourneyScene | null>(null);
  const [openingShown, setOpeningShown] = useState("");

  useEffect(() => {
    const r = loadRun();
    if (!r) { navigate({ to: "/" }); return; }
    setRun(r);
    const text = r.journey.story_opening;
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setOpeningShown(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, 50);
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

  return (
    <div className="min-h-screen pb-24" style={{ background: "linear-gradient(180deg, #eef2e6 0%, #e3ebda 50%, #d9e4cf 100%)" }}>
      {/* Top bar */}
      <div className="max-w-xl mx-auto px-5 pt-6 flex items-center justify-between">
        <button
          onClick={() => navigate({ to: "/card" })}
          className="display text-[11px] tracking-[0.3em] text-[var(--ink)] opacity-70"
        >
          ← 人设卡
        </button>
        <div className="rarity-chip" data-rarity={card.rarity}>✦ {card.rarity}</div>
      </div>

      {/* Title */}
      <div className="max-w-xl mx-auto px-5 mt-4">
        <h1 className="cn-serif text-[22px] text-[var(--ink)] leading-snug">{card.identity}</h1>
        <div className="cn-serif text-[13px] text-[var(--ink-soft)] mt-1">
          「{card.mission}」{city && <span className="display italic text-[11px] ml-1.5">· {city}</span>}
        </div>
        <p className="cn-serif text-[14px] leading-[1.85] text-[var(--ink)] mt-3 cursor-blink">
          {openingShown}
        </p>
        <div className="display italic text-[11px] text-[var(--ink-soft)] mt-2">
          {journey.emotion_arc.start} → {journey.emotion_arc.end}
        </div>
      </div>

      {/* Map */}
      <div className="max-w-xl mx-auto px-3 mt-6">
        <JourneyMap
          scenes={journey.scenes}
          completed={completedSceneOrders}
          onPick={(s) => setOpenScene(s)}
        />
      </div>

      {/* Legend / progress */}
      <div className="max-w-xl mx-auto px-5 mt-4 text-center">
        <div className="cn-serif text-[12px] text-[var(--ink-soft)]">
          点击地图上的光点查看场景 · 已打卡 {completedSceneOrders.length}/{journey.scenes.length}
        </div>
        <button
          onClick={() => navigate({ to: "/finale" })}
          disabled={!allDone}
          className="btn-soft mt-4"
        >
          {allDone ? "解锁今日结语 ✶" : "全部打卡后解锁结语"}
        </button>
      </div>

      {/* Scene modal */}
      {openScene && (
        <SceneSheet
          scene={openScene}
          done={completedSceneOrders.includes(openScene.order)}
          city={city}
          onClose={() => setOpenScene(null)}
          onToggle={() => toggle(openScene.order)}
        />
      )}
    </div>
  );
}

/* ============ Map ============ */

function JourneyMap({
  scenes, completed, onPick,
}: {
  scenes: JourneyScene[];
  completed: number[];
  onPick: (s: JourneyScene) => void;
}) {
  // Vertical winding path through the canvas. Scene nodes positioned along it.
  const W = 360;
  const H = 560;

  // Path d (S-curve top→bottom)
  const pathD = "M 200 40 C 110 110, 280 180, 180 250 S 90 360, 200 430 S 280 510, 170 540";

  // Sample points along path for scene markers
  const points = useMemo(() => {
    const n = scenes.length;
    // approximate evenly along path using SVGPathElement in DOM (client only)
    if (typeof document === "undefined") {
      return scenes.map((_, i) => ({ x: 180 + (i % 2 === 0 ? -40 : 40), y: 80 + (i * 420) / (n - 1 || 1) }));
    }
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    const p = document.createElementNS(svgNS, "path");
    p.setAttribute("d", pathD);
    svg.appendChild(p);
    const total = p.getTotalLength();
    return scenes.map((_, i) => {
      const t = ((i + 1) / (n + 1)) * total;
      const pt = p.getPointAtLength(t);
      return { x: pt.x, y: pt.y };
    });
  }, [scenes]);

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-[0_20px_50px_-30px_rgba(80,90,60,0.5)]"
         style={{ background: "linear-gradient(180deg, #eaf0df 0%, #d6e2c5 100%)" }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto">
        <defs>
          <radialGradient id="sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f4a261" stopOpacity="1" />
            <stop offset="100%" stopColor="#f4a261" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="pathGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fff8e8" />
            <stop offset="100%" stopColor="#f3ead0" />
          </linearGradient>
        </defs>

        {/* Distant hills */}
        <ellipse cx="200" cy="30" r="14" fill="url(#sun)" />
        <circle cx="200" cy="30" r="6" fill="#e8794a" opacity="0.85" />

        <path d="M 60 130 Q 130 60, 200 110 T 320 130 L 320 200 L 60 200 Z" fill="#b8c9a0" opacity="0.55" />
        <path d="M 30 200 Q 110 130, 200 180 T 340 190 L 340 280 L 30 280 Z" fill="#9fb487" opacity="0.6" />
        <path d="M 0 290 Q 100 240, 200 280 T 360 290 L 360 380 L 0 380 Z" fill="#86a26f" opacity="0.55" />
        <path d="M 0 400 Q 120 360, 200 400 T 360 410 L 360 560 L 0 560 Z" fill="#739158" opacity="0.45" />

        {/* Tree dots scattered */}
        {Array.from({ length: 40 }).map((_, i) => {
          const x = 20 + ((i * 53) % 320);
          const y = 90 + ((i * 71) % 440);
          const r = 4 + ((i * 7) % 5);
          const shades = ["#6f8a55", "#5d7846", "#88a36b", "#7a9560"];
          return <circle key={i} cx={x} cy={y} r={r} fill={shades[i % shades.length]} opacity="0.7" />;
        })}

        {/* Winding path: dark stroke for road edge then light fill */}
        <path d={pathD} stroke="#c9bf9e" strokeWidth="22" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d={pathD} stroke="url(#pathGrad)" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d={pathD} stroke="#fffdf3" strokeWidth="2" strokeDasharray="2 8" fill="none" strokeLinecap="round" opacity="0.7" />

        {/* Small pond */}
        <ellipse cx="120" cy="500" rx="55" ry="20" fill="#a8c7d6" opacity="0.7" />
        <ellipse cx="120" cy="500" rx="40" ry="13" fill="#bcd6e2" opacity="0.6" />

        {/* Birds */}
        <path d="M 70 90 q 4 -4 8 0 q 4 -4 8 0" stroke="#5d7846" strokeWidth="1.2" fill="none" />
        <path d="M 290 220 q 3 -3 6 0 q 3 -3 6 0" stroke="#5d7846" strokeWidth="1.2" fill="none" />
      </svg>

      {/* Scene markers as absolute-positioned buttons */}
      {points.map((pt, i) => {
        const scene = scenes[i];
        const done = completed.includes(scene.order);
        return (
          <button
            key={scene.order}
            onClick={() => onPick(scene)}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${(pt.x / W) * 100}%`, top: `${(pt.y / H) * 100}%` }}
          >
            <div className="relative">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center cn-serif text-[14px] shadow-lg transition-transform group-hover:scale-110"
                style={{
                  background: done
                    ? "linear-gradient(160deg, #f5b8c4, #e8c97a)"
                    : "linear-gradient(160deg, #fffdf3, #f3ead0)",
                  color: "#3d3530",
                  border: "2px solid #fff8e8",
                  boxShadow: "0 4px 12px rgba(80,90,60,0.35)",
                }}
              >
                {done ? "✓" : scene.order}
              </div>
              <div
                className="absolute left-1/2 -translate-x-1/2 mt-1 cn-serif text-[11px] whitespace-nowrap px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,253,243,0.92)", color: "#3d3530", boxShadow: "0 2px 6px rgba(0,0,0,0.08)" }}
              >
                {scene.scene_name}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ============ Scene bottom sheet ============ */

function SceneSheet({
  scene, done, city, onClose, onToggle,
}: {
  scene: JourneyScene;
  done: boolean;
  city?: string;
  onClose: () => void;
  onToggle: () => void;
}) {
  const mapHref = `https://uri.amap.com/marker?name=${encodeURIComponent(scene.location_name)}&src=todaypersona&coordinate=gaode&callnative=1`;
  const meituanHref = `https://i.meituan.com/s/${encodeURIComponent(scene.meituan_keyword || scene.location_name)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full max-w-xl rounded-t-3xl bg-[var(--card)] p-6 fade-up"
        style={{ maxHeight: "85vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="scene-chip">SCENE 0{scene.order}</div>
          <button onClick={onClose} className="display text-[12px] opacity-70">关闭 ✕</button>
        </div>

        <h3 className="cn-serif text-[22px] text-[var(--ink)] leading-snug">「{scene.scene_name}」</h3>
        <div className="cn-serif text-[13px] text-[var(--ink-soft)] mt-1">
          {scene.location_name} <span className="opacity-70 ml-1">· {scene.location_type}</span>
        </div>
        {scene.location_hint && (
          <div className="cn-serif text-[12px] text-[var(--ink-soft)] mt-0.5">
            📍 {scene.location_hint}{city ? ` · ${city}` : ""} · 停留~{scene.stay_minutes}min
          </div>
        )}

        <p className="cn-serif text-[15px] leading-[1.9] text-[var(--ink)] mt-4">
          {scene.persona_narrative}
        </p>

        <div className="mt-4 px-4 py-3 rounded-2xl bg-[oklch(0.97_0.025_60)] border border-[var(--border)]">
          <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)] mb-1.5">YOUR TASK</div>
          <div className="cn-serif text-[14px] text-[var(--ink)] italic">{scene.action_task}</div>
        </div>

        {scene.emotion_tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {scene.emotion_tags.map((t) => (
              <span key={t} className="cn-serif text-[11px] px-2.5 py-1 rounded-full bg-[var(--muted)] text-[var(--ink-soft)]">#{t}</span>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <a href={mapHref} target="_blank" rel="noreferrer" className="btn-ghost flex-1 justify-center">🧭 导航</a>
          <a href={meituanHref} target="_blank" rel="noreferrer" className="btn-ghost flex-1 justify-center">🥡 美团</a>
          <button onClick={onToggle} className="btn-soft" style={{ padding: "10px 16px" }}>
            {done ? "✓ 已打卡" : "打卡"}
          </button>
        </div>
      </div>
    </div>
  );
}
