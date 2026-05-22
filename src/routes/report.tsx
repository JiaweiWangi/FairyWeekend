import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { clearRun, loadRun } from "@/lib/quest-store";
import type { QuestRunState } from "@/lib/quest-types";

export const Route = createFileRoute("/report")({
  component: ReportPage,
});

function ReportPage() {
  const navigate = useNavigate();
  const [run, setRun] = useState<QuestRunState | null>(null);

  useEffect(() => {
    const r = loadRun();
    if (!r) {
      navigate({ to: "/" });
      return;
    }
    setRun(r);
  }, [navigate]);

  if (!run) return null;
  const totalStages = run.quest.stages.length;
  const unlocked = run.unlockedStageOrders.length;
  const date = new Date(run.createdAt).toLocaleDateString("zh-CN");

  function handleRestart() {
    clearRun();
    navigate({ to: "/" });
  }

  function handleShare() {
    const text = `我刚通关了城市副本《${run!.quest.quest_name}》，职业：${run!.character}。${run!.quest.completion_speech}`;
    if (navigator.share) {
      navigator.share({ title: "异界漂流", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert("已复制分享文案，去发小红书吧！");
    }
  }

  return (
    <div className="crt-overlay min-h-screen px-5 py-8 max-w-xl mx-auto">
      <div className="text-xs pixel text-accent mb-2 text-center">
        [ QUEST COMPLETE ]
      </div>

      {/* Poster card */}
      <div
        className="pixel-border p-6 mx-1 mb-6"
        style={{
          background:
            "linear-gradient(160deg, oklch(0.25 0.07 280) 0%, oklch(0.2 0.08 240) 100%)",
        }}
      >
        <div className="text-center mb-5">
          <div className="text-xs pixel text-accent mb-2">DRIFTQUEST · {date}</div>
          <h1 className="text-2xl pixel text-primary leading-tight mb-2">
            《{run.quest.quest_name}》
          </h1>
          <div className="text-sm text-muted-foreground">
            {run.character} · {run.emotion}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5 text-center">
          <Stat label="关卡" value={`${unlocked}/${totalStages}`} />
          <Stat label="停留" value={`${run.quest.stages.reduce((a, s) => a + s.stay_minutes, 0)}分`} />
          <Stat label="评分" value="★★★" />
        </div>

        {/* Emotion arc */}
        <div className="pixel-panel p-3 mb-5">
          <div className="text-xs pixel text-accent mb-2">▸ 情绪弧线</div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-destructive">{run.quest.emotion_arc.start}</span>
            <span className="text-primary pixel mx-2">→</span>
            <span className="text-accent text-right">{run.quest.emotion_arc.end}</span>
          </div>
        </div>

        {/* DM closing */}
        <div className="pixel-panel p-4 mb-3">
          <div className="text-xs pixel text-accent mb-2">▸ DM 手书</div>
          <p
            className="text-sm leading-relaxed"
            style={{ fontFamily: "var(--font-serif-cn)" }}
          >
            {run.quest.completion_speech}
          </p>
        </div>

        {/* Stages summary */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {run.quest.stages.map((s) => {
            const done = run.unlockedStageOrders.includes(s.order);
            return (
              <div key={s.order} className="flex items-start gap-2">
                <span
                  className="pixel"
                  style={{
                    color: done ? "var(--color-primary)" : "var(--color-muted-foreground)",
                  }}
                >
                  {done ? "✓" : "○"}
                </span>
                <span className={done ? "text-foreground" : ""}>
                  {s.stage_name} · {s.location_name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={handleShare} className="pixel-btn w-full mb-3">
        ↗ 分享战绩
      </button>
      <button
        onClick={handleRestart}
        className="pixel-btn pixel-btn-secondary w-full"
      >
        ⟲ 开启新副本
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="pixel-panel p-2">
      <div className="text-xs pixel text-primary">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
