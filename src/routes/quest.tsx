import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { loadRun } from "@/lib/quest-store";
import type { QuestRunState, Stage } from "@/lib/quest-types";
import { PixelAvatar } from "@/components/PixelAvatar";
import { PixelScene } from "@/components/PixelScene";
import { PixelMapIcon, pickMapIconKind } from "@/components/PixelMapIcon";

export const Route = createFileRoute("/quest")({
  component: QuestPage,
});

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
      <div className="text-xs text-muted-foreground mb-4">
        {run.character} · {run.emotion}
      </div>

      <div
        className="pixel-panel mb-5 flex items-center gap-4 p-4"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.25 0.08 280) 0%, oklch(0.18 0.06 240) 100%)",
        }}
      >
        <div className="pixel-panel p-1 flex-shrink-0" style={{ background: "#0a0a18" }}>
          <PixelAvatar character={run.character} size={88} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs pixel text-accent mb-1">▸ 当前角色</div>
          <div className="text-base font-bold">{run.character}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Lv.1 · 装备：好奇心、半张地铁卡
          </div>
        </div>
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
      <div className="text-xs text-muted-foreground mb-3">
        {run.character} · {run.emotion}
      </div>

      {/* Pixel panorama — stitches every stage scene into one continuous strip */}
      <div className="pixel-panel overflow-hidden mb-4 flex">
        {stages.map((s, i) => {
          const unlocked = run.unlockedStageOrders.includes(s.order);
          return (
            <div
              key={s.order}
              className="flex-1 relative"
              style={{
                borderRight:
                  i < stages.length - 1
                    ? "1px dashed color-mix(in oklab, var(--color-primary) 40%, transparent)"
                    : undefined,
                filter: unlocked ? undefined : "saturate(0.35) brightness(0.7)",
              }}
            >
              <PixelScene locationType={s.location_type} height={72} />
              <div className="absolute top-1 left-1 text-[9px] pixel text-accent bg-black/60 px-1">
                {s.order}
              </div>
            </div>
          );
        })}
      </div>

      {/* RPG Map */}
      <div
        className="pixel-panel relative w-full mb-5 overflow-hidden"
        style={{
          height: 480,
          background:
            "linear-gradient(180deg, oklch(0.16 0.06 290) 0%, oklch(0.22 0.09 270) 35%, oklch(0.28 0.10 260) 55%, oklch(0.30 0.12 40) 75%, oklch(0.22 0.10 30) 100%)",
        }}
      >
        {/* Moon */}
        <div
          className="absolute"
          style={{
            right: "12%",
            top: "8%",
            width: 36,
            height: 36,
            background: "var(--color-primary)",
            boxShadow:
              "0 0 24px color-mix(in oklab, var(--color-primary) 60%, transparent), inset -6px -4px 0 0 oklch(0.7 0.14 90)",
            clipPath:
              "polygon(0 25%, 12% 12%, 25% 0, 75% 0, 88% 12%, 100% 25%, 100% 75%, 88% 88%, 75% 100%, 25% 100%, 12% 88%, 0 75%)",
          }}
        />
        {/* Drifting clouds */}
        <div
          className="absolute"
          style={{
            left: "8%",
            top: "14%",
            width: 56,
            height: 10,
            background: "oklch(0.4 0.05 280 / 0.55)",
            boxShadow:
              "10px -4px 0 0 oklch(0.4 0.05 280 / 0.55), 22px -2px 0 0 oklch(0.4 0.05 280 / 0.55), 32px 2px 0 0 oklch(0.4 0.05 280 / 0.55)",
            animation: "cloud-drift 28s linear infinite",
          }}
        />
        <div
          className="absolute"
          style={{
            left: "55%",
            top: "22%",
            width: 40,
            height: 8,
            background: "oklch(0.4 0.05 280 / 0.4)",
            boxShadow:
              "8px -2px 0 0 oklch(0.4 0.05 280 / 0.4), 18px 2px 0 0 oklch(0.4 0.05 280 / 0.4)",
            animation: "cloud-drift 40s linear infinite reverse",
          }}
        />

        {/* Distant mountain layer (back) */}
        <svg
          className="absolute inset-x-0 w-full"
          viewBox="0 0 64 16"
          preserveAspectRatio="none"
          shapeRendering="crispEdges"
          style={{ bottom: "32%", height: "22%" }}
        >
          <polygon
            points="0,16 0,12 6,6 12,9 18,4 26,10 32,7 40,11 48,5 56,9 64,7 64,16"
            fill="oklch(0.20 0.06 270 / 0.7)"
          />
        </svg>
        {/* Mid mountains */}
        <svg
          className="absolute inset-x-0 bottom-0 w-full"
          viewBox="0 0 64 16"
          preserveAspectRatio="none"
          shapeRendering="crispEdges"
          style={{ height: "45%" }}
        >
          <polygon
            points="0,16 0,10 8,4 14,8 22,2 30,9 38,5 46,10 54,3 62,8 64,6 64,16"
            fill="oklch(0.15 0.05 270)"
          />
          <polygon
            points="0,16 0,13 10,8 20,12 28,6 40,12 50,8 60,11 64,9 64,16"
            fill="oklch(0.09 0.03 270)"
          />
        </svg>
        {/* Tiny pine forest silhouette on ridge */}
        <svg
          className="absolute inset-x-0 w-full pointer-events-none"
          viewBox="0 0 100 8"
          preserveAspectRatio="none"
          shapeRendering="crispEdges"
          style={{ bottom: "30%", height: "8%" }}
        >
          {[8, 14, 22, 38, 52, 68, 78, 88].map((x, i) => (
            <g key={i} fill="oklch(0.10 0.03 270)">
              <polygon points={`${x - 1},8 ${x},4 ${x + 1},8`} />
              <rect x={x - 0.15} y={7} width={0.3} height={1} />
            </g>
          ))}
        </svg>

        {/* Stars (twinkling) */}
        {[
          [12, 14, 1.6], [28, 8, 2.4], [55, 18, 1.2], [70, 6, 1.8],
          [85, 12, 2.0], [40, 25, 1.4], [62, 28, 1.6], [22, 30, 1.2],
          [92, 24, 1.5], [6, 22, 1.3],
        ].map(([x, y, d], i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: 2,
              height: 2,
              background: "var(--color-accent)",
              boxShadow: "0 0 4px var(--color-accent)",
              animation: `star-twinkle ${1.8 + (i % 3) * 0.6}s ease-in-out ${i * 0.2}s infinite`,
              opacity: d as number / 2.4,
            }}
          />
        ))}
        {/* Shooting star */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "12%",
            left: "-10%",
            width: 40,
            height: 1,
            background:
              "linear-gradient(90deg, transparent, var(--color-accent))",
            boxShadow: "0 0 6px var(--color-accent)",
            animation: "shooting-star 7s ease-in 2s infinite",
          }}
        />

        {/* Grid backdrop + paths */}
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
                stroke="oklch(0.4 0.05 280 / 0.22)"
                strokeWidth="0.3"
              />
            </pattern>
            <radialGradient id="vignette" cx="50%" cy="50%" r="65%">
              <stop offset="60%" stopColor="oklch(0 0 0 / 0)" />
              <stop offset="100%" stopColor="oklch(0 0 0 / 0.5)" />
            </radialGradient>
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
              <g key={`path-${i}`}>
                {unlocked && (
                  <line
                    x1={prev.x}
                    y1={prev.y}
                    x2={n.x}
                    y2={n.y}
                    stroke="var(--color-primary)"
                    strokeWidth={2.4}
                    strokeOpacity={0.35}
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                  />
                )}
                <line
                  x1={prev.x}
                  y1={prev.y}
                  x2={n.x}
                  y2={n.y}
                  stroke={unlocked ? "var(--color-primary)" : "var(--color-border)"}
                  strokeWidth={unlocked ? 0.9 : 0.5}
                  strokeDasharray={unlocked ? "2,1.5" : "1.5,1.5"}
                  vectorEffect="non-scaling-stroke"
                  className="dashed-path"
                />
              </g>
            );
          })}
          <rect width="100" height="100" fill="url(#vignette)" pointerEvents="none" />
        </svg>

        {/* Compass rose */}
        <div
          className="absolute pixel-panel flex items-center justify-center pixel text-[10px] text-primary"
          style={{ left: 8, top: 8, width: 36, height: 36, background: "oklch(0.15 0.04 280 / 0.85)" }}
          aria-hidden
        >
          <span style={{ position: "absolute", top: 2 }}>N</span>
          <span style={{ color: "var(--color-accent)" }}>✦</span>
        </div>

        {/* Nodes */}
        {nodes.map((n) => {
          const unlocked = run.unlockedStageOrders.includes(n.stage.order);
          const kind = pickMapIconKind(n.stage.location_type);
          return (
            <Link
              key={n.stage.order}
              to="/stage/$order"
              params={{ order: String(n.stage.order) }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group"
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
            >
              {unlocked && (
                <div
                  className="absolute -inset-2 rounded-none pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle, color-mix(in oklab, var(--color-primary) 35%, transparent) 0%, transparent 70%)",
                  }}
                />
              )}
              <div
                className={`pixel-panel w-14 h-14 flex items-center justify-center transition-transform group-hover:-translate-y-0.5 ${
                  unlocked ? "glow-gold" : ""
                }`}
                style={{
                  background: unlocked
                    ? "color-mix(in oklab, var(--color-primary) 30%, var(--color-card))"
                    : "var(--color-card)",
                  borderColor: unlocked ? "var(--color-primary)" : undefined,
                }}
              >
                <PixelMapIcon kind={kind} size={44} />
              </div>
              <div
                className="mt-1 pixel-panel px-2 py-1 text-[10px] pixel whitespace-nowrap"
                style={{ background: "oklch(0.15 0.04 280 / 0.9)" }}
              >
                {n.stage.order}. {n.stage.stage_name.slice(0, 6)}
              </div>
            </Link>
          );
        })}

        {/* Player avatar marker — sits on current (next-to-unlock) stage */}
        {(() => {
          const currentIdx = nodes.findIndex(
            (n) => !run.unlockedStageOrders.includes(n.stage.order),
          );
          const idx = currentIdx === -1 ? nodes.length - 1 : currentIdx;
          const n = nodes[idx]!;
          return (
            <>
              {/* "YOU" pin pulse */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${n.x}%`,
                  top: `${n.y}%`,
                  width: 56,
                  height: 56,
                  transform: "translate(-50%, -50%)",
                  borderRadius: 0,
                  boxShadow:
                    "0 0 0 2px color-mix(in oklab, var(--color-accent) 70%, transparent)",
                  animation: "pulse-ring 1.6s ease-out infinite",
                }}
              />
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${n.x}%`,
                  top: `${n.y}%`,
                  transform: "translate(-120%, -120%)",
                  animation: "bounce-soft 1.2s ease-in-out infinite",
                }}
              >
                <div className="pixel-panel p-0.5" style={{ background: "#0a0a18" }}>
                  <PixelAvatar character={run.character} size={40} />
                </div>
                <div
                  className="pixel text-[8px] text-center mt-1 px-1"
                  style={{
                    background: "var(--color-accent)",
                    color: "var(--color-primary-foreground)",
                  }}
                >
                  YOU
                </div>
              </div>
            </>
          );
        })()}

        {/* Legend */}
        <div
          className="absolute bottom-2 right-2 pixel-panel px-2 py-1 text-[9px] pixel flex items-center gap-2"
          style={{ background: "oklch(0.15 0.04 280 / 0.85)" }}
        >
          <span className="flex items-center gap-1">
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                background: "var(--color-primary)",
                boxShadow: "0 0 4px var(--color-primary)",
              }}
            />
            已解锁
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                background: "var(--color-border)",
              }}
            />
            未开
          </span>
        </div>
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
      className="pixel-panel overflow-hidden flex active:translate-x-px"
      style={{
        borderColor: unlocked ? "var(--color-primary)" : undefined,
      }}
    >
      <div className="w-24 flex-shrink-0 relative">
        <PixelScene locationType={stage.location_type} height={84} />
        <div
          className="absolute top-1 left-1 w-6 h-6 flex items-center justify-center pixel-panel text-[10px] pixel"
          style={{
            background: unlocked ? "var(--color-primary)" : "var(--color-secondary)",
            color: unlocked
              ? "var(--color-primary-foreground)"
              : "var(--color-foreground)",
          }}
        >
          {unlocked ? "✓" : stage.order}
        </div>
      </div>
      <div className="flex-1 min-w-0 p-3 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate">{stage.stage_name}</div>
          <div className="text-xs text-muted-foreground truncate">
            📍 {stage.location_name}
          </div>
          <div className="text-[10px] text-accent mt-0.5 truncate flex items-center gap-1">
            <PixelMapIcon kind={pickMapIconKind(stage.location_type)} size={14} />
            {stage.location_type}
          </div>
        </div>
        <div className="text-xs pixel text-accent">▸</div>
      </div>
    </Link>
  );
}
