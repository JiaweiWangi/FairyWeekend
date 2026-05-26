import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  loadSagas,
  hydrateSagasFromCloud,
  buildLibrary,
  deleteChapter,
  type ArchivedChapter,
  type LibraryEntry,
} from "@/lib/persona-store";
import { VenueIcon, detectVenue } from "@/components/VenueIcon";
import type {
  elementToImageBlob as ElementToImageBlobFn,
  elementToPdfBlob as ElementToPdfBlobFn,
  downloadBlob as DownloadBlobFn,
  shareImageOrDownload as ShareImageOrDownloadFn,
  shareOrDownload as ShareOrDownloadFn,
} from "@/lib/export-pdf";
const loadExportPdf = () => import("@/lib/export-pdf");
const elementToImageBlob: typeof ElementToImageBlobFn = (...args) =>
  loadExportPdf().then((m) => m.elementToImageBlob(...args));
const elementToPdfBlob: typeof ElementToPdfBlobFn = (...args) =>
  loadExportPdf().then((m) => m.elementToPdfBlob(...args));
const downloadBlob: typeof DownloadBlobFn = (...args) => {
  void loadExportPdf().then((m) => m.downloadBlob(...args));
};
const shareImageOrDownload: typeof ShareImageOrDownloadFn = (...args) =>
  loadExportPdf().then((m) => m.shareImageOrDownload(...args));
const shareOrDownload: typeof ShareOrDownloadFn = (...args) =>
  loadExportPdf().then((m) => m.shareOrDownload(...args));
import {
  buildPostchainReport,
  validatePostchainEditedReport,
  validatePostchainShareText,
  type PostchainAuthLevel,
  type PostchainPrivacySettings,
  type PostchainReport,
  type PostchainReportStyle,
} from "@/lib/postchain-report";
import { savePublicPostchainShareCloud } from "@/lib/postchain-share";
import { loadPostchainConsentCloud, savePostchainConsentCloud } from "@/lib/postchain-consent";
import { buildCityPreferenceProfile, type DmMemorySnapshot } from "@/lib/city-preference";
import { supabase } from "@/integrations/supabase/client";
import { qrSvgDataUrl } from "@/lib/qr";
import { buildSerialInsights } from "@/lib/serial-insights";

export const Route = createFileRoute("/me")({ component: MePage });

type Tab = "novel" | "comic" | "poster" | "library" | "profile";
type SortKey = "recent" | "enhanced" | "order";
export type MeFilters = {
  sort: SortKey;
  onlyPhoto: boolean;
  onlyNote: boolean;
  minLevel: number; // 0/1/2/3
};

type ReportEdits = Partial<
  Pick<
    PostchainReport,
    "title" | "identityBadge" | "flexLine" | "bragLine" | "ending" | "nextHook" | "storyFragments"
  >
>;

const POSTCHAIN_ENTRY_KEY = "todaypersona:open-postchain:v1";
const POSTCHAIN_AUTH_KEY = "todaypersona:postchain-auth:v1";
const POSTCHAIN_PRIVACY_KEY = "todaypersona:postchain-privacy:v1";

const DEFAULT_POSTCHAIN_PRIVACY: PostchainPrivacySettings = {
  showMerchantNames: true,
  showVisitTime: false,
  showLocation: true,
  showPhotos: true,
  showAmount: false,
  showDiscount: false,
};

function loadPostchainAuth(): PostchainAuthLevel | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(POSTCHAIN_AUTH_KEY);
  return value === "basic" || value === "personal" || value === "full" ? value : null;
}

function loadPostchainPrivacy(): PostchainPrivacySettings {
  if (typeof window === "undefined") return DEFAULT_POSTCHAIN_PRIVACY;
  try {
    const saved = JSON.parse(localStorage.getItem(POSTCHAIN_PRIVACY_KEY) || "{}");
    return { ...DEFAULT_POSTCHAIN_PRIVACY, ...saved };
  } catch {
    return DEFAULT_POSTCHAIN_PRIVACY;
  }
}

