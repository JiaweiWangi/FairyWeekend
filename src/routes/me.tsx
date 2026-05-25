import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadSagas, buildLibrary, deleteChapter, type ArchivedChapter, type LibraryEntry } from "@/lib/persona-store";
import { VenueIcon, detectVenue } from "@/components/VenueIcon";
import { elementToPdfBlob, downloadBlob, shareOrDownload } from "@/lib/export-pdf";


export const Route = createFileRoute("/me")({ component: MePage });

type Tab = "novel" | "comic" | "library";

function MePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("novel");
  const [reloadKey, setReloadKey] = useState(0);

  const sagas = useMemo(() => loadSagas(), [reloadKey]);
  const library = useMemo(() => buildLibrary(), [reloadKey]);

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

  return (
    <div className="min-h-screen pb-24" style={{ background: "linear-gradient(180deg, #fdfaf6 0%, #f6efe4 60%, #ede4d3 100%)" }}>
      {/* Top bar */}
      <div className="max-w-xl mx-auto px-5 pt-6 flex items-center justify-between">
        <button
          onClick={() => navigate({ to: "/" })}
          className="display text-[11px] tracking-[0.3em] text-[var(--ink)] opacity-70"
        >
          ← 主页
        </button>
        <div className="display text-[10px] tracking-[0.4em] text-[var(--ink-soft)]">MY · ARCHIVE</div>
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
      </header>

      {/* Tabs */}
      <div className="max-w-xl mx-auto px-5 mt-6 flex justify-center">
        <div className="inline-flex rounded-full bg-[var(--muted)] border border-[var(--border)] p-1 text-[12px] cn-serif">
          {([
            ["novel", "连载小说"],
            ["comic", "漫画分镜"],
            ["library", "收藏馆"],
          ] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-1.5 rounded-full transition ${tab === k ? "bg-[var(--card)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-soft)]"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-xl mx-auto px-5 mt-6">
        {sagas.length === 0 && tab !== "library" && <EmptyState onGo={() => navigate({ to: "/" })} />}
        {tab === "novel" && sagas.length > 0 && <NovelView sagas={sagas} onDelete={(id) => { deleteChapter(id); setReloadKey(k => k + 1); }} />}
        {tab === "comic" && sagas.length > 0 && <ComicView sagas={sagas} />}
        {tab === "library" && <LibraryView library={library} sagas={sagas} empty={sagas.length === 0} onGo={() => navigate({ to: "/" })} />}
      </main>
    </div>
  );
}

function StatChip({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] py-2.5">
      <div className="display text-[20px] text-[var(--ink)] leading-none">{n}</div>
      <div className="cn-serif text-[10px] text-[var(--ink-soft)] mt-1 tracking-widest">{label}</div>
    </div>
  );
}

function EmptyState({ onGo }: { onGo: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--card)]/60 p-8 text-center mt-6">
      <div className="text-4xl mb-3">📖</div>
      <div className="cn-serif text-[15px] text-[var(--ink)]">连载还没有第一章</div>
      <div className="cn-serif text-[12px] text-[var(--ink-soft)] mt-1">抽一张人设卡，走完今天的故事</div>
      <button onClick={onGo} className="btn-soft mt-5">去抽卡 →</button>
    </div>
  );
}

