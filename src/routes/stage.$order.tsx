import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadRun, unlockStage } from "@/lib/quest-store";
import type { QuestRunState, Stage } from "@/lib/quest-types";
import { PixelAvatar } from "@/components/PixelAvatar";
import { PixelScene } from "@/components/PixelScene";

export const Route = createFileRoute("/stage/$order")({
  component: StagePage,
});

function StagePage() {
  const { order } = useParams({ from: "/stage/$order" });
  const navigate = useNavigate();
  const [run, setRun] = useState<QuestRunState | null>(null);
  const [justUnlocked, setJustUnlocked] = useState(false);

  useEffect(() => {
    const r = loadRun();
    if (!r) {
      navigate({ to: "/" });
      return;
    }
    setRun(r);
  }, [navigate]);

  if (!run) return null;
  const stage = run.quest.stages.find((s) => String(s.order) === order);
  if (!stage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Link to="/quest" className="pixel-btn">
          ◂ 返回地图
        </Link>
      </div>
    );
  }

  const unlocked = run.unlockedStageOrders.includes(stage.order);

  function handleUnlock() {
    unlockStage(stage!.order);
    const updated = loadRun();
    setRun(updated);
    setJustUnlocked(true);
    setTimeout(() => setJustUnlocked(false), 1800);
  }

  const meituanUrl = `https://i.meituan.com/search?q=${encodeURIComponent(
    stage.meituan_keyword,
  )}`;
  const mapUrl = `https://uri.amap.com/search?keyword=${encodeURIComponent(
    `${stage.location_name} ${stage.location_hint}`,
  )}`;

  return (
    <div className="crt-overlay min-h-screen px-5 py-6 max-w-xl mx-auto">
      <Link to="/quest" className="text-xs pixel text-muted-foreground">
        ◂ 副本地图
      </Link>

      <div className="text-xs pixel text-accent mt-4 mb-1">
        关卡 {stage.order} / {run.quest.stages.length}
      </div>
      <h1 className="text-xl pixel text-primary leading-tight mb-3">
        《{stage.stage_name}》
      </h1>

      {/* Hero scene with character */}
      <div className="pixel-panel relative overflow-hidden mb-4">
        <PixelScene locationType={stage.location_type} height={160} />
        {/* speech bubble */}
        <div
          className="absolute pixel text-[8px] px-2 py-1 bg-background border-2 border-primary text-primary"
          style={{
            left: "22%",
            top: "10px",
            animation: "bounce-soft 2.4s ease-in-out infinite",
            transformOrigin: "bottom left",
          }}
        >
          ★ 关卡 {stage.order}
        </div>
        <div
          className="absolute"
          style={{
            left: "12%",
            bottom: "8px",
            animation: "avatar-hop 1.6s ease-in-out infinite",
          }}
        >
          <PixelAvatar character={run.character} size={56} />
        </div>
        {/* floating sparkles */}
        <div
          className="absolute text-primary text-xs"
          style={{ right: "18%", top: "30%", animation: "sparkle-float 3s ease-in-out infinite" }}
        >
          ✦
        </div>
        <div
          className="absolute text-accent text-xs"
          style={{ right: "30%", top: "55%", animation: "sparkle-float 3.4s ease-in-out infinite 0.8s" }}
        >
          ✧
        </div>
      </div>

      <StageBlock label="真实地点">
        <div className="font-bold text-base">{stage.location_name}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {stage.location_type} · {stage.location_hint}
        </div>
      </StageBlock>

      <StageBlock label="任务目标" accent>
        <div
          className="text-sm leading-relaxed"
          style={{ fontFamily: "var(--font-serif-cn)" }}
        >
          {stage.mission}
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          ⏱ 建议停留 {stage.stay_minutes} 分钟
        </div>
      </StageBlock>

      <StageBlock label="DM 旁白">
        <p
          className="text-sm leading-relaxed"
          style={{ fontFamily: "var(--font-serif-cn)" }}
        >
          {stage.dm_narrative}
        </p>
      </StageBlock>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <a
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          className="pixel-btn pixel-btn-secondary text-center text-xs"
        >
          📍 导航
        </a>
        <a
          href={meituanUrl}
          target="_blank"
          rel="noreferrer"
          className="pixel-btn pixel-btn-secondary text-center text-xs"
        >
          🍜 美团
        </a>
      </div>

      {!unlocked ? (
        <button onClick={handleUnlock} className="pixel-btn w-full">
          ★ 我到了 · 解锁关卡
        </button>
      ) : (
        <UnlockedPanel stage={stage} justUnlocked={justUnlocked} run={run} />
      )}

      <div className="mt-6 text-center">
        <Link to="/quest" className="text-xs pixel text-muted-foreground">
          回到地图 ▸
        </Link>
      </div>
    </div>
  );
}

function StageBlock({
  label,
  children,
  accent,
}: {
  label: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className="pixel-panel p-4 mb-3"
      style={{
        borderColor: accent ? "var(--color-primary)" : undefined,
      }}
    >
      <div className="text-xs pixel text-accent mb-2">▸ {label}</div>
      {children}
    </div>
  );
}

function UnlockedPanel({
  stage,
  justUnlocked,
  run,
}: {
  stage: Stage;
  justUnlocked: boolean;
  run: QuestRunState;
}) {
  const next = run.quest.stages.find((s) => s.order === stage.order + 1);
  const allDone = run.unlockedStageOrders.length === run.quest.stages.length;

  return (
    <div
      className="pixel-panel p-4"
      style={{
        background: "color-mix(in oklab, var(--color-primary) 16%, var(--color-card))",
        borderColor: "var(--color-primary)",
      }}
    >
      <div className="text-xs pixel text-primary mb-2">
        {justUnlocked ? "★ 关卡解锁！" : "✓ 已完成"}
      </div>
      <p
        className="text-sm leading-relaxed mb-3"
        style={{ fontFamily: "var(--font-serif-cn)" }}
      >
        {stage.unlock_words}
      </p>
      <div className="text-xs text-muted-foreground mb-3">
        ↳ {stage.transition}
      </div>
      {next ? (
        <Link
          to="/stage/$order"
          params={{ order: String(next.order) }}
          className="pixel-btn block text-center w-full text-xs"
        >
          ▶ 前往下一关：{next.stage_name}
        </Link>
      ) : allDone ? (
        <Link to="/report" className="pixel-btn block text-center w-full text-xs">
          ★ 副本通关 · 查看报告
        </Link>
      ) : (
        <Link to="/quest" className="pixel-btn block text-center w-full text-xs">
          ◂ 回到地图
        </Link>
      )}
    </div>
  );
}
