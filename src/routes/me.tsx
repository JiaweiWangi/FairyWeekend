import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { loadSagas, buildLibrary, deleteChapter, type ArchivedChapter, type LibraryEntry } from "@/lib/persona-store";
import { VenueIcon, detectVenue } from "@/components/VenueIcon";


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
        {tab === "library" && <LibraryView library={library} empty={sagas.length === 0} onGo={() => navigate({ to: "/" })} />}
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
function LibraryView({ library, empty, onGo }: { library: ReturnType<typeof buildLibrary>; empty: boolean; onGo: () => void }) {
  if (empty) return <EmptyState onGo={onGo} />;
  return (
    <div className="space-y-7">
      <Section title="地点收藏" subtitle="PLACES · 走过的真实角落">
        <div className="grid grid-cols-1 gap-2.5">
          {library.places.map((p) => <LibCard key={p.name} entry={p} kind="place" />)}
        </div>
      </Section>
      <Section title="活动收藏" subtitle="ACTIVITIES · 做过的具体小事">
        <div className="grid grid-cols-1 gap-2.5">
          {library.activities.map((a) => <LibCard key={a.name} entry={a} kind="activity" />)}
        </div>
      </Section>
    </div>
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

function LibCard({ entry, kind }: { entry: LibraryEntry; kind: "place" | "activity" }) {
  const stars = Math.min(5, Math.max(1, entry.level || 1));
  const lit = entry.level > 0;
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 flex items-center gap-3">
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
      <div className="display text-[12px] tracking-widest" title={`Lv.${entry.level}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} style={{ opacity: i < stars && lit ? 1 : 0.2 }}>✦</span>
        ))}
      </div>
    </div>
  );
}
