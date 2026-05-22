import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { loadRun } from "@/lib/quest-store";
import type { QuestRunState, Stage } from "@/lib/quest-types";
import { PixelAvatar } from "@/components/PixelAvatar";
import { PixelScene } from "@/components/PixelScene";

export const Route = createFileRoute("/quest")({
  component: QuestPage,
});

function locationIcon(type: string): string {
  const t = type.toLowerCase();
  if (/(咖啡|书|图书)/.test(t)) return "☕";
  if (/(公园|花园|绿)/.test(t)) return "🌳";
  if (/(博物|古|寺|庙|遗)/.test(t)) return "🏛️";
  if (/(水|江|河|海|湖|桥)/.test(t)) return "⛵";
  if (/(市场|集|夜市|小吃|餐|食)/.test(t)) return "🏮";
  if (/(山|郊|野|林|森)/.test(t)) return "⛰️";
  return "🏙️";
}

function useTypewriter(text: string, speed = 40) {
  const [out, setOut] = useState("");
  useEffect(() => {
    setOut("");
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return out;
}

function QuestPage() {
  const navigate = useNavigate();
  const [run, setRun] = useState<QuestRunState | null>(null);
  const [phase, setPhase] = useState<"brief" | "map">("brief");

  useEffect(() => {
    const r = loadRun();
    if (!r) {
      navigate({ to: "/" });
      return;
    }
    setRun(r);
  }, [navigate]);

  if (!run) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground pixel text-xs">
        LOADING…
      </div>
    );
  }

  return phase === "brief" ? (
    <BriefScreen run={run} onContinue={() => setPhase("map")} />
  ) : (
    <MapScreen run={run} />
  );
}

function BriefScreen({
  run,
  onContinue,
}: {
  run: QuestRunState;
  onContinue: () => void;
}) {
  const typed = useTypewriter(run.quest.quest_brief, 38);
  const done = typed.length === run.quest.quest_brief.length;

  return (
    <div className="crt-overlay min-h-screen px-5 py-8 max-w-xl mx-auto flex flex-col">
      <div className="text-xs pixel text-accent mb-2">[ DM · 召唤完成 ]</div>
      <h1 className="text-2xl pixel text-primary mb-1 leading-tight">
        《{run.quest.quest_name}》
      </h1>
      <div className="text-xs text-muted-foreground mb-6">
        {run.character} · {run.emotion}
      </div>

      <div className="pixel-panel p-5 mb-6 flex-1">
        <div className="text-xs pixel text-accent mb-3">▸ DM 开场白</div>
        <p
          className="text-base leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: "var(--font-serif-cn)" }}
        >
          <span className={done ? "" : "cursor-blink"}>{typed}</span>
        </p>
      </div>

      <div className="pixel-panel p-4 mb-6">
        <div className="text-xs pixel text-accent mb-2">▸ 情绪弧线</div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-destructive">{run.quest.emotion_arc.start}</span>
          <span className="text-primary pixel">→</span>
          <span className="text-accent">{run.quest.emotion_arc.end}</span>
        </div>
      </div>

      <button
        onClick={onContinue}
        disabled={!done}
        className="pixel-btn w-full"
      >
        ▶ 展开副本地图
      </button>
    </div>
  );
}

