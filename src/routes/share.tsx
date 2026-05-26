import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadPublicPostchainShareCloud, type PublicPostchainShare } from "@/lib/postchain-share";
import { saveRun } from "@/lib/persona-store";
import { VenueIcon, detectVenue } from "@/components/VenueIcon";
import { supabase } from "@/integrations/supabase/client";
import type { DmMemorySnapshot } from "@/lib/city-preference";
import {
  buildAdaptedJourneyFromArchive,
  revalidateRouteForReplay,
  type AdaptedJourneyResult,
  type RouteRevalidationResult,
} from "@/lib/postchain-route";

export const Route = createFileRoute("/share")({ component: SharePage });

function SharePage() {
  const navigate = useNavigate();
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const shareId = params.get("id");
  const [share, setShare] = useState<PublicPostchainShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [memory, setMemory] = useState<DmMemorySnapshot | null>(null);
  const [memoryLoaded, setMemoryLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadPublicPostchainShareCloud(shareId).then((item) => {
      if (cancelled) return;
      setShare(item);
      setLoading(false);
    });
    (async () => {
      try {
        const { data, error } = await supabase
          .from("dm_memory")
          .select("profile,loved_tags,disliked_tags,visited_pois,total_runs")
          .eq("player_key", "default")
          .maybeSingle();
        if (!cancelled && !error && data) setMemory(data);
      } catch {
        // Personalization is optional on public share pages.
      } finally {
        if (!cancelled) setMemoryLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen px-5 py-16 max-w-xl mx-auto flex items-center justify-center">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
          <div className="display text-[10px] tracking-[0.35em] text-[var(--ink-soft)]">
            SHARE · LOADING
          </div>
          <h1 className="cn-serif text-[22px] text-[var(--ink)] mt-2">正在读取这份路线报告</h1>
        </div>
      </div>
    );
  }

  if (!share) {
    return (
      <div className="min-h-screen px-5 py-16 max-w-xl mx-auto flex items-center justify-center">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
          <div className="display text-[10px] tracking-[0.35em] text-[var(--ink-soft)]">
            SHARE · NOT FOUND
          </div>
          <h1 className="cn-serif text-[22px] text-[var(--ink)] mt-2">这份报告不存在或已失效</h1>
          <button onClick={() => navigate({ to: "/" })} className="btn-soft mt-6">
            回到首页
          </button>
        </div>
      </div>
    );
  }

  const { chapter, report, privacy } = share;
  const routeCheck = revalidateRouteForReplay(chapter);
  const adapted = buildAdaptedJourneyFromArchive(chapter, memory);

  function replayRoute(adaptedMode = false) {
    if (!routeCheck.canReplay) return;
    saveRun({
      card: chapter.card,
      city: chapter.city,
      journey: adaptedMode ? adapted.journey : chapter.journey,
      completedSceneOrders: [],
      createdAt: Date.now(),
    });
    navigate({ to: "/journey" });
  }

  return (
    <div
      className="min-h-screen pb-20"
      style={{ background: "linear-gradient(180deg, #fdfaf6 0%, #f6efe4 60%, #ede4d3 100%)" }}
    >
      <div className="max-w-xl mx-auto px-5 pt-6">
        <button
          onClick={() => navigate({ to: "/" })}
          className="display text-[11px] tracking-[0.3em] text-[var(--ink)] opacity-70"
        >
          ← 今日人设
        </button>
      </div>

      <main className="max-w-xl mx-auto px-5 mt-6 space-y-5">
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-[0_24px_70px_-42px_rgba(0,0,0,0.45)]">
          <div
            className="relative min-h-[420px] p-5"
            style={{
              background: `linear-gradient(180deg, rgba(255,253,243,0.92) 0%, rgba(255,248,240,0.98) 100%), linear-gradient(135deg, ${chapter.card.colors[0]}, ${chapter.card.colors[1]})`,
            }}
          >
            <div className="display text-[10px] tracking-[0.35em] text-[var(--ink-soft)]">
              SHARED CITY ROUTE REPORT
            </div>
            <h1 className="cn-serif text-[32px] leading-tight text-[var(--ink)] mt-5">
              {report.identityBadge}
            </h1>
            <p className="cn-serif text-[14px] leading-relaxed text-[var(--ink)] mt-3">
              {report.flexLine}
            </p>

            <div className="mt-5 rounded-2xl bg-[var(--card)]/85 border border-[var(--border)] p-4">
              <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
                {report.poemType}
              </div>
              <div className="mt-2 space-y-1">
                {report.poemLines.map((line) => (
                  <p key={line} className="cn-serif text-[17px] leading-relaxed text-[var(--ink)]">
                    {line}
                  </p>
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-[var(--card)]/85 border border-[var(--border)] p-3">
                <strong className="display text-[28px] leading-none text-[var(--accent)]">
                  {report.completionPercent}%
                </strong>
                <span className="block cn-serif text-[11px] text-[var(--ink-soft)] mt-1">
                  路线完成度
                </span>
              </div>
              <div className="rounded-2xl bg-[var(--card)]/85 border border-[var(--border)] p-3">
                <strong className="display text-[28px] leading-none text-[var(--accent)]">
                  {report.routeKeywords.length}
                </strong>
                <span className="block cn-serif text-[11px] text-[var(--ink-soft)] mt-1">
                  路线关键词
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
            ROUTE · 节点概览
          </div>
          <div className="mt-3 grid gap-2">
            {chapter.journey.scenes.map((scene) => {
              const done = chapter.completedSceneOrders.includes(scene.order);
              const name = privacy.showMerchantNames ? scene.location_name : scene.scene_name;
              return (
                <div
                  key={scene.order}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/45 px-3 py-3 flex items-center gap-3"
                >
                  <div className="w-11 h-11 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center shrink-0">
                    <VenueIcon kind={detectVenue(scene.location_type, scene.location_name)} size={36} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="cn-serif text-[13px] text-[var(--ink)] truncate">
                      {scene.order}. {name}
                    </div>
                    <div className="cn-serif text-[11px] text-[var(--ink-soft)] truncate">
                      {scene.location_type} · {scene.action_task}
                    </div>
                  </div>
                  <span className="cn-serif text-[11px] text-[var(--ink-soft)] shrink-0">
                    {done ? "已点亮" : "可复刻"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
            COPY · 分享文案
          </div>
          <p className="cn-serif text-[13px] leading-relaxed text-[var(--ink)] mt-2">
            {share.shareText}
          </p>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
            REPLAY · 路线复刻
          </div>
          <h2 className="cn-serif text-[18px] text-[var(--ink)] mt-1">复刻这条路线</h2>
          <p className="cn-serif text-[13px] leading-relaxed text-[var(--ink-soft)] mt-1">
            将这份归档路线重新生成到当前行程，从第一个节点开始点亮。
          </p>
          <RouteRevalidationPanel result={routeCheck} />
          <AdaptationEvidencePanel
            adapted={adapted}
            memory={memory}
            memoryLoaded={memoryLoaded}
          />
          <div className="mt-4 grid gap-2">
            <button
              onClick={() => replayRoute(false)}
              disabled={!routeCheck.canReplay}
              className="btn-soft w-full justify-center disabled:opacity-45"
            >
              复刻原路线
            </button>
            <button
              onClick={() => replayRoute(true)}
              disabled={!routeCheck.canReplay}
              className="btn-ghost w-full justify-center disabled:opacity-45"
            >
              生成适合我的版本
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function AdaptationEvidencePanel({
  adapted,
  memory,
  memoryLoaded,
}: {
  adapted: AdaptedJourneyResult;
  memory: DmMemorySnapshot | null;
  memoryLoaded: boolean;
}) {
  const visibleNodes = adapted.evidence.nodes.slice(0, 4);
  return (
    <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/45 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="display text-[9px] tracking-[0.28em] text-[var(--ink-soft)]">
            WHY FITS ME · 适配依据
          </div>
          <div className="cn-serif text-[13px] text-[var(--ink)] mt-1">
            {memoryLoaded && memory
              ? "已按你的城市偏好生成"
              : memoryLoaded
                ? "暂无偏好档案，先做轻量适配"
                : "正在读取你的城市偏好…"}
          </div>
        </div>
        {memory?.total_runs ? (
          <span className="cn-serif text-[10px] px-2 py-1 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--ink-soft)] shrink-0">
            {memory.total_runs} 次记录
          </span>
        ) : null}
      </div>

      <p className="cn-serif text-[11px] leading-relaxed text-[var(--ink-soft)] mt-2">
        {adapted.reason}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(adapted.evidence.matchedTags.length
          ? adapted.evidence.matchedTags
          : adapted.evidence.lovedTags.slice(0, 5)
        ).map((tag) => (
          <span
            key={tag}
            className="cn-serif text-[10px] px-2 py-1 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--ink-soft)]"
          >
            {adapted.evidence.matchedTags.includes(tag) ? "命中 " : "偏好 "}
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-3 grid gap-2">
        {visibleNodes.map((node) => (
          <div
            key={`${node.originalOrder}-${node.order}`}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="cn-serif text-[12px] text-[var(--ink)] truncate">
                {node.originalOrder} → {node.order}. {node.sceneName}
              </div>
              <span className="cn-serif text-[10px] text-[var(--ink-soft)] shrink-0">
                {node.change === "promoted"
                  ? "已前置"
                  : node.change === "deprioritized"
                    ? "已后置"
                    : "保留"}
              </span>
            </div>
            <div className="cn-serif text-[11px] leading-relaxed text-[var(--ink-soft)] mt-1">
              {node.reason}
            </div>
          </div>
        ))}
      </div>

      {adapted.evidence.cautioned.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
          <div className="cn-serif text-[11px] text-amber-700">
            已识别 {adapted.evidence.cautioned.length} 个可能不合口味的节点，进入路线后会提示可缩短停留。
          </div>
        </div>
      )}

      <div className="mt-3 cn-serif text-[10px] leading-relaxed text-[var(--ink-soft)]">
        适配只调整顺序、叙事和停留建议，不新增地点，不替换商户。
      </div>
    </div>
  );
}

function RouteRevalidationPanel({ result }: { result: RouteRevalidationResult }) {
  const levelClass = {
    pass: "bg-emerald-50 text-emerald-700 border-emerald-100",
    review: "bg-amber-50 text-amber-700 border-amber-100",
    blocked: "bg-rose-50 text-rose-700 border-rose-100",
  };
  const levelLabel = {
    pass: "通过",
    review: "需确认",
    blocked: "不可复刻",
  };
  return (
    <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/45 p-3">
      <div className="cn-serif text-[13px] text-[var(--ink)]">{result.summary}</div>
      <div className="mt-3 grid gap-2">
        {result.checks.map((check) => (
          <div
            key={check.key}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="cn-serif text-[12px] text-[var(--ink)]">{check.label}</span>
              <span className={`cn-serif text-[10px] px-2 py-0.5 rounded-full border ${levelClass[check.level]}`}>
                {levelLabel[check.level]}
              </span>
            </div>
            <div className="cn-serif text-[11px] leading-relaxed text-[var(--ink-soft)] mt-1">
              {check.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