function MePage() {
  const navigate = useNavigate();
  const [tabs, setTabs] = useState<Set<Tab>>(() => {
    if (typeof window !== "undefined" && localStorage.getItem(POSTCHAIN_ENTRY_KEY) === "1") {
      localStorage.removeItem(POSTCHAIN_ENTRY_KEY);
      return new Set(["poster"]);
    }
    return new Set(["novel"]);
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [filters, setFilters] = useState<MeFilters>({
    sort: "recent",
    onlyPhoto: false,
    onlyNote: false,
    minLevel: 0,
  });
  const [dmMemory, setDmMemory] = useState<DmMemorySnapshot | null>(null);
  const [cloudStatus, setCloudStatus] = useState<"idle" | "syncing" | "synced" | "local">("idle");

  const sagas = loadSagas();
  const library = buildLibrary();
  const preferenceProfile = useMemo(
    () => buildCityPreferenceProfile(sagas, dmMemory),
    [sagas, dmMemory],
  );

  useEffect(() => {
    let cancelled = false;
    setCloudStatus("syncing");
    hydrateSagasFromCloud()
      .then(() => {
        if (!cancelled) {
          setCloudStatus("synced");
          setReloadKey((key) => key + 1);
        }
      })
      .catch(() => {
        if (!cancelled) setCloudStatus("local");
      });

    (async () => {
      try {
        const { data, error } = await supabase
          .from("dm_memory")
          .select("profile,loved_tags,disliked_tags,visited_pois,total_runs")
          .eq("player_key", "default")
          .maybeSingle();
        if (!cancelled && !error && data) setDmMemory(data);
      } catch {
        if (!cancelled) setCloudStatus("local");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const chapters = sagas.length;
    const scenes = sagas.reduce((s, c) => s + c.completedSceneOrders.length, 0);
    const enhanced = sagas.reduce(
      (s, c) => s + Object.values(c.sceneRecords ?? {}).filter((r) => r.note || r.photo).length,
      0,
    );
    const rarities = new Set(sagas.map((c) => c.card.rarity));
    return { chapters, scenes, enhanced, rarities: rarities.size };
  }, [sagas]);

  function toggleTab(t: Tab) {
    setTabs((prev) => {
      const next = new Set(prev);
      if (next.has(t)) {
        if (next.size > 1) next.delete(t);
      } else next.add(t);
      return next;
    });
  }

  const showNovel = tabs.has("novel");
  const showComic = tabs.has("comic");
  const showPoster = tabs.has("poster");
  const showLibrary = tabs.has("library");
  const showProfile = tabs.has("profile");
  const showFilters = showNovel || showLibrary;

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: "linear-gradient(180deg, #fdfaf6 0%, #f6efe4 60%, #ede4d3 100%)" }}
    >
      {/* Top bar */}
      <div className="max-w-xl mx-auto px-5 pt-6 flex items-center justify-between">
        <button
          onClick={() => navigate({ to: "/" })}
          className="display text-[11px] tracking-[0.3em] text-[var(--ink)] opacity-70"
        >
          ← 主页
        </button>
        <div className="display text-[10px] tracking-[0.4em] text-[var(--ink-soft)]">
          MY · ARCHIVE
        </div>
      </div>

      {/* Hero */}
      <header className="max-w-xl mx-auto px-5 mt-4 text-center">
        <h1 className="cn-serif text-[26px] text-[var(--ink)]">我的连载</h1>
        <p className="display italic text-[12px] text-[var(--ink-soft)] mt-1">
          A Serial Tale of Selves
        </p>
        <div className="mt-5 grid grid-cols-4 gap-2">
          <StatChip n={stats.chapters} label="章节" />
          <StatChip n={stats.scenes} label="点亮" />
          <StatChip n={stats.enhanced} label="增强" />
          <StatChip n={stats.rarities} label="稀有度" />
        </div>
        <div className="mt-3 cn-serif text-[10px] text-[var(--ink-soft)]">
          {cloudStatus === "syncing"
            ? "正在同步云端连载…"
            : cloudStatus === "synced"
              ? "云端连载已同步"
              : "当前使用本地连载"}
        </div>
      </header>

      {/* Tabs (multi-select) */}
      <div className="max-w-xl mx-auto px-5 mt-6 flex justify-center">
        <div className="inline-flex flex-wrap justify-center gap-1 rounded-full bg-[var(--muted)] border border-[var(--border)] p-1 text-[12px] cn-serif">
          {(
            [
              ["novel", "连载小说"],
              ["comic", "漫画分镜"],
              ["poster", "复盘海报"],
              ["library", "收藏馆"],
              ["profile", "偏好档案"],
            ] as const
          ).map(([k, l]) => {
            const active = tabs.has(k);
            return (
              <button
                key={k}
                onClick={() => toggleTab(k)}
                className={`px-4 py-1.5 rounded-full transition ${active ? "bg-[var(--card)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-soft)]"}`}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>
      <div className="max-w-xl mx-auto px-5 mt-2 text-center">
        <div className="cn-serif text-[10px] text-[var(--ink-soft)]">点选可同时切换多个视图</div>
      </div>

      {/* Filter / Sort bar */}
      {showFilters && sagas.length > 0 && (
        <div className="max-w-xl mx-auto px-5 mt-4">
          <FilterBar filters={filters} onChange={setFilters} />
        </div>
      )}

      <main className="max-w-xl mx-auto px-5 mt-6 space-y-10">
        {sagas.length === 0 && !showLibrary && !showProfile && (
          <EmptyState onGo={() => navigate({ to: "/" })} />
        )}
        {showNovel && sagas.length > 0 && (
          <NovelView
            sagas={sagas}
            filters={filters}
            onDelete={(id) => {
              deleteChapter(id);
              setReloadKey((k) => k + 1);
            }}
          />
        )}
        {showComic && sagas.length > 0 && <ComicView sagas={sagas} />}
        {showPoster && (
          <PostchainView
            sagas={sagas}
            empty={sagas.length === 0}
            onGo={() => navigate({ to: "/" })}
          />
        )}
        {showLibrary && (
          <LibraryView
            library={library}
            sagas={sagas}
            filters={filters}
            empty={sagas.length === 0}
            onGo={() => navigate({ to: "/" })}
          />
        )}
        {showProfile && (
          <CityPreferenceView
            profile={preferenceProfile}
            memory={dmMemory}
            empty={sagas.length === 0 && !dmMemory}
            onGo={() => navigate({ to: "/" })}
          />
        )}
      </main>
    </div>
  );
}

function FilterBar({
  filters,
  onChange,
}: {
  filters: MeFilters;
  onChange: (f: MeFilters) => void;
}) {
  const f = filters;
  const set = (patch: Partial<MeFilters>) => onChange({ ...f, ...patch });
  const sorts: { k: SortKey; l: string }[] = [
    { k: "recent", l: "最近访问" },
    { k: "enhanced", l: "增强多" },
    { k: "order", l: "章节顺序" },
  ];
  const Chip = ({
    on,
    onClick,
    children,
  }: {
    on: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full cn-serif text-[11px] border transition ${
        on
          ? "bg-[var(--ink)] text-[var(--card)] border-[var(--ink)]"
          : "bg-[var(--card)] text-[var(--ink-soft)] border-[var(--border)] hover:text-[var(--ink)]"
      }`}
    >
      {children}
    </button>
  );
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/80 backdrop-blur px-3 py-3 space-y-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="display text-[9px] tracking-[0.3em] text-[var(--ink-soft)] mr-1">
          SORT
        </span>
        {sorts.map((s) => (
          <Chip key={s.k} on={f.sort === s.k} onClick={() => set({ sort: s.k })}>
            {s.l}
          </Chip>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="display text-[9px] tracking-[0.3em] text-[var(--ink-soft)] mr-1">
          FILTER
        </span>
        <Chip on={f.onlyPhoto} onClick={() => set({ onlyPhoto: !f.onlyPhoto })}>
          📷 仅有照片
        </Chip>
        <Chip on={f.onlyNote} onClick={() => set({ onlyNote: !f.onlyNote })}>
          ✎ 仅有随笔
        </Chip>
        <span className="display text-[9px] tracking-[0.3em] text-[var(--ink-soft)] ml-2 mr-1">
          增强 ≥
        </span>
        {[0, 1, 2, 3].map((n) => (
          <Chip key={n} on={f.minLevel === n} onClick={() => set({ minLevel: n })}>
            {n}
          </Chip>
        ))}
        {(f.onlyPhoto || f.onlyNote || f.minLevel > 0 || f.sort !== "recent") && (
          <button
            onClick={() =>
              onChange({ sort: "recent", onlyPhoto: false, onlyNote: false, minLevel: 0 })
            }
            className="ml-auto cn-serif text-[11px] text-[var(--ink-soft)] underline underline-offset-2"
          >
            重置
          </button>
        )}
      </div>
    </div>
  );
}

function StatChip({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] py-2.5">
      <div className="display text-[20px] text-[var(--ink)] leading-none">{n}</div>
      <div className="cn-serif text-[10px] text-[var(--ink-soft)] mt-1 tracking-widest">
        {label}
      </div>
    </div>
  );
}

function EmptyState({ onGo }: { onGo: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--card)]/60 p-8 text-center mt-6">
      <div className="text-4xl mb-3">📖</div>
      <div className="cn-serif text-[15px] text-[var(--ink)]">连载还没有第一章</div>
      <div className="cn-serif text-[12px] text-[var(--ink-soft)] mt-1">
        抽一张人设卡，走完今天的故事
      </div>
      <button onClick={onGo} className="btn-soft mt-5">
        去抽卡 →
      </button>
    </div>
  );
}

/* ============ 连载小说 ============ */
type ExportJob =
  | { kind: "chapter"; ch: ArchivedChapter; chapterNo: number; mode: "download" | "share" }
  | { kind: "series"; chapters: ArchivedChapter[]; mode: "download" | "share" };

function chapterMeta(ch: ArchivedChapter) {
  const recs = Object.values(ch.sceneRecords ?? {});
  const enhanced = recs.filter((r) => r.note || r.photo).length;
  const hasPhoto = recs.some((r) => !!r.photo);
  const hasNote = recs.some((r) => !!r.note);
  const lastAt = recs.reduce(
    (m, r) => Math.max(m, r.completedAt ?? 0),
    ch.archivedAt ?? ch.createdAt,
  );
  return { enhanced, hasPhoto, hasNote, lastAt };
}

function NovelView({
  sagas,
  filters,
  onDelete,
}: {
  sagas: ArchivedChapter[];
  filters: MeFilters;
  onDelete: (id: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [exportJob, setExportJob] = useState<ExportJob | null>(null);
  const [exporting, setExporting] = useState(false);
  const insights = useMemo(() => buildSerialInsights(sagas), [sagas]);

  // Original chapter numbers come from original order (newest first)
  const indexed = useMemo(
    () => sagas.map((ch, idx) => ({ ch, chapterNo: sagas.length - idx, meta: chapterMeta(ch) })),
    [sagas],
  );
  const visible = useMemo(() => {
    let list = indexed.filter(({ meta }) => {
      if (filters.onlyPhoto && !meta.hasPhoto) return false;
      if (filters.onlyNote && !meta.hasNote) return false;
      if (filters.minLevel > 0 && meta.enhanced < filters.minLevel) return false;
      return true;
    });
    if (filters.sort === "enhanced")
      list = [...list].sort(
        (a, b) => b.meta.enhanced - a.meta.enhanced || b.meta.lastAt - a.meta.lastAt,
      );
    else if (filters.sort === "recent")
      list = [...list].sort((a, b) => b.meta.lastAt - a.meta.lastAt);
    // "order" keeps original (newest chapter first)
    return list;
  }, [indexed, filters]);

  const openEntry =
    visible.find((v) => v.ch.chapterId === openId) ??
    indexed.find((v) => v.ch.chapterId === openId) ??
    null;

  function runChapterExport(ch: ArchivedChapter, mode: "download" | "share") {
    const entry = indexed.find((v) => v.ch.chapterId === ch.chapterId);
    setExportJob({ kind: "chapter", ch, chapterNo: entry?.chapterNo ?? 1, mode });
    setExporting(true);
  }
  function runSeriesExport(mode: "download" | "share") {
    setExportJob({ kind: "series", chapters: sagas, mode });
    setExporting(true);
  }

  return (
    <>
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 mb-5">
        <div className="display text-[10px] tracking-[0.35em] text-[var(--ink-soft)]">
          SERIAL ARC · 连载主线
        </div>
        <h2 className="cn-serif text-[20px] leading-snug text-[var(--ink)] mt-2">
          {insights.autoTitle}
        </h2>
        <p className="cn-serif text-[13px] leading-relaxed text-[var(--ink-soft)] mt-2">
          {insights.mainlineSummary}
        </p>
        <div className="mt-3 grid gap-2">
          {[insights.personaShift, insights.cityProgress, insights.monthlyRecap].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2 cn-serif text-[12px] leading-relaxed text-[var(--ink)]"
            >
              {item}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {insights.timelineTags.map((tag) => (
            <span
              key={tag}
              className="cn-serif text-[10px] px-2 py-1 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--ink-soft)]"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between mb-3">
        <div className="cn-serif text-[11px] text-[var(--ink-soft)]">
          显示 {visible.length}/{sagas.length} 章 · 点击查看详情
        </div>
        <button
          onClick={() => runSeriesExport("download")}
          disabled={exporting}
          className="cn-serif text-[11px] px-3 py-1.5 rounded-full bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)] disabled:opacity-50"
        >
          {exporting && exportJob?.kind === "series" ? "导出中…" : "导出整部连载 PDF ↓"}
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/60 p-6 text-center cn-serif text-[12px] text-[var(--ink-soft)]">
          没有符合筛选条件的章节
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map(({ ch, chapterNo, meta }) => {
            const date = new Date(ch.createdAt);
            const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
            const total = ch.journey.scenes.length;
            const done = ch.completedSceneOrders.length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <button
                key={ch.chapterId}
                onClick={() => setOpenId(ch.chapterId)}
                className="persona-card w-full text-left overflow-hidden block transition-transform hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-22px_rgba(0,0,0,0.35)]"
                data-rarity={ch.card.rarity}
              >
                <div
                  className="relative h-36 overflow-hidden"
                  style={
                    ch.card.cover
                      ? undefined
                      : {
                          background: `linear-gradient(135deg, ${ch.card.colors[0]}, ${ch.card.colors[1]})`,
                        }
                  }
                >
                  {ch.card.cover && (
                    <img
                      src={ch.card.cover}
                      alt={ch.card.identity}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                    <div className="rarity-chip" data-rarity={ch.card.rarity}>
                      ✦ {ch.card.rarity}
                    </div>
                    <div className="display text-[10px] tracking-[0.3em] text-white/90">
                      CH.{String(chapterNo).padStart(2, "0")}
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <div className="display italic text-[11px] opacity-80">
                      {dateStr} {ch.city && `· ${ch.city}`}
                    </div>
                    <div className="cn-serif text-[17px] leading-snug mt-0.5 line-clamp-1">
                      「{insights.chapterTitles[ch.chapterId] ?? ch.card.identity}」
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between text-[11px] cn-serif text-[var(--ink-soft)]">
                    <span className="flex items-center gap-1.5">
                      {done}/{total} 已点亮 · 增强 {meta.enhanced}
                      {meta.hasPhoto && <span title="有照片">📷</span>}
                      {meta.hasNote && <span title="有随笔">✎</span>}
                    </span>
                    <span className="display tracking-[0.2em]">查看 →</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {openEntry && (
        <ChapterDetail
          ch={openEntry.ch}
          chapterNo={openEntry.chapterNo}
          onClose={() => setOpenId(null)}
          onExport={(mode) => runChapterExport(openEntry.ch, mode)}
          exporting={
            exporting &&
            exportJob?.kind === "chapter" &&
            exportJob.ch.chapterId === openEntry.ch.chapterId
          }
          onDelete={() => {
            if (confirm("从连载中移除这一章？")) {
              setOpenId(null);
              onDelete(openEntry.ch.chapterId);
            }
          }}
        />
      )}

      {exportJob && (
        <ExportRunner
          job={exportJob}
          onDone={() => {
            setExporting(false);
            setExportJob(null);
          }}
        />
      )}
      {exporting && (
        <div className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] px-6 py-4 cn-serif text-[13px] text-[var(--ink)] shadow-lg">
            正在生成 PDF…
          </div>
        </div>
      )}
    </>
  );
}

function ChapterDetail({
  ch,
  chapterNo,
  onClose,
  onDelete,
  onExport,
  exporting,
}: {
  ch: ArchivedChapter;
  chapterNo: number;
  onClose: () => void;
  onDelete: () => void;
  onExport: (mode: "download" | "share") => void;
  exporting: boolean;
}) {
  const date = new Date(ch.createdAt);
  const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  const total = ch.journey.scenes.length;
  const done = ch.completedSceneOrders.length;
  const enhanced = Object.values(ch.sceneRecords ?? {}).filter((r) => r.note || r.photo).length;

  // 奖励：本章点亮的地点 + 活动
  const rewards = ch.journey.scenes
    .filter((s) => ch.completedSceneOrders.includes(s.order))
    .map((s) => ({
      order: s.order,
      place: s.location_name,
      type: s.location_type,
      action: s.action_task,
    }));

  // 关闭：ESC + 锁滚动
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm animate-[fade-up_0.2s_ease-out]"
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)] fade-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Cover */}
        <div
          className="relative h-44 overflow-hidden rounded-t-3xl"
          style={
            ch.card.cover
              ? undefined
              : {
                  background: `linear-gradient(135deg, ${ch.card.colors[0]}, ${ch.card.colors[1]})`,
                }
          }
        >
          {ch.card.cover && (
            <img
              src={ch.card.cover}
              alt={ch.card.identity}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          <button
            onClick={onClose}
            aria-label="关闭"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/85 text-[var(--ink)] flex items-center justify-center text-[14px]"
          >
            ✕
          </button>
          <div className="absolute top-3 left-3 rarity-chip" data-rarity={ch.card.rarity}>
            ✦ {ch.card.rarity} · CH.{String(chapterNo).padStart(2, "0")}
          </div>
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <div className="display italic text-[11px] opacity-85">
              {dateStr} {ch.city && `· ${ch.city}`}
            </div>
            <div className="cn-serif text-[19px] leading-snug mt-0.5">「{ch.card.identity}」</div>
            <div className="cn-serif text-[12px] opacity-85 mt-0.5 italic">{ch.card.mood}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-5 pt-4 grid grid-cols-3 gap-2">
          <MiniStat n={`${done}/${total}`} label="点亮场景" />
          <MiniStat n={enhanced} label="笔记/照片" />
          <MiniStat
            n={`${ch.journey.emotion_arc.start} → ${ch.journey.emotion_arc.end}`}
            label="情绪弧"
            small
          />
        </div>

        {/* Rewards */}
        {rewards.length > 0 && (
          <div className="px-5 mt-5">
            <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)] mb-2">
              REWARDS · 本章解锁
            </div>
            <div className="flex flex-wrap gap-1.5">
              {rewards.map((r) => (
                <span
                  key={r.order}
                  className="inline-flex items-center gap-1 text-[11px] cn-serif px-2 py-1 rounded-full bg-[var(--muted)] border border-[var(--border)] text-[var(--ink)]"
                  title={r.action}
                >
                  <VenueIcon kind={detectVenue(r.type, r.place)} size={14} />
                  {r.place} <span className="text-[var(--accent)]">+1</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Opening */}
        <div className="px-5 mt-6">
          <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
            序章 · OPENING
          </div>
          <p className="cn-serif text-[14px] leading-[1.95] text-[var(--ink)] mt-1.5">
            {ch.journey.story_opening}
          </p>
        </div>

        {/* Timeline */}
        <div className="px-5 mt-5">
          <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)] mb-3">
            TIMELINE · 逐场景
          </div>
          <ol className="space-y-5">
            {ch.journey.scenes.map((s) => {
              const rec = ch.sceneRecords?.[s.order];
              const isDone = ch.completedSceneOrders.includes(s.order);
              const time = rec?.completedAt ? new Date(rec.completedAt) : null;
              const timeStr = time
                ? `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`
                : null;
              return (
                <li
                  key={s.order}
                  className={`relative pl-7 border-l-2 ${isDone ? "border-[var(--accent)]" : "border-[var(--border)]"}`}
                >
                  <span
                    className="absolute -left-[10px] top-0.5 w-[18px] h-[18px] rounded-full bg-[var(--card)] border-2 border-[var(--accent)] flex items-center justify-center text-[10px] text-[var(--accent)]"
                    style={{ opacity: isDone ? 1 : 0.35 }}
                  >
                    {isDone ? "✓" : ""}
                  </span>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="display italic text-[11px] text-[var(--ink-soft)]">
                        § {s.order}
                      </span>
                      <span className="cn-serif text-[14px] text-[var(--ink)] truncate">
                        {s.scene_name}
                      </span>
                      {rec?.mood && <span className="text-[14px]">{rec.mood}</span>}
                    </div>
                    {timeStr ? (
                      <span className="display text-[10px] tracking-widest text-[var(--ink-soft)] shrink-0">
                        {timeStr}
                      </span>
                    ) : (
                      <span className="display text-[10px] tracking-widest text-[var(--ink-soft)] shrink-0 opacity-60">
                        未点亮
                      </span>
                    )}
                  </div>
                  <p className="cn-serif text-[13px] leading-[1.9] text-[var(--ink)] mt-1">
                    {s.persona_narrative}
                  </p>
                  <div className="cn-serif text-[11px] text-[var(--ink-soft)] mt-1 flex items-center gap-1.5">
                    <VenueIcon kind={detectVenue(s.location_type, s.scene_name)} size={12} />
                    {s.location_name} · {s.action_task}
                  </div>
                  {rec?.photo && (
                    <img
                      src={rec.photo}
                      alt=""
                      className="mt-2 rounded-xl border border-[var(--border)] max-h-56 object-cover"
                    />
                  )}
                  {rec?.note && (
                    <blockquote className="mt-2 cn-serif text-[13px] text-[var(--ink)] italic border-l-2 border-[var(--accent)]/50 pl-3">
                      "{rec.note}"
                    </blockquote>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* Closing */}
        <div className="px-5 mt-6">
          <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
            终章 · CLOSING
          </div>
          <p className="cn-serif text-[14px] leading-[1.95] text-[var(--ink)] mt-1.5">
            {ch.journey.closing}
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] sticky bottom-0 bg-[var(--card)]/95 backdrop-blur">
          <button
            onClick={onDelete}
            className="cn-serif text-[12px] text-[var(--ink-soft)] hover:text-red-600"
          >
            删除这一章
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onExport("share")}
              disabled={exporting}
              className="cn-serif text-[12px] px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] disabled:opacity-50"
              title="分享 PDF（不支持时将自动下载）"
            >
              分享 ↗
            </button>
            <button
              onClick={() => onExport("download")}
              disabled={exporting}
              className="cn-serif text-[12px] px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] disabled:opacity-50"
            >
              {exporting ? "导出中…" : "导出 PDF ↓"}
            </button>
            <button onClick={onClose} className="btn-soft">
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ n, label, small }: { n: React.ReactNode; label: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 py-2 px-2 text-center">
      <div
        className={`cn-serif text-[var(--ink)] leading-tight ${small ? "text-[11px]" : "text-[14px]"}`}
      >
        {n}
      </div>
      <div className="cn-serif text-[10px] text-[var(--ink-soft)] mt-0.5 tracking-widest">
        {label}
      </div>
    </div>
  );
}

/* ============ 漫画分镜 ============ */
function ComicView({ sagas }: { sagas: ArchivedChapter[] }) {
  return (
    <div className="space-y-8">
      {sagas.map((ch, idx) => {
        const date = new Date(ch.createdAt);
        const chapterNo = sagas.length - idx;
        return (
          <section key={ch.chapterId}>
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <div className="display italic text-[11px] text-[var(--ink-soft)]">
                  EPISODE {String(chapterNo).padStart(2, "0")} · {date.getMonth() + 1}/
                  {date.getDate()}
                </div>
                <div className="cn-serif text-[15px] text-[var(--ink)]">「{ch.card.identity}」</div>
              </div>
              <div className="rarity-chip" data-rarity={ch.card.rarity}>
                ✦ {ch.card.rarity}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Cover panel */}
              <ComicPanel
                className="col-span-2 aspect-[2/1]"
                bg={ch.card.cover}
                colors={ch.card.colors}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                <div className="absolute bottom-2 left-3 right-3 text-white">
                  <div className="cn-serif text-[13px] leading-tight">
                    {ch.journey.story_opening.slice(0, 38)}…
                  </div>
                </div>
              </ComicPanel>
              {ch.journey.scenes.map((s) => {
                const rec = ch.sceneRecords?.[s.order];
                const venue = detectVenue(s.location_type, s.scene_name);
                return (
                  <ComicPanel
                    key={s.order}
                    className="aspect-square"
                    photo={rec?.photo}
                    colors={ch.card.colors}
                  >
                    {!rec?.photo && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <VenueIcon kind={venue} size={72} />
                      </div>
                    )}
                    <div className="absolute top-1.5 left-1.5 display text-[9px] tracking-widest bg-white/85 rounded px-1.5 py-0.5">
                      §{s.order}
                    </div>
                    {rec?.mood && (
                      <div className="absolute top-1.5 right-1.5 text-[18px] drop-shadow">
                        {rec.mood}
                      </div>
                    )}
                    {(rec?.note || s.scene_name) && (
                      <div className="absolute bottom-0 left-0 right-0 bg-white/92 backdrop-blur px-2 py-1.5 border-t border-[var(--border)]">
                        <div className="cn-serif text-[11px] text-[var(--ink)] leading-snug line-clamp-2">
                          {rec?.note || s.scene_name}
                        </div>
                      </div>
                    )}
                  </ComicPanel>
                );
              })}
              {/* Closing panel */}
              <ComicPanel className="col-span-2 aspect-[2/1]" colors={ch.card.colors}>
                <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
                  <p className="cn-serif text-[13px] text-[var(--ink)] italic leading-snug">
                    {ch.journey.closing.slice(0, 60)}…
                  </p>
                </div>
              </ComicPanel>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ComicPanel({
  children,
  className = "",
  bg,
  photo,
  colors,
}: {
  children?: React.ReactNode;
  className?: string;
  bg?: string;
  photo?: string;
  colors: string[];
}) {
  const style: React.CSSProperties = photo
    ? { backgroundImage: `url(${photo})`, backgroundSize: "cover", backgroundPosition: "center" }
    : bg
      ? { backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` };
  return (
    <div
      className={`relative overflow-hidden rounded-xl border-2 border-[var(--ink)]/85 shadow-[3px_3px_0_0_rgba(61,53,48,0.85)] ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/* ============ 后链路复盘海报 ============ */
function PostchainView({
  sagas,
  empty,
  onGo,
}: {
  sagas: ArchivedChapter[];
  empty: boolean;
  onGo: () => void;
}) {
  const [chapterId, setChapterId] = useState(sagas[0]?.chapterId ?? "");
  const [authLevel, setAuthLevel] = useState<PostchainAuthLevel>(() => loadPostchainAuth() ?? "basic");
  const [draftAuthLevel, setDraftAuthLevel] = useState<PostchainAuthLevel>(authLevel);
  const [authorized, setAuthorized] = useState(() => loadPostchainAuth() !== null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [privacy, setPrivacy] = useState<PostchainPrivacySettings>(loadPostchainPrivacy);
  const [reportStyle, setReportStyle] = useState<PostchainReportStyle>("moments");
  const [generated, setGenerated] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editableShareText, setEditableShareText] = useState("");
  const [reportEdits, setReportEdits] = useState<ReportEdits>({});
  const [shareUrl, setShareUrl] = useState("");
  const [exporting, setExporting] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadPostchainConsentCloud().then((consent) => {
      if (cancelled || !consent) return;
      setAuthLevel(consent.authLevel);
      setDraftAuthLevel(consent.authLevel);
      setAuthorized(true);
      setPrivacy((current) => ({ ...current, ...consent.privacy }));
      localStorage.setItem(POSTCHAIN_AUTH_KEY, consent.authLevel);
      localStorage.setItem(POSTCHAIN_PRIVACY_KEY, JSON.stringify({ ...DEFAULT_POSTCHAIN_PRIVACY, ...consent.privacy }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!chapterId && sagas[0]) setChapterId(sagas[0].chapterId);
  }, [chapterId, sagas]);

  useEffect(() => {
    localStorage.setItem(POSTCHAIN_PRIVACY_KEY, JSON.stringify(privacy));
    if (authorized) void savePostchainConsentCloud(authLevel, privacy);
    setGenerated(false);
    setPreviewOpen(false);
  }, [authLevel, authorized, privacy]);

  if (empty) return <EmptyState onGo={onGo} />;

  const chapter = sagas.find((item) => item.chapterId === chapterId) ?? sagas[0];
  const report = buildPostchainReport(chapter, { authLevel, reportStyle, privacy });
  const reportDraft = {
    ...report,
    ...reportEdits,
    storyFragments: reportEdits.storyFragments ?? report.storyFragments,
  };
  const editedReport: PostchainReport = {
    ...reportDraft,
    factCheck: validatePostchainEditedReport(chapter, privacy, reportDraft),
  };
  const chapterNo = sagas.length - sagas.findIndex((item) => item.chapterId === chapter.chapterId);
  const date = new Date(chapter.createdAt);
  const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;

  function openPreview(nextReport = report) {
    setGenerated(true);
    setPreviewOpen(true);
    setEditableShareText(nextReport.shareText);
    setReportEdits({});
    setShareUrl("");
  }

  async function exportPoster(type: "image/png" | "image/jpeg" = "image/png") {
    const el = posterRef.current;
    if (!el) return;
    setExporting(true);
    try {
      const blob = await elementToImageBlob(el, type);
      const suffix = type === "image/jpeg" ? "jpg" : "png";
      downloadBlob(blob, `今日人设_复盘海报_CH${String(chapterNo).padStart(2, "0")}.${suffix}`);
    } catch (err) {
      console.error("[poster export]", err);
      alert("导出失败：" + (err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  async function nativeSharePoster() {
    const el = posterRef.current;
    if (!el) return;
    setExporting(true);
    try {
      const blob = await elementToImageBlob(el, "image/png");
      await shareImageOrDownload(
        blob,
        `今日人设_复盘海报_CH${String(chapterNo).padStart(2, "0")}.png`,
        editedReport.title,
        editableShareText || editedReport.shareText,
      );
    } catch (err) {
      console.error("[poster share]", err);
      alert("分享失败：" + (err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  async function copyShareText() {
    try {
      await navigator.clipboard.writeText(editableShareText || editedReport.shareText);
      alert("分享文案已复制。");
    } catch {
      alert(editableShareText || editedReport.shareText);
    }
  }

  async function publishShare() {
    if (!editedReport.factCheck.ok) {
      alert(`事实校验未通过：${editedReport.factCheck.warnings.join("；")}`);
      return;
    }
    const textWarnings = validatePostchainShareText(
      chapter,
      privacy,
      editableShareText || editedReport.shareText,
    );
    if (textWarnings.length > 0) {
      alert(`分享文案需要先处理：${textWarnings.join("；")}`);
      return;
    }
    const share = await savePublicPostchainShareCloud({
      chapter,
      report: editedReport,
      privacy,
      shareText: editableShareText || editedReport.shareText,
    });
    const url = `${window.location.origin}/share?id=${share.id}`;
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      alert("分享链接已复制。");
    } catch {
      alert(url);
    }
    window.open(url, "_blank");
  }

  function openAuthDialog() {
    setDraftAuthLevel(authLevel);
    setAuthDialogOpen(true);
  }

  function confirmAuth() {
    const nextReport = buildPostchainReport(chapter, {
      authLevel: draftAuthLevel,
      reportStyle,
      privacy,
    });
    setAuthLevel(draftAuthLevel);
    setAuthorized(true);
    localStorage.setItem(POSTCHAIN_AUTH_KEY, draftAuthLevel);
    void savePostchainConsentCloud(draftAuthLevel, privacy);
    setAuthDialogOpen(false);
    openPreview(nextReport);
  }

  if (generated && previewOpen) {
    return (
      <ReportPreviewFlow
        chapter={chapter}
        chapterNo={chapterNo}
        dateStr={dateStr}
        report={editedReport}
        privacy={privacy}
        posterRef={posterRef}
        reportStyle={reportStyle}
        onStyleChange={(value) => {
          setReportStyle(value);
          setReportEdits({});
          setShareUrl("");
          setEditableShareText(
            buildPostchainReport(chapter, { authLevel, reportStyle: value, privacy }).shareText,
          );
        }}
        shareText={editableShareText || editedReport.shareText}
        onShareTextChange={setEditableShareText}
        edits={reportEdits}
        onEditsChange={setReportEdits}
        shareUrl={shareUrl}
        exporting={exporting}
        onExport={exportPoster}
        onNativeShare={nativeSharePoster}
        onCopy={copyShareText}
        onPublish={publishShare}
        onBack={() => setPreviewOpen(false)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)]/80 backdrop-blur p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="display text-[10px] tracking-[0.35em] text-[var(--ink-soft)]">
              POSTCHAIN · 后链路
            </div>
            <h2 className="cn-serif text-[18px] text-[var(--ink)] mt-1">从真实连载生成分享资产</h2>
          </div>
          <button
            onClick={() => {
              if (authorized) {
                openPreview();
              } else {
                openAuthDialog();
              }
            }}
            className="btn-soft shrink-0 px-4 py-2 text-[13px]"
          >
            生成复盘
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <div>
            <div className="display text-[9px] tracking-[0.3em] text-[var(--ink-soft)] mb-2">
              CHAPTER
            </div>
            <div className="grid gap-2">
              {sagas.slice(0, 4).map((item, idx) => {
                const no = sagas.length - idx;
                const active = item.chapterId === chapter.chapterId;
                return (
                  <button
                    key={item.chapterId}
                    onClick={() => {
                      setChapterId(item.chapterId);
                      setGenerated(false);
                      setPreviewOpen(false);
                    }}
                    className={`w-full text-left rounded-2xl border px-3 py-2.5 flex items-center gap-3 transition ${
                      active
                        ? "bg-[var(--ink)] text-[var(--card)] border-[var(--ink)]"
                        : "bg-[var(--card)] text-[var(--ink)] border-[var(--border)] hover:bg-[var(--muted)]"
                    }`}
                  >
                    <span className="display text-[11px] tracking-[0.2em] shrink-0">
                      CH.{String(no).padStart(2, "0")}
                    </span>
                    <span className="cn-serif text-[13px] truncate flex-1">
                      「{item.card.identity}」
                    </span>
                    <span className="cn-serif text-[11px] opacity-70 shrink-0">
                      {item.completedSceneOrders.length}/{item.journey.scenes.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="display text-[9px] tracking-[0.3em] text-[var(--ink-soft)] mb-2">
              DATA AUTH
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-3 flex items-center justify-between gap-3">
              <div>
                <div className="cn-serif text-[13px] text-[var(--ink)]">
                  {authLevel === "basic"
                    ? "基础授权"
                    : authLevel === "personal"
                      ? "标准授权"
                      : "高级授权"}
                  <span className="ml-2 text-[11px] text-[var(--ink-soft)]">
                    {authorized ? "已保存" : "待确认"}
                  </span>
                </div>
                <div className="cn-serif text-[11px] text-[var(--ink-soft)] mt-0.5">
                  {authLevel === "basic"
                    ? "仅使用路线完成数据。"
                    : authLevel === "personal"
                      ? "使用点位、品类、照片/随笔等本次记录。"
                      : "使用完整本次记录，并预留订单、优惠和历史偏好字段。"}
                </div>
              </div>
              <button onClick={openAuthDialog} className="btn-ghost text-[12px] px-3 py-1.5">
                调整授权
              </button>
            </div>
          </div>

          <SegmentedControl<PostchainReportStyle>
            label="STYLE"
            value={reportStyle}
            options={[
              ["moments", "朋友圈"],
              ["literary", "文艺漫游"],
              ["saving", "省心攻略"],
              ["niche", "小众人格"],
            ]}
            onChange={(v) => {
              setReportStyle(v);
              setGenerated(false);
              setPreviewOpen(false);
            }}
          />

          <PrivacySettingsPanel
            value={privacy}
            onChange={(next) => setPrivacy(next)}
          />
        </div>
      </section>

      {authDialogOpen && (
        <PostchainAuthDialog
          value={draftAuthLevel}
          onChange={setDraftAuthLevel}
          onCancel={() => setAuthDialogOpen(false)}
          onConfirm={confirmAuth}
        />
      )}

      <section className="grid gap-4">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)]/80 p-4">
          <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)] mb-2">
            FACTS · 真实数据摘要
          </div>
          <div className="grid gap-2">
            {report.factSummary.map((fact) => (
              <div
                key={fact}
                className="cn-serif text-[12px] text-[var(--ink)] rounded-2xl bg-[var(--muted)]/60 border border-[var(--border)] px-3 py-2"
              >
                {fact}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)]/80 p-4">
          <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)] mb-2">
            ROUTE STATUS · 路线状态
          </div>
          <div className="rounded-2xl bg-[var(--muted)]/60 border border-[var(--border)] px-3 py-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="cn-serif text-[13px] text-[var(--ink)]">{report.completionText}</div>
                <div className="cn-serif text-[11px] text-[var(--ink-soft)] mt-1">
                  主题：{report.routeTheme}
                </div>
              </div>
              <strong className="display text-[26px] leading-none text-[var(--accent)]">
                {report.completionPercent}%
              </strong>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-[var(--card)] overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] transition-all"
                style={{ width: `${report.completionPercent}%` }}
              />
            </div>
          </div>

          {report.incompleteNodes.length > 0 && (
            <div className="mt-3">
              <div className="display text-[9px] tracking-[0.28em] text-[var(--ink-soft)] mb-2">
                TODO · 未完成节点
              </div>
              <div className="flex flex-wrap gap-1.5">
                {report.incompleteNodes.map((node) => (
                  <span
                    key={node.order}
                    className="cn-serif text-[11px] px-2.5 py-1 rounded-full bg-[var(--muted)] text-[var(--ink-soft)] border border-[var(--border)]"
                  >
                    {node.order}. {node.displayName}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3">
            <div className="display text-[9px] tracking-[0.28em] text-[var(--ink-soft)] mb-2">
              KEYWORDS · 路线关键词
            </div>
            <div className="flex flex-wrap gap-1.5">
              {report.routeKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="cn-serif text-[11px] px-2.5 py-1 rounded-full bg-[var(--card)] text-[var(--ink-soft)] border border-[var(--border)]"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <div className="display text-[9px] tracking-[0.28em] text-[var(--ink-soft)] mb-2">
              TRAITS · 行为特征
            </div>
            <div className="flex flex-wrap gap-1.5">
              {report.behaviorTraits.map((trait) => (
                <span
                  key={trait}
                  className="cn-serif text-[11px] px-2.5 py-1 rounded-full bg-[var(--ink)] text-[var(--card)]"
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)]/80 p-4">
          <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)] mb-2">
            SIGNALS · 自动沉淀
          </div>
          <ul className="grid gap-1.5">
            {report.dataSignals.map((signal) => (
              <li key={signal} className="cn-serif text-[12px] text-[var(--ink-soft)] flex gap-2">
                <span className="text-[var(--accent)]">✦</span>
                <span>{signal}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
              SHARE POSTER
            </div>
            <h2 className="cn-serif text-[17px] text-[var(--ink)]">可传播结果</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditableShareText(report.shareText);
                copyShareText();
              }}
              disabled={!generated}
              className="btn-ghost text-[12px] px-3 py-1.5 disabled:opacity-40"
            >
              复制文案
            </button>
            <button
              onClick={() => exportPoster()}
              disabled={!generated || exporting}
              className="btn-soft text-[12px] px-3 py-1.5"
            >
              {exporting ? "导出中…" : "导出图片"}
            </button>
          </div>
        </div>

        {generated ? (
          <PostchainPoster
            refEl={posterRef}
            chapter={chapter}
            chapterNo={chapterNo}
            dateStr={dateStr}
            report={report}
            privacy={privacy}
          />
        ) : (
          <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--card)]/60 min-h-[360px] flex items-center justify-center text-center px-8">
            <div>
              <div className="display text-[11px] tracking-[0.35em] text-[var(--ink-soft)]">
                WAITING
              </div>
              <div className="cn-serif text-[15px] text-[var(--ink)] mt-2">
                选择章节后生成一张今日故事海报
              </div>
            </div>
          </div>
        )}
      </section>

      {generated && (
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
            NEXT ACTION · 增长承接
          </div>
          <h3 className="cn-serif text-[17px] text-[var(--ink)] mt-1">{report.primaryCta.title}</h3>
          <p className="cn-serif text-[13px] leading-relaxed text-[var(--ink-soft)] mt-1">
            {report.primaryCta.body}
          </p>
          <button className="btn-soft mt-4 w-full justify-center">
            {report.primaryCta.action}
          </button>
          <div className="mt-4 grid gap-2">
            {report.recommendedNextActions.map((action) => (
              <div
                key={action.title}
                className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2"
              >
                <div className="cn-serif text-[13px] text-[var(--ink)]">{action.title}</div>
                <div className="cn-serif text-[11px] text-[var(--ink-soft)] mt-0.5">
                  {action.body}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2">
            <div className="cn-serif text-[12px] text-[var(--ink)]">
              事实校验：{report.factCheck.ok ? "通过" : "需复核"}
            </div>
            {!report.factCheck.ok && (
              <ul className="mt-1 grid gap-1">
                {report.factCheck.warnings.map((warning) => (
                  <li key={warning} className="cn-serif text-[11px] text-[var(--ink-soft)]">
                    {warning}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function ReportPreviewFlow({
  chapter,
  chapterNo,
  dateStr,
  report,
  privacy,
  posterRef,
  reportStyle,
  onStyleChange,
  shareText,
  onShareTextChange,
  edits,
  onEditsChange,
  shareUrl,
  exporting,
  onExport,
  onNativeShare,
  onCopy,
  onPublish,
  onBack,
}: {
  chapter: ArchivedChapter;
  chapterNo: number;
  dateStr: string;
  report: PostchainReport;
  privacy: PostchainPrivacySettings;
  posterRef: React.RefObject<HTMLDivElement | null>;
  reportStyle: PostchainReportStyle;
  onStyleChange: (value: PostchainReportStyle) => void;
  shareText: string;
  onShareTextChange: (value: string) => void;
  edits: ReportEdits;
  onEditsChange: (value: ReportEdits) => void;
  shareUrl: string;
  exporting: boolean;
  onExport: (type?: "image/png" | "image/jpeg") => void;
  onNativeShare: () => void;
  onCopy: () => void;
  onPublish: () => void;
  onBack: () => void;
}) {
  const setEdit = <K extends keyof ReportEdits>(key: K, value: ReportEdits[K]) =>
    onEditsChange({ ...edits, [key]: value });
  const storyFragments = edits.storyFragments ?? report.storyFragments;
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="display text-[10px] tracking-[0.35em] text-[var(--ink-soft)]">
              REPORT PREVIEW · 报告预览
            </div>
            <h2 className="cn-serif text-[19px] text-[var(--ink)] mt-1">编辑并发布这份路线报告</h2>
          </div>
          <button onClick={onBack} className="btn-ghost text-[12px] px-3 py-1.5">
            返回设置
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <SegmentedControl<PostchainReportStyle>
            label="STYLE"
            value={reportStyle}
            options={[
              ["moments", "朋友圈"],
              ["literary", "文艺漫游"],
              ["saving", "省心攻略"],
              ["niche", "小众人格"],
            ]}
            onChange={onStyleChange}
          />

          <div className="grid gap-3">
            <div>
              <div className="display text-[9px] tracking-[0.3em] text-[var(--ink-soft)] mb-2">
                EDIT · 报告字段
              </div>
              <div className="grid gap-2">
                {(
                  [
                    ["title", "报告标题", report.title],
                    ["identityBadge", "人设标签", report.identityBadge],
                    ["flexLine", "态度短句", report.flexLine],
                    ["bragLine", "炫耀句", report.bragLine],
                    ["ending", "结尾总结", report.ending],
                    ["nextHook", "后续钩子", report.nextHook],
                  ] as const
                ).map(([key, label, fallback]) => (
                  <label key={key} className="grid gap-1">
                    <span className="cn-serif text-[11px] text-[var(--ink-soft)]">{label}</span>
                    <input
                      value={(edits[key] as string | undefined) ?? fallback}
                      onChange={(e) => setEdit(key, e.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2 cn-serif text-[12px] text-[var(--ink)]"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="display text-[9px] tracking-[0.3em] text-[var(--ink-soft)] mb-2">
                EDIT · 节点故事
              </div>
              <div className="grid gap-2">
                {storyFragments.map((fragment, index) => (
                  <textarea
                    key={`${index}-${report.completedNodes[index]?.order ?? index}`}
                    value={fragment}
                    rows={2}
                    onChange={(e) => {
                      const next = [...storyFragments];
                      next[index] = e.target.value;
                      setEdit("storyFragments", next);
                    }}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2 cn-serif text-[12px] leading-relaxed text-[var(--ink)] resize-none"
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="display text-[9px] tracking-[0.3em] text-[var(--ink-soft)] mb-2">
              COPY · 分享文案
            </div>
            <textarea
              value={shareText}
              onChange={(e) => onShareTextChange(e.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2.5 cn-serif text-[13px] leading-relaxed text-[var(--ink)] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={onCopy} className="btn-ghost justify-center text-[12px]">
              复制文案
            </button>
            <button onClick={() => onExport("image/png")} disabled={exporting} className="btn-soft justify-center text-[12px]">
              {exporting ? "导出中…" : "导出 PNG"}
            </button>
            <button onClick={() => onExport("image/jpeg")} disabled={exporting} className="btn-ghost justify-center text-[12px]">
              导出 JPG
            </button>
            <button onClick={onNativeShare} disabled={exporting} className="btn-ghost justify-center text-[12px]">
              系统分享
            </button>
            <button onClick={onPublish} className="btn-soft col-span-2 justify-center text-[12px]">
              生成分享页
            </button>
          </div>
          {shareUrl && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-3 grid grid-cols-[88px_1fr] gap-3 items-center">
              <img src={qrSvgDataUrl(shareUrl)} alt="分享二维码" className="w-[88px] h-[88px] rounded-xl border border-[var(--border)] bg-white" />
              <div className="min-w-0">
                <div className="display text-[9px] tracking-[0.3em] text-[var(--ink-soft)]">
                  QR · 分享码
                </div>
                <div className="cn-serif text-[11px] text-[var(--ink)] mt-1 break-all">
                  {shareUrl}
                </div>
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2">
            <div className="cn-serif text-[12px] text-[var(--ink)]">
              事实校验：{report.factCheck.ok ? "通过" : "需复核"}
            </div>
            {!report.factCheck.ok && (
              <ul className="mt-1 grid gap-1">
                {report.factCheck.warnings.map((warning) => (
                  <li key={warning} className="cn-serif text-[11px] text-[var(--ink-soft)]">
                    {warning}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <PostchainPoster
        refEl={posterRef}
        chapter={chapter}
        chapterNo={chapterNo}
        dateStr={dateStr}
        report={report}
        privacy={privacy}
      />

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
          ROUTE · 预览节点
        </div>
        <div className="mt-3 grid gap-2">
          {report.completedNodes.concat(report.incompleteNodes).map((node) => (
            <div
              key={`${node.order}-${node.displayName}`}
              className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2"
            >
              <div className="cn-serif text-[13px] text-[var(--ink)]">
                {node.order}. {node.displayName}
              </div>
              <div className="cn-serif text-[11px] text-[var(--ink-soft)] mt-0.5">
                {node.locationType}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PostchainAuthDialog({
  value,
  onChange,
  onCancel,
  onConfirm,
}: {
  value: PostchainAuthLevel;
  onChange: (value: PostchainAuthLevel) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const options: Array<{
    value: PostchainAuthLevel;
    title: string;
    desc: string;
  }> = [
    {
      value: "basic",
      title: "基础授权",
      desc: "仅使用路线完成数据，生成基础路线回顾。",
    },
    {
      value: "personal",
      title: "标准授权",
      desc: "使用本次点位、品类、照片、随笔和心情记录生成个性报告。",
    },
    {
      value: "full",
      title: "高级授权",
      desc: "使用完整本次记录，并预留订单金额、优惠和历史偏好数据位。",
    },
  ];

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)] fade-up"
        role="dialog"
        aria-modal="true"
      >
        <div className="display text-[10px] tracking-[0.35em] text-[var(--ink-soft)]">
          DATA AUTH · 数据授权
        </div>
        <h3 className="cn-serif text-[20px] text-[var(--ink)] mt-1">生成今日出行总结</h3>
        <p className="cn-serif text-[13px] leading-relaxed text-[var(--ink-soft)] mt-2">
          为了生成更准确的路线总结，系统会按你选择的范围使用本次路线完成记录。订单金额等敏感信息默认隐藏，未授权的数据不会出现在分享内容中。
        </p>

        <div className="mt-4 grid gap-2">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                onClick={() => onChange(option.value)}
                className={`text-left rounded-2xl border px-4 py-3 transition ${
                  active
                    ? "bg-[var(--ink)] text-[var(--card)] border-[var(--ink)]"
                    : "bg-[var(--card)] text-[var(--ink)] border-[var(--border)] hover:bg-[var(--muted)]"
                }`}
              >
                <div className="cn-serif text-[14px]">{option.title}</div>
                <div className={`cn-serif text-[12px] mt-0.5 ${active ? "opacity-75" : "text-[var(--ink-soft)]"}`}>
                  {option.desc}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost">
            取消
          </button>
          <button onClick={onConfirm} className="btn-soft">
            同意并生成
          </button>
        </div>
      </div>
    </div>
  );
}

function PrivacySettingsPanel({
  value,
  onChange,
}: {
  value: PostchainPrivacySettings;
  onChange: (value: PostchainPrivacySettings) => void;
}) {
  const items: Array<[keyof PostchainPrivacySettings, string, string]> = [
    ["showMerchantNames", "展示商户名", "关闭后以节点名/品类替代。"],
    ["showVisitTime", "展示具体时间", "关闭后不显示打卡时间。"],
    ["showLocation", "展示城市/地点", "关闭后隐藏城市位置。"],
    ["showPhotos", "展示照片", "关闭后海报不使用打卡照片。"],
    ["showAmount", "展示金额", "订单未接入，先预留开关。"],
    ["showDiscount", "展示优惠", "券包未接入，先预留开关。"],
  ];

  return (
    <div>
      <div className="display text-[9px] tracking-[0.3em] text-[var(--ink-soft)] mb-2">
        PRIVACY
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 grid gap-2">
        {items.map(([key, title, desc]) => (
          <label key={key} className="flex items-start gap-3 cn-serif text-[12px] text-[var(--ink)]">
            <input
              type="checkbox"
              checked={value[key]}
              onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
              className="mt-1 accent-[var(--ink)]"
            />
            <span>
              <span className="block text-[13px]">{title}</span>
              <span className="block text-[11px] text-[var(--ink-soft)] mt-0.5">{desc}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <div className="display text-[9px] tracking-[0.3em] text-[var(--ink-soft)] mb-2">{label}</div>
      <div className="flex flex-wrap gap-1.5 rounded-2xl bg-[var(--muted)] border border-[var(--border)] p-1">
        {options.map(([k, text]) => (
          <button
            key={k}
            onClick={() => onChange(k)}
            className={`cn-serif text-[12px] px-3 py-1.5 rounded-xl transition ${
              value === k
                ? "bg-[var(--card)] text-[var(--ink)] shadow-sm"
                : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function PostchainPoster({
  refEl,
  chapter,
  chapterNo,
  dateStr,
  report,
  privacy,
}: {
  refEl: React.RefObject<HTMLDivElement | null>;
  chapter: ArchivedChapter;
  chapterNo: number;
  dateStr: string;
  report: PostchainReport;
  privacy: PostchainPrivacySettings;
}) {
  const coverPhoto = report.photoUrls[0] || chapter.card.cover;
  return (
    <article
      ref={refEl}
      className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--card)] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.45)]"
    >
      <div
        className="relative min-h-[620px] p-5"
        style={{
          background: `linear-gradient(180deg, rgba(255,253,243,0.9) 0%, rgba(255,248,240,0.96) 55%, rgba(245,236,218,0.98) 100%), linear-gradient(135deg, ${chapter.card.colors[0]}, ${chapter.card.colors[1]})`,
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="display text-[10px] tracking-[0.35em] text-[var(--ink-soft)]">
              TODAYPERSONA REPORT
            </div>
            <div className="cn-serif text-[12px] text-[var(--ink-soft)] mt-1">
              CH.{String(chapterNo).padStart(2, "0")} · {dateStr}{" "}
              {privacy.showLocation && chapter.city && `· ${chapter.city}`}
            </div>
          </div>
          <div className="rarity-chip" data-rarity={chapter.card.rarity}>
            ✦ {chapter.card.rarity}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-[1fr_108px] gap-4 items-start">
          <div>
            <h3 className="cn-serif text-[30px] leading-tight text-[var(--ink)]">
              {report.identityBadge}
            </h3>
            <p className="cn-serif text-[14px] leading-relaxed text-[var(--ink)] mt-3">
              {report.flexLine}
            </p>
          </div>
          <div
            className="aspect-[3/4] rounded-2xl overflow-hidden border border-[var(--border)] shadow-[8px_8px_0_0_rgba(61,53,48,0.14)]"
            style={
              coverPhoto
                ? {
                    backgroundImage: `url(${coverPhoto})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : {
                    background: `linear-gradient(135deg, ${chapter.card.colors[0]}, ${chapter.card.colors[1]})`,
                  }
            }
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-1.5">
          {report.unlockedKeywords.map((keyword) => (
            <span
              key={keyword}
              className="cn-serif text-[11px] px-2.5 py-1 rounded-full bg-[var(--card)]/85 border border-[var(--border)] text-[var(--ink-soft)]"
            >
              {keyword}
            </span>
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-[var(--card)]/82 border border-[var(--border)] px-4 py-4">
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

        {report.photoUrls.length > 1 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {report.photoUrls.slice(1, 4).map((url, i) => (
              <img
                key={`${url}-${i}`}
                src={url}
                alt=""
                className="aspect-square w-full object-cover rounded-xl border border-[var(--border)]"
              />
            ))}
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-[var(--card)]/85 border border-[var(--border)] p-3">
            <strong className="display text-[28px] leading-none text-[var(--accent)]">
              {Math.round(report.completionRate * 100)}%
            </strong>
            <span className="block cn-serif text-[11px] text-[var(--ink-soft)] mt-1">
              路线完成度
            </span>
          </div>
          <div className="rounded-2xl bg-[var(--card)]/85 border border-[var(--border)] p-3">
            <strong className="display text-[28px] leading-none text-[var(--accent)]">
              {report.rarityPercent}%
            </strong>
            <span className="block cn-serif text-[11px] text-[var(--ink-soft)] mt-1">
              城市人格占比
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-[var(--ink)] text-[var(--card)] px-4 py-3">
          <div className="display text-[10px] tracking-[0.28em] opacity-70">BRAG LINE</div>
          <div className="cn-serif text-[16px] leading-snug mt-1">{report.bragLine}</div>
        </div>

        <div className="mt-4 cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)]">
          {report.rarityRankText}
        </div>
      </div>
    </article>
  );
}

/* ============ 收藏馆：地点 / 活动 ============ */
type LibKind = "place" | "activity";

function applyLibFilters(list: LibraryEntry[], filters: MeFilters): LibraryEntry[] {
  let out = list.filter((e) => {
    if (filters.onlyPhoto && !e.hasPhoto) return false;
    if (filters.onlyNote && !e.hasNote) return false;
    if (filters.minLevel > 0 && e.level < filters.minLevel) return false;
    return true;
  });
  if (filters.sort === "recent") out = [...out].sort((a, b) => b.lastAt - a.lastAt);
  else if (filters.sort === "enhanced")
    out = [...out].sort((a, b) => b.level - a.level || b.visits - a.visits);
  // "order" keeps the default sort from buildLibrary (by level desc)
  return out;
}

function LibraryView({
  library,
  sagas,
  empty,
  onGo,
  filters,
}: {
  library: ReturnType<typeof buildLibrary>;
  sagas: ArchivedChapter[];
  empty: boolean;
  onGo: () => void;
  filters: MeFilters;
}) {
  const [open, setOpen] = useState<{ entry: LibraryEntry; kind: LibKind } | null>(null);
  const places = useMemo(() => applyLibFilters(library.places, filters), [library.places, filters]);
  const activities = useMemo(
    () => applyLibFilters(library.activities, filters),
    [library.activities, filters],
  );

  if (empty) return <EmptyState onGo={onGo} />;
  return (
    <>
      <div className="space-y-7">
        <Section title="地点收藏" subtitle={`PLACES · ${places.length}/${library.places.length}`}>
          <div className="grid grid-cols-1 gap-2.5">
            {places.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/60 p-4 text-center cn-serif text-[11px] text-[var(--ink-soft)]">
                没有符合条件的地点
              </div>
            ) : (
              places.map((p) => (
                <LibCard
                  key={p.name}
                  entry={p}
                  kind="place"
                  onOpen={() => setOpen({ entry: p, kind: "place" })}
                />
              ))
            )}
          </div>
        </Section>
        <Section
          title="活动收藏"
          subtitle={`ACTIVITIES · ${activities.length}/${library.activities.length}`}
        >
          <div className="grid grid-cols-1 gap-2.5">
            {activities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/60 p-4 text-center cn-serif text-[11px] text-[var(--ink-soft)]">
                没有符合条件的活动
              </div>
            ) : (
              activities.map((a) => (
                <LibCard
                  key={a.name}
                  entry={a}
                  kind="activity"
                  onOpen={() => setOpen({ entry: a, kind: "activity" })}
                />
              ))
            )}
          </div>
        </Section>
      </div>

      {open && (
        <LibraryDetail
          entry={open.entry}
          kind={open.kind}
          sagas={sagas}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3">
        <div className="display text-[10px] tracking-[0.4em] text-[var(--ink-soft)]">
          {subtitle}
        </div>
        <h2 className="cn-serif text-[17px] text-[var(--ink)]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function CityPreferenceView({
  profile,
  memory,
  empty,
  onGo,
}: {
  profile: ReturnType<typeof buildCityPreferenceProfile>;
  memory: DmMemorySnapshot | null;
  empty: boolean;
  onGo: () => void;
}) {
  if (empty) return <EmptyState onGo={onGo} />;
  const sourceLabel =
    profile.memorySource === "mixed" ? "云端画像 + 本地连载" : profile.memorySource === "cloud" ? "云端画像" : "本地连载";
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="display text-[10px] tracking-[0.35em] text-[var(--ink-soft)]">
          CITY PROFILE · 城市偏好档案
        </div>
        <h2 className="cn-serif text-[22px] leading-snug text-[var(--ink)] mt-2">
          {profile.persona}
        </h2>
        <div className="cn-serif text-[11px] text-[var(--ink-soft)] mt-2">
          来源：{sourceLabel}{memory ? ` · 累计 ${memory.total_runs} 次云端记录` : ""}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <PreferenceCard title="常去城市" items={profile.topCities} empty="暂无城市" />
        <PreferenceCard title="常去商圈/区域" items={profile.topDistricts} empty="暂无区域" />
        <PreferenceCard title="偏好品类" items={profile.topCategories} empty="暂无品类" />
        <PreferenceCard title="路线节奏" items={[profile.pace]} empty="暂无节奏" />
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
          TREND · 偏好变化
        </div>
        <p className="cn-serif text-[13px] leading-relaxed text-[var(--ink)] mt-2">
          {profile.trendSummary}
        </p>
        <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2 cn-serif text-[12px] leading-relaxed text-[var(--ink-soft)]">
          {profile.paceReason}
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
          TAGS · 情绪与关键词
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[...profile.emotionTags, ...profile.keywords].slice(0, 14).map((tag) => (
            <span
              key={tag}
              className="cn-serif text-[11px] px-2.5 py-1 rounded-full bg-[var(--muted)] text-[var(--ink-soft)] border border-[var(--border)]"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
          NEXT ROUTE · 下一条推荐理由
        </div>
        <div className="mt-2 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2">
          <div className="display text-[9px] tracking-[0.28em] text-[var(--ink-soft)]">
            BRIEF
          </div>
          <div className="cn-serif text-[14px] text-[var(--ink)] mt-1">
            {profile.nextRouteBrief}
          </div>
        </div>
        <p className="cn-serif text-[14px] leading-relaxed text-[var(--ink)] mt-2">
          {profile.nextRecommendationReason}
        </p>
        <div className="mt-3 grid gap-2">
          {[...profile.recommendationProof, ...profile.categoryReasons.slice(0, 2), ...profile.districtReasons.slice(0, 1)].map((proof) => (
            <div
              key={proof}
              className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2 cn-serif text-[11px] leading-relaxed text-[var(--ink-soft)]"
            >
              {proof}
            </div>
          ))}
        </div>
        {memory?.disliked_tags?.length ? (
          <div className="mt-3 cn-serif text-[11px] text-[var(--ink-soft)]">
            会避开的标签：{memory.disliked_tags.join("、")}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function PreferenceCard({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
      <div className="display text-[9px] tracking-[0.28em] text-[var(--ink-soft)]">
        {title}
      </div>
      <div className="mt-2 space-y-1">
        {(items.length ? items : [empty]).map((item) => (
          <div key={item} className="cn-serif text-[13px] text-[var(--ink)]">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function LibCard({
  entry,
  kind,
  onOpen,
}: {
  entry: LibraryEntry;
  kind: LibKind;
  onOpen: () => void;
}) {
  const stars = Math.min(5, Math.max(1, entry.level || 1));
  const lit = entry.level > 0;
  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 flex items-center gap-3 transition-transform hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-22px_rgba(0,0,0,0.3)]"
    >
      <div className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center bg-[var(--muted)] overflow-hidden">
        {kind === "place" ? (
          <VenueIcon kind={detectVenue(entry.type, entry.name)} size={48} />
        ) : (
          <div className="text-2xl">✶</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="cn-serif text-[14px] text-[var(--ink)] truncate">{entry.name}</div>
        <div className="cn-serif text-[11px] text-[var(--ink-soft)] truncate">
          {entry.type} · 访 {entry.visits} 次{lit ? ` · 增强 ${entry.level}` : ""}
        </div>
        {entry.emotions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {entry.emotions.slice(0, 3).map((e) => (
              <span
                key={e}
                className="text-[10px] cn-serif px-1.5 py-0.5 rounded-full bg-[var(--muted)] text-[var(--ink-soft)]"
              >
                {e}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="display text-[12px] tracking-widest" title={`Lv.${entry.level}`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} style={{ opacity: i < stars && lit ? 1 : 0.2 }}>
              ✦
            </span>
          ))}
        </div>
        <span className="display text-[9px] tracking-[0.2em] text-[var(--ink-soft)]">详情 →</span>
      </div>
    </button>
  );
}

interface Appearance {
  chapterId: string;
  chapterNo: number;
  date: Date;
  card: ArchivedChapter["card"];
  city?: string;
  scene: ArchivedChapter["journey"]["scenes"][number];
  rec?: NonNullable<ArchivedChapter["sceneRecords"]>[number];
  enhanced: boolean;
}

function LibraryDetail({
  entry,
  kind,
  sagas,
  onClose,
}: {
  entry: LibraryEntry;
  kind: LibKind;
  sagas: ArchivedChapter[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // 收集所有出现：按时间倒序
  const appearances: Appearance[] = [];
  sagas.forEach((ch, idx) => {
    const chapterNo = sagas.length - idx;
    for (const s of ch.journey.scenes) {
      if (!ch.completedSceneOrders.includes(s.order)) continue;
      const matched =
        kind === "place" ? s.location_name === entry.name : s.action_task === entry.name;
      if (!matched) continue;
      const rec = ch.sceneRecords?.[s.order];
      appearances.push({
        chapterId: ch.chapterId,
        chapterNo,
        date: new Date(rec?.completedAt ?? ch.archivedAt),
        card: ch.card,
        city: ch.city,
        scene: s,
        rec,
        enhanced: !!(rec?.note || rec?.photo),
      });
    }
  });
  appearances.sort((a, b) => b.date.getTime() - a.date.getTime());

  const photos = appearances.filter((a) => a.rec?.photo);
  const lastStr = appearances.length
    ? `${appearances[0].date.getFullYear()}.${String(appearances[0].date.getMonth() + 1).padStart(2, "0")}.${String(appearances[0].date.getDate()).padStart(2, "0")}`
    : "-";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)] fade-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div
          className="relative px-5 pt-6 pb-5 border-b border-[var(--border)]"
          style={{ background: "linear-gradient(180deg, var(--muted) 0%, transparent 100%)" }}
        >
          <button
            onClick={onClose}
            aria-label="关闭"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/85 text-[var(--ink)] flex items-center justify-center text-[14px]"
          >
            ✕
          </button>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center bg-[var(--card)] border border-[var(--border)] overflow-hidden">
              {kind === "place" ? (
                <VenueIcon kind={detectVenue(entry.type, entry.name)} size={56} />
              ) : (
                <div className="text-3xl">✶</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
                {kind === "place" ? "PLACE · 地点" : "ACTIVITY · 活动"}
              </div>
              <div className="cn-serif text-[18px] text-[var(--ink)] truncate">{entry.name}</div>
              <div className="cn-serif text-[11px] text-[var(--ink-soft)] truncate">
                {entry.type}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            <MiniStat n={entry.visits} label="访问" />
            <MiniStat n={entry.level} label="增强" />
            <MiniStat n={photos.length} label="照片" />
            <MiniStat n={lastStr} label="最近" small />
          </div>

          {entry.emotions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {entry.emotions.map((e) => (
                <span
                  key={e}
                  className="text-[10px] cn-serif px-2 py-0.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--ink-soft)]"
                >
                  {e}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Photo strip */}
        {photos.length > 0 && (
          <div className="px-5 pt-4">
            <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)] mb-2">
              PHOTOS · {photos.length}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 snap-x">
              {photos.map((a, i) => (
                <img
                  key={`${a.chapterId}-${a.scene.order}-${i}`}
                  src={a.rec!.photo!}
                  alt=""
                  className="h-28 w-28 object-cover rounded-xl border border-[var(--border)] shrink-0 snap-start"
                />
              ))}
            </div>
          </div>
        )}

        {/* Appearances timeline */}
        <div className="px-5 pt-5 pb-6">
          <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)] mb-3">
            APPEARANCES · 出现的章节 ({appearances.length})
          </div>
          <ol className="space-y-5">
            {appearances.map((a, i) => {
              const dateStr = `${a.date.getFullYear()}.${String(a.date.getMonth() + 1).padStart(2, "0")}.${String(a.date.getDate()).padStart(2, "0")}`;
              const timeStr = `${String(a.date.getHours()).padStart(2, "0")}:${String(a.date.getMinutes()).padStart(2, "0")}`;
              return (
                <li
                  key={`${a.chapterId}-${a.scene.order}-${i}`}
                  className={`relative pl-7 border-l-2 ${a.enhanced ? "border-[var(--accent)]" : "border-[var(--border)]"}`}
                >
                  <span
                    className="absolute -left-[10px] top-0.5 w-[18px] h-[18px] rounded-full bg-[var(--card)] border-2 border-[var(--accent)] flex items-center justify-center text-[10px] text-[var(--accent)]"
                    style={{ opacity: a.enhanced ? 1 : 0.45 }}
                  >
                    {a.enhanced ? "✦" : "·"}
                  </span>

                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-[var(--border)]"
                      style={
                        a.card.cover
                          ? undefined
                          : {
                              background: `linear-gradient(135deg, ${a.card.colors[0]}, ${a.card.colors[1]})`,
                            }
                      }
                    >
                      {a.card.cover && (
                        <img src={a.card.cover} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="display italic text-[10px] text-[var(--ink-soft)]">
                        CH.{String(a.chapterNo).padStart(2, "0")} · {dateStr} {timeStr}{" "}
                        {a.city && `· ${a.city}`}
                      </div>
                      <div className="cn-serif text-[13px] text-[var(--ink)] truncate">
                        「{a.card.identity}」
                      </div>
                    </div>
                    {a.rec?.mood && <span className="text-[16px] shrink-0">{a.rec.mood}</span>}
                  </div>

                  <div className="cn-serif text-[13px] text-[var(--ink)]">
                    § {a.scene.order} {a.scene.scene_name}
                  </div>
                  {kind === "place" && (
                    <div className="cn-serif text-[11px] text-[var(--ink-soft)] mt-0.5">
                      → {a.scene.action_task}
                    </div>
                  )}
                  {kind === "activity" && (
                    <div className="cn-serif text-[11px] text-[var(--ink-soft)] mt-0.5">
                      @ {a.scene.location_name}
                    </div>
                  )}

                  {a.rec?.photo && (
                    <img
                      src={a.rec.photo}
                      alt=""
                      className="mt-2 rounded-xl border border-[var(--border)] max-h-52 object-cover"
                    />
                  )}
                  {a.rec?.note && (
                    <blockquote className="mt-2 cn-serif text-[13px] text-[var(--ink)] italic border-l-2 border-[var(--accent)]/50 pl-3">
                      "{a.rec.note}"
                    </blockquote>
                  )}
                  {a.enhanced && (
                    <div className="mt-1 display text-[10px] tracking-[0.2em] text-[var(--accent)]">
                      +1 ENHANCE
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="px-5 py-4 border-t border-[var(--border)] sticky bottom-0 bg-[var(--card)]/95 backdrop-blur flex justify-end">
          <button onClick={onClose} className="btn-soft">
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============ Export: 离屏渲染 + PDF 生成 ============ */
function ExportRunner({ job, onDone }: { job: ExportJob; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 等 DOM + 图片
        await new Promise((r) => setTimeout(r, 200));
        const el = ref.current;
        if (!el) {
          onDone();
          return;
        }
        const blob = await elementToPdfBlob(el);
        if (cancelled) return;
        const filename =
          job.kind === "chapter"
            ? `今日人设_CH${String(job.chapterNo).padStart(2, "0")}_${job.ch.card.identity}.pdf`
            : `今日人设_连载全集.pdf`;
        const title =
          job.kind === "chapter"
            ? `今日人设 · CH.${String(job.chapterNo).padStart(2, "0")}`
            : `今日人设 · 连载全集`;
        if (job.mode === "share") {
          const result = await shareOrDownload(blob, filename, title, "我的今日人设连载");
          if (result === "downloaded") {
            alert("当前环境不支持分享，已为你下载 PDF。");
          }
        } else {
          downloadBlob(blob, filename);
        }
      } catch (err) {
        console.error("[export]", err);
        alert("导出失败：" + (err as Error).message);
      } finally {
        if (!cancelled) onDone();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        left: -10000,
        top: 0,
        width: 760,
        background: "#fdfaf6",
        pointerEvents: "none",
      }}
      aria-hidden
    >
      <div
        ref={ref}
        style={{
          padding: "48px 44px",
          color: "#3d3530",
          fontFamily: "var(--font-cn-serif), serif",
        }}
      >
        {job.kind === "chapter" ? (
          <PrintableChapter ch={job.ch} chapterNo={job.chapterNo} />
        ) : (
          <PrintableSeries chapters={job.chapters} />
        )}
      </div>
    </div>
  );
}

function PrintableSeries({ chapters }: { chapters: ArchivedChapter[] }) {
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.4em",
            color: "#8a7a6a",
          }}
        >
          TODAYPERSONA · MY SERIAL TALE
        </div>
        <h1 style={{ fontSize: 36, margin: "12px 0 6px", color: "#3d3530" }}>我的连载</h1>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: 13,
            color: "#8a7a6a",
          }}
        >
          A Serial Tale of Selves · 共 {chapters.length} 章
        </div>
        <div style={{ marginTop: 18, fontSize: 12, color: "#8a7a6a" }}>
          导出于 {new Date().toLocaleString("zh-CN")}
        </div>
      </div>
      {chapters.map((ch, idx) => (
        <div key={ch.chapterId} style={{ marginBottom: 56, pageBreakAfter: "always" }}>
          <PrintableChapter ch={ch} chapterNo={chapters.length - idx} />
        </div>
      ))}
    </div>
  );
}

function PrintableChapter({ ch, chapterNo }: { ch: ArchivedChapter; chapterNo: number }) {
  const date = new Date(ch.createdAt);
  const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  const total = ch.journey.scenes.length;
  const done = ch.completedSceneOrders.length;
  const enhanced = Object.values(ch.sceneRecords ?? {}).filter((r) => r.note || r.photo).length;

  return (
    <article style={{ lineHeight: 1.85 }}>
      {/* Cover */}
      <div
        style={{
          height: 200,
          borderRadius: 16,
          overflow: "hidden",
          position: "relative",
          background: `linear-gradient(135deg, ${ch.card.colors[0]}, ${ch.card.colors[1]})`,
          marginBottom: 20,
        }}
      >
        {ch.card.cover && (
          <img
            src={ch.card.cover}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            crossOrigin="anonymous"
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent 60%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 16,
            right: 16,
            display: "flex",
            justifyContent: "space-between",
            color: "#fff",
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.25em",
          }}
        >
          <span>✦ {ch.card.rarity}</span>
          <span>CH.{String(chapterNo).padStart(2, "0")}</span>
        </div>
        <div style={{ position: "absolute", bottom: 16, left: 18, right: 18, color: "#fff" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 12,
              opacity: 0.85,
            }}
          >
            {dateStr} {ch.city && `· ${ch.city}`}
          </div>
          <div style={{ fontSize: 20, marginTop: 4 }}>「{ch.card.identity}」</div>
          <div style={{ fontSize: 13, fontStyle: "italic", opacity: 0.9, marginTop: 2 }}>
            {ch.card.mood}
          </div>
        </div>
      </div>

      {/* Stats line */}
      <div
        style={{
          display: "flex",
          gap: 16,
          fontSize: 12,
          color: "#8a7a6a",
          marginBottom: 18,
          fontFamily: "var(--font-display)",
          letterSpacing: "0.18em",
        }}
      >
        <span>
          SCENES {done}/{total}
        </span>
        <span>ENHANCE {enhanced}</span>
        <span>
          {ch.journey.emotion_arc.start} → {ch.journey.emotion_arc.end}
        </span>
      </div>

      {/* Opening */}
      <SectionLabel>序章 · OPENING</SectionLabel>
      <p style={{ fontSize: 14, marginTop: 6 }}>{ch.journey.story_opening}</p>

      {/* Scenes */}
      <SectionLabel style={{ marginTop: 22 }}>TIMELINE · 逐场景</SectionLabel>
      <ol style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
        {ch.journey.scenes.map((s) => {
          const rec = ch.sceneRecords?.[s.order];
          const isDone = ch.completedSceneOrders.includes(s.order);
          const t = rec?.completedAt ? new Date(rec.completedAt) : null;
          const timeStr = t
            ? `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`
            : "未点亮";
          return (
            <li
              key={s.order}
              style={{
                borderLeft: `2px solid ${isDone ? "#c89a5a" : "#e5dccf"}`,
                paddingLeft: 16,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 14 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontSize: 11,
                      color: "#8a7a6a",
                      marginRight: 6,
                    }}
                  >
                    § {s.order}
                  </span>
                  {s.scene_name} {rec?.mood && <span style={{ marginLeft: 4 }}>{rec.mood}</span>}
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    color: "#8a7a6a",
                  }}
                >
                  {timeStr}
                </span>
              </div>
              <p style={{ fontSize: 13, margin: "4px 0" }}>{s.persona_narrative}</p>
              <div style={{ fontSize: 11, color: "#8a7a6a" }}>
                @ {s.location_name} · {s.action_task}
              </div>
              {rec?.photo && (
                <img
                  src={rec.photo}
                  alt=""
                  style={{
                    marginTop: 8,
                    maxWidth: "100%",
                    maxHeight: 240,
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "1px solid #e5dccf",
                  }}
                  crossOrigin="anonymous"
                />
              )}
              {rec?.note && (
                <blockquote
                  style={{
                    margin: "8px 0 0",
                    paddingLeft: 12,
                    borderLeft: "2px solid rgba(200,154,90,0.5)",
                    fontStyle: "italic",
                    fontSize: 13,
                  }}
                >
                  "{rec.note}"
                </blockquote>
              )}
            </li>
          );
        })}
      </ol>

      {/* Closing */}
      <SectionLabel style={{ marginTop: 22 }}>终章 · CLOSING</SectionLabel>
      <p style={{ fontSize: 14, marginTop: 6 }}>{ch.journey.closing}</p>
    </article>
  );
}

function SectionLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 10,
        letterSpacing: "0.3em",
        color: "#8a7a6a",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