function MapScreen({ run }: { run: QuestRunState }) {
  const stages = run.quest.stages;
  const allUnlocked = stages.every((s) =>
    run.unlockedStageOrders.includes(s.order),
  );

  // Build SVG zig-zag node positions
  const nodes = useMemo(() => {
    return stages.map((s, i) => {
      const yPct = 10 + (i * 80) / Math.max(1, stages.length - 1);
      const xPct = i % 2 === 0 ? 25 : 75;
      return { stage: s, x: xPct, y: yPct };
    });
  }, [stages]);

  return (
    <div className="crt-overlay min-h-screen px-5 py-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link to="/" className="text-xs pixel text-muted-foreground">
          ◂ 重选
        </Link>
        <div className="text-xs pixel text-accent">
          {run.unlockedStageOrders.length}/{stages.length} 关卡
        </div>
      </div>

      <h1 className="text-xl pixel text-primary mb-1 leading-tight">
        《{run.quest.quest_name}》
      </h1>
      <div className="text-xs text-muted-foreground mb-5">
        {run.character} · {run.emotion}
      </div>

      {/* RPG Map */}
      <div
        className="pixel-panel relative w-full mb-5 overflow-hidden"
        style={{
          height: 360,
          background:
            "linear-gradient(180deg, oklch(0.22 0.06 280) 0%, oklch(0.18 0.05 240) 100%)",
        }}
      >
        {/* Grid backdrop */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
              <path
                d="M 5 0 L 0 0 0 5"
                fill="none"
                stroke="oklch(0.4 0.05 280 / 0.4)"
                strokeWidth="0.3"
              />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />

          {/* Connecting paths */}
          {nodes.map((n, i) => {
            if (i === 0) return null;
            const prev = nodes[i - 1]!;
            const unlocked =
              run.unlockedStageOrders.includes(prev.stage.order) &&
              run.unlockedStageOrders.includes(n.stage.order);
            return (
              <line
                key={`path-${i}`}
                x1={prev.x}
                y1={prev.y}
                x2={n.x}
                y2={n.y}
                stroke={
                  unlocked ? "var(--color-primary)" : "var(--color-border)"
                }
                strokeWidth={unlocked ? 0.6 : 0.4}
                className={unlocked ? "" : "dashed-path"}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((n, i) => {
          const unlocked = run.unlockedStageOrders.includes(n.stage.order);
          const icon = STAGE_ICONS[i % STAGE_ICONS.length];
          return (
            <Link
              key={n.stage.order}
              to="/stage/$order"
              params={{ order: String(n.stage.order) }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
            >
              <div
                className={`pixel-panel w-14 h-14 flex items-center justify-center text-3xl ${
                  unlocked ? "glow-gold" : ""
                }`}
                style={{
                  background: unlocked
                    ? "color-mix(in oklab, var(--color-primary) 30%, var(--color-card))"
                    : "var(--color-card)",
                  borderColor: unlocked
                    ? "var(--color-primary)"
                    : undefined,
                }}
              >
                {icon}
              </div>
              <div className="mt-1 pixel-panel px-2 py-1 text-[10px] pixel whitespace-nowrap">
                {n.stage.order}. {n.stage.stage_name.slice(0, 7)}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Stage list */}
      <div className="space-y-3 mb-6">
        {stages.map((s) => {
          const unlocked = run.unlockedStageOrders.includes(s.order);
          return <StageRow key={s.order} stage={s} unlocked={unlocked} />;
        })}
      </div>

      {allUnlocked && (
        <Link to="/report" className="pixel-btn block text-center w-full">
          ★ 查看通关报告
        </Link>
      )}
    </div>
  );
}

function StageRow({ stage, unlocked }: { stage: Stage; unlocked: boolean }) {
  return (
    <Link
      to="/stage/$order"
      params={{ order: String(stage.order) }}
      className="pixel-panel p-3 flex items-center gap-3 active:translate-x-px"
      style={{
        borderColor: unlocked ? "var(--color-primary)" : undefined,
      }}
    >
      <div
        className="w-10 h-10 flex-shrink-0 flex items-center justify-center pixel-panel text-sm pixel"
        style={{
          background: unlocked ? "var(--color-primary)" : "var(--color-secondary)",
          color: unlocked
            ? "var(--color-primary-foreground)"
            : "var(--color-foreground)",
        }}
      >
        {unlocked ? "✓" : stage.order}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate">{stage.stage_name}</div>
        <div className="text-xs text-muted-foreground truncate">
          📍 {stage.location_name}
        </div>
      </div>
      <div className="text-xs pixel text-accent">▸</div>
    </Link>
  );
}