/* ============ 连载小说 ============ */
function NovelView({ sagas, onDelete }: { sagas: ArchivedChapter[]; onDelete: (id: string) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const openChapter = sagas.find((c) => c.chapterId === openId) ?? null;
  const openIdx = openChapter ? sagas.indexOf(openChapter) : -1;

  return (
    <>
      <div className="space-y-4">
        {sagas.map((ch, idx) => {
          const date = new Date(ch.createdAt);
          const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
          const chapterNo = sagas.length - idx;
          const total = ch.journey.scenes.length;
          const done = ch.completedSceneOrders.length;
          const enhanced = Object.values(ch.sceneRecords ?? {}).filter((r) => r.note || r.photo).length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          return (
            <button
              key={ch.chapterId}
              onClick={() => setOpenId(ch.chapterId)}
              className="persona-card w-full text-left overflow-hidden block transition-transform hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-22px_rgba(0,0,0,0.35)]"
              data-rarity={ch.card.rarity}
            >
              <div className="relative h-36 overflow-hidden" style={ch.card.cover ? undefined : { background: `linear-gradient(135deg, ${ch.card.colors[0]}, ${ch.card.colors[1]})` }}>
                {ch.card.cover && <img src={ch.card.cover} alt={ch.card.identity} className="w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                  <div className="rarity-chip" data-rarity={ch.card.rarity}>✦ {ch.card.rarity}</div>
                  <div className="display text-[10px] tracking-[0.3em] text-white/90">CH.{String(chapterNo).padStart(2, "0")}</div>
                </div>
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <div className="display italic text-[11px] opacity-80">{dateStr} {ch.city && `· ${ch.city}`}</div>
                  <div className="cn-serif text-[17px] leading-snug mt-0.5 line-clamp-1">「{ch.card.identity}」</div>
                </div>
              </div>
              <div className="px-4 py-3">
                <div className="flex items-center justify-between text-[11px] cn-serif text-[var(--ink-soft)]">
                  <span>{done}/{total} 已点亮 · 增强 {enhanced}</span>
                  <span className="display tracking-[0.2em]">查看 →</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
                  <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {openChapter && (
        <ChapterDetail
          ch={openChapter}
          chapterNo={sagas.length - openIdx}
          onClose={() => setOpenId(null)}
          onDelete={() => {
            if (confirm("从连载中移除这一章？")) {
              setOpenId(null);
              onDelete(openChapter.chapterId);
            }
          }}
        />
      )}
    </>
  );
}

function ChapterDetail({
  ch, chapterNo, onClose, onDelete,
}: {
  ch: ArchivedChapter;
  chapterNo: number;
  onClose: () => void;
  onDelete: () => void;
}) {
  const date = new Date(ch.createdAt);
  const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  const total = ch.journey.scenes.length;
  const done = ch.completedSceneOrders.length;
  const enhanced = Object.values(ch.sceneRecords ?? {}).filter((r) => r.note || r.photo).length;

  // 奖励：本章点亮的地点 + 活动
  const rewards = ch.journey.scenes
    .filter((s) => ch.completedSceneOrders.includes(s.order))
    .map((s) => ({ order: s.order, place: s.location_name, type: s.location_type, action: s.action_task }));

  // 关闭：ESC + 锁滚动
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
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
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm animate-[fade-up_0.2s_ease-out]" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)] fade-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Cover */}
        <div className="relative h-44 overflow-hidden rounded-t-3xl" style={ch.card.cover ? undefined : { background: `linear-gradient(135deg, ${ch.card.colors[0]}, ${ch.card.colors[1]})` }}>
          {ch.card.cover && <img src={ch.card.cover} alt={ch.card.identity} className="w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          <button onClick={onClose} aria-label="关闭" className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/85 text-[var(--ink)] flex items-center justify-center text-[14px]">✕</button>
          <div className="absolute top-3 left-3 rarity-chip" data-rarity={ch.card.rarity}>✦ {ch.card.rarity} · CH.{String(chapterNo).padStart(2, "0")}</div>
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <div className="display italic text-[11px] opacity-85">{dateStr} {ch.city && `· ${ch.city}`}</div>
            <div className="cn-serif text-[19px] leading-snug mt-0.5">「{ch.card.identity}」</div>
            <div className="cn-serif text-[12px] opacity-85 mt-0.5 italic">{ch.card.mood}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-5 pt-4 grid grid-cols-3 gap-2">
          <MiniStat n={`${done}/${total}`} label="点亮场景" />
          <MiniStat n={enhanced} label="笔记/照片" />
          <MiniStat n={`${ch.journey.emotion_arc.start} → ${ch.journey.emotion_arc.end}`} label="情绪弧" small />
        </div>

        {/* Rewards */}
        {rewards.length > 0 && (
          <div className="px-5 mt-5">
            <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)] mb-2">REWARDS · 本章解锁</div>
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
          <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">序章 · OPENING</div>
          <p className="cn-serif text-[14px] leading-[1.95] text-[var(--ink)] mt-1.5">{ch.journey.story_opening}</p>
        </div>

        {/* Timeline */}
        <div className="px-5 mt-5">
          <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)] mb-3">TIMELINE · 逐场景</div>
          <ol className="space-y-5">
            {ch.journey.scenes.map((s) => {
              const rec = ch.sceneRecords?.[s.order];
              const isDone = ch.completedSceneOrders.includes(s.order);
              const time = rec?.completedAt ? new Date(rec.completedAt) : null;
              const timeStr = time ? `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}` : null;
              return (
                <li key={s.order} className={`relative pl-7 border-l-2 ${isDone ? "border-[var(--accent)]" : "border-[var(--border)]"}`}>
                  <span
                    className="absolute -left-[10px] top-0.5 w-[18px] h-[18px] rounded-full bg-[var(--card)] border-2 border-[var(--accent)] flex items-center justify-center text-[10px] text-[var(--accent)]"
                    style={{ opacity: isDone ? 1 : 0.35 }}
                  >
                    {isDone ? "✓" : ""}
                  </span>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="display italic text-[11px] text-[var(--ink-soft)]">§ {s.order}</span>
                      <span className="cn-serif text-[14px] text-[var(--ink)] truncate">{s.scene_name}</span>
                      {rec?.mood && <span className="text-[14px]">{rec.mood}</span>}
                    </div>
                    {timeStr ? (
                      <span className="display text-[10px] tracking-widest text-[var(--ink-soft)] shrink-0">{timeStr}</span>
                    ) : (
                      <span className="display text-[10px] tracking-widest text-[var(--ink-soft)] shrink-0 opacity-60">未点亮</span>
                    )}
                  </div>
                  <p className="cn-serif text-[13px] leading-[1.9] text-[var(--ink)] mt-1">{s.persona_narrative}</p>
                  <div className="cn-serif text-[11px] text-[var(--ink-soft)] mt-1 flex items-center gap-1.5">
                    <VenueIcon kind={detectVenue(s.location_type, s.scene_name)} size={12} />
                    {s.location_name} · {s.action_task}
                  </div>
                  {rec?.photo && (
                    <img src={rec.photo} alt="" className="mt-2 rounded-xl border border-[var(--border)] max-h-56 object-cover" />
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
          <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">终章 · CLOSING</div>
          <p className="cn-serif text-[14px] leading-[1.95] text-[var(--ink)] mt-1.5">{ch.journey.closing}</p>
        </div>

        {/* Footer */}
        <div className="px-5 py-5 mt-4 flex items-center justify-between border-t border-[var(--border)] sticky bottom-0 bg-[var(--card)]/95 backdrop-blur">
          <button onClick={onDelete} className="cn-serif text-[12px] text-[var(--ink-soft)] hover:text-red-600">删除这一章</button>
          <button onClick={onClose} className="btn-soft">关闭</button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ n, label, small }: { n: React.ReactNode; label: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 py-2 px-2 text-center">
      <div className={`cn-serif text-[var(--ink)] leading-tight ${small ? "text-[11px]" : "text-[14px]"}`}>{n}</div>
      <div className="cn-serif text-[10px] text-[var(--ink-soft)] mt-0.5 tracking-widest">{label}</div>
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
                <div className="display italic text-[11px] text-[var(--ink-soft)]">EPISODE {String(chapterNo).padStart(2, "0")} · {date.getMonth() + 1}/{date.getDate()}</div>
                <div className="cn-serif text-[15px] text-[var(--ink)]">「{ch.card.identity}」</div>
              </div>
              <div className="rarity-chip" data-rarity={ch.card.rarity}>✦ {ch.card.rarity}</div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Cover panel */}
              <ComicPanel className="col-span-2 aspect-[2/1]" bg={ch.card.cover} colors={ch.card.colors}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                <div className="absolute bottom-2 left-3 right-3 text-white">
                  <div className="cn-serif text-[13px] leading-tight">{ch.journey.story_opening.slice(0, 38)}…</div>
                </div>
              </ComicPanel>
              {ch.journey.scenes.map((s) => {
                const rec = ch.sceneRecords?.[s.order];
                const venue = detectVenue(s.location_type, s.scene_name);
                return (
                  <ComicPanel key={s.order} className="aspect-square" photo={rec?.photo} colors={ch.card.colors}>
                    {!rec?.photo && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <VenueIcon kind={venue} size={72} />
                      </div>
                    )}
                    <div className="absolute top-1.5 left-1.5 display text-[9px] tracking-widest bg-white/85 rounded px-1.5 py-0.5">§{s.order}</div>
                    {rec?.mood && <div className="absolute top-1.5 right-1.5 text-[18px] drop-shadow">{rec.mood}</div>}
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
                  <p className="cn-serif text-[13px] text-[var(--ink)] italic leading-snug">{ch.journey.closing.slice(0, 60)}…</p>
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
  children, className = "", bg, photo, colors,
}: { children?: React.ReactNode; className?: string; bg?: string; photo?: string; colors: string[] }) {
  const style: React.CSSProperties = photo
    ? { backgroundImage: `url(${photo})`, backgroundSize: "cover", backgroundPosition: "center" }
    : bg
    ? { backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` };
  return (
    <div className={`relative overflow-hidden rounded-xl border-2 border-[var(--ink)]/85 shadow-[3px_3px_0_0_rgba(61,53,48,0.85)] ${className}`} style={style}>
      {children}
    </div>
  );
}

/* ============ 收藏馆：地点 / 活动 ============ */
type LibKind = "place" | "activity";

function LibraryView({
  library, sagas, empty, onGo,
}: {
  library: ReturnType<typeof buildLibrary>;
  sagas: ArchivedChapter[];
  empty: boolean;
  onGo: () => void;
}) {
  const [open, setOpen] = useState<{ entry: LibraryEntry; kind: LibKind } | null>(null);

  if (empty) return <EmptyState onGo={onGo} />;
  return (
    <>
      <div className="space-y-7">
        <Section title="地点收藏" subtitle="PLACES · 走过的真实角落">
          <div className="grid grid-cols-1 gap-2.5">
            {library.places.map((p) => (
              <LibCard key={p.name} entry={p} kind="place" onOpen={() => setOpen({ entry: p, kind: "place" })} />
            ))}
          </div>
        </Section>
        <Section title="活动收藏" subtitle="ACTIVITIES · 做过的具体小事">
          <div className="grid grid-cols-1 gap-2.5">
            {library.activities.map((a) => (
              <LibCard key={a.name} entry={a} kind="activity" onOpen={() => setOpen({ entry: a, kind: "activity" })} />
            ))}
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

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <div className="display text-[10px] tracking-[0.4em] text-[var(--ink-soft)]">{subtitle}</div>
        <h2 className="cn-serif text-[17px] text-[var(--ink)]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function LibCard({ entry, kind, onOpen }: { entry: LibraryEntry; kind: LibKind; onOpen: () => void }) {
  const stars = Math.min(5, Math.max(1, entry.level || 1));
  const lit = entry.level > 0;
  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 flex items-center gap-3 transition-transform hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-22px_rgba(0,0,0,0.3)]"
    >
      <div className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center bg-[var(--muted)] overflow-hidden">
        {kind === "place"
          ? <VenueIcon kind={detectVenue(entry.type, entry.name)} size={48} />
          : <div className="text-2xl">✶</div>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="cn-serif text-[14px] text-[var(--ink)] truncate">{entry.name}</div>
        <div className="cn-serif text-[11px] text-[var(--ink-soft)] truncate">
          {entry.type} · 访 {entry.visits} 次{lit ? ` · 增强 ${entry.level}` : ""}
        </div>
        {entry.emotions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {entry.emotions.slice(0, 3).map((e) => (
              <span key={e} className="text-[10px] cn-serif px-1.5 py-0.5 rounded-full bg-[var(--muted)] text-[var(--ink-soft)]">{e}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="display text-[12px] tracking-widest" title={`Lv.${entry.level}`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} style={{ opacity: i < stars && lit ? 1 : 0.2 }}>✦</span>
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
  entry, kind, sagas, onClose,
}: {
  entry: LibraryEntry;
  kind: LibKind;
  sagas: ArchivedChapter[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
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
      const matched = kind === "place" ? s.location_name === entry.name : s.action_task === entry.name;
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
        <div className="relative px-5 pt-6 pb-5 border-b border-[var(--border)]" style={{ background: "linear-gradient(180deg, var(--muted) 0%, transparent 100%)" }}>
          <button onClick={onClose} aria-label="关闭" className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/85 text-[var(--ink)] flex items-center justify-center text-[14px]">✕</button>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center bg-[var(--card)] border border-[var(--border)] overflow-hidden">
              {kind === "place"
                ? <VenueIcon kind={detectVenue(entry.type, entry.name)} size={56} />
                : <div className="text-3xl">✶</div>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)]">
                {kind === "place" ? "PLACE · 地点" : "ACTIVITY · 活动"}
              </div>
              <div className="cn-serif text-[18px] text-[var(--ink)] truncate">{entry.name}</div>
              <div className="cn-serif text-[11px] text-[var(--ink-soft)] truncate">{entry.type}</div>
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
                <span key={e} className="text-[10px] cn-serif px-2 py-0.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--ink-soft)]">{e}</span>
              ))}
            </div>
          )}
        </div>

        {/* Photo strip */}
        {photos.length > 0 && (
          <div className="px-5 pt-4">
            <div className="display text-[10px] tracking-[0.3em] text-[var(--ink-soft)] mb-2">PHOTOS · {photos.length}</div>
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
                <li key={`${a.chapterId}-${a.scene.order}-${i}`} className={`relative pl-7 border-l-2 ${a.enhanced ? "border-[var(--accent)]" : "border-[var(--border)]"}`}>
                  <span
                    className="absolute -left-[10px] top-0.5 w-[18px] h-[18px] rounded-full bg-[var(--card)] border-2 border-[var(--accent)] flex items-center justify-center text-[10px] text-[var(--accent)]"
                    style={{ opacity: a.enhanced ? 1 : 0.45 }}
                  >
                    {a.enhanced ? "✦" : "·"}
                  </span>

                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-[var(--border)]"
                      style={a.card.cover ? undefined : { background: `linear-gradient(135deg, ${a.card.colors[0]}, ${a.card.colors[1]})` }}
                    >
                      {a.card.cover && <img src={a.card.cover} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="display italic text-[10px] text-[var(--ink-soft)]">
                        CH.{String(a.chapterNo).padStart(2, "0")} · {dateStr} {timeStr} {a.city && `· ${a.city}`}
                      </div>
                      <div className="cn-serif text-[13px] text-[var(--ink)] truncate">「{a.card.identity}」</div>
                    </div>
                    {a.rec?.mood && <span className="text-[16px] shrink-0">{a.rec.mood}</span>}
                  </div>

                  <div className="cn-serif text-[13px] text-[var(--ink)]">
                    § {a.scene.order} {a.scene.scene_name}
                  </div>
                  {kind === "place" && (
                    <div className="cn-serif text-[11px] text-[var(--ink-soft)] mt-0.5">→ {a.scene.action_task}</div>
                  )}
                  {kind === "activity" && (
                    <div className="cn-serif text-[11px] text-[var(--ink-soft)] mt-0.5">@ {a.scene.location_name}</div>
                  )}

                  {a.rec?.photo && (
                    <img src={a.rec.photo} alt="" className="mt-2 rounded-xl border border-[var(--border)] max-h-52 object-cover" />
                  )}
                  {a.rec?.note && (
                    <blockquote className="mt-2 cn-serif text-[13px] text-[var(--ink)] italic border-l-2 border-[var(--accent)]/50 pl-3">
                      "{a.rec.note}"
                    </blockquote>
                  )}
                  {a.enhanced && (
                    <div className="mt-1 display text-[10px] tracking-[0.2em] text-[var(--accent)]">+1 ENHANCE</div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="px-5 py-4 border-t border-[var(--border)] sticky bottom-0 bg-[var(--card)]/95 backdrop-blur flex justify-end">
          <button onClick={onClose} className="btn-soft">关闭</button>
        </div>
      </div>
    </div>
  );
}
