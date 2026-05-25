import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import { PERSONA_CARDS, drawCard, RARITY_LABEL } from "@/lib/cards";
import { savePendingCard } from "@/lib/persona-store";
import type { PersonaCard } from "@/lib/persona-types";
import { AgentChatView } from "@/components/AgentChatView";

export const Route = createFileRoute("/")({ component: Index });

type Mode = "agent" | "spread" | "tarot";

function Index() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("agent");
  const [selected, setSelected] = useState<PersonaCard | null>(null);
  const [tarotRevealed, setTarotRevealed] = useState<PersonaCard | null>(null);

  // 浮动花瓣
  const petals = useMemo(
    () => Array.from({ length: 14 }).map((_, i) => ({
      i,
      left: Math.random() * 100,
      dx: (Math.random() - 0.5) * 200,
      delay: Math.random() * 6,
      duration: 6 + Math.random() * 4,
      size: 8 + Math.random() * 10,
    })),
    [],
  );

  function handleAccept(card: PersonaCard) {
    savePendingCard(card);
    navigate({ to: "/card" });
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-5 pt-10 pb-20 max-w-6xl mx-auto">
      {/* 背景花瓣 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {petals.map((p) => (
          <span
            key={p.i}
            className="petal"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              ['--dx' as string]: `${p.dx}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Header */}
      <header className="text-center mb-6 relative z-10 fade-up">
        <div className="flex items-center justify-between mb-3">
          <div className="display text-xs tracking-[0.4em] text-[var(--ink-soft)]">
            TODAYPERSONA · v0.1
          </div>
          <button
            onClick={() => navigate({ to: "/me" })}
            className="display text-[10px] tracking-[0.3em] text-[var(--ink)] opacity-70 hover:opacity-100 border border-[var(--border)] rounded-full px-3 py-1"
          >
            我的连载 ❦
          </button>
        </div>
        <h1 className="display text-5xl md:text-6xl text-[var(--ink)] leading-[1.05]">
          今日<span className="italic">人设</span>
        </h1>
        <p className="cn-serif mt-4 text-[15px] text-[var(--ink-soft)]">
          选一张卡，活进今天的故事里
        </p>
      </header>


      {/* Mode switch */}
      <div className="relative z-10 flex justify-center mb-8">
        <div className="inline-flex rounded-full bg-[var(--muted)] border border-[var(--border)] p-1 text-[13px] cn-serif flex-wrap gap-1">
          <button
            onClick={() => setMode("agent")}
            className={`px-4 sm:px-5 py-2 rounded-full transition ${mode === "agent" ? "bg-[var(--card)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-soft)]"}`}
          >
            AI 帮我挑 ❦
          </button>
          <button
            onClick={() => { setMode("spread"); setSelected(null); }}
            className={`px-4 sm:px-5 py-2 rounded-full transition ${mode === "spread" ? "bg-[var(--card)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-soft)]"}`}
          >
            我自己选
          </button>
          <button
            onClick={() => { setMode("tarot"); setTarotRevealed(null); }}
            className={`px-4 sm:px-5 py-2 rounded-full transition ${mode === "tarot" ? "bg-[var(--card)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-soft)]"}`}
          >
            让命运决定 ✶
          </button>
        </div>
      </div>

      {mode === "agent" ? (
        <AgentChatView onAccept={handleAccept} />
      ) : mode === "spread" ? (
        <SpreadView
          selected={selected}
          onSelect={setSelected}
          onAccept={handleAccept}
        />
      ) : (
        <TarotView
          revealed={tarotRevealed}
          onDraw={() => setTarotRevealed(drawCard())}
          onAccept={handleAccept}
          onReset={() => setTarotRevealed(null)}
        />
      )}

      <footer className="mt-16 text-center text-[11px] tracking-[0.3em] text-[var(--ink-soft)] display relative z-10">
        © 2026 · MEITUAN HACKATHON
      </footer>
    </div>
  );
}

/* -------- 自选模式：网格展开所有卡 -------- */
function SpreadView({
  selected, onSelect, onAccept,
}: {
  selected: PersonaCard | null;
  onSelect: (c: PersonaCard) => void;
  onAccept: (c: PersonaCard) => void;
}) {
  return (
    <section className="relative z-10">
      <p className="text-center cn-serif text-[13px] text-[var(--ink-soft)] mb-6">
        今天你想成为谁？点一张卡看看
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {PERSONA_CARDS.map((card, idx) => {
          const isSel = selected?.id === card.id;
          return (
            <button
              key={card.id}
              onClick={() => onSelect(card)}
              className={`group relative text-left rounded-2xl overflow-hidden border bg-[var(--card)] transition-all duration-300 fade-up ${
                isSel
                  ? "border-[var(--accent)] shadow-[0_18px_50px_-20px_rgba(0,0,0,0.25)] -translate-y-1"
                  : "border-[var(--border)] hover:-translate-y-1 hover:shadow-[0_14px_36px_-20px_rgba(0,0,0,0.2)]"
              }`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <MiniCardFront card={card} />
            </button>
          );
        })}
      </div>

      {/* 选中后的确认条 */}
      <div
        className={`sticky bottom-4 mt-8 transition-all duration-500 ${
          selected ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"
        }`}
      >
        {selected && (
          <div className="mx-auto max-w-2xl rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.35)] p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl shrink-0"
              style={{
                background: `linear-gradient(135deg, ${selected.colors[0]} 0%, ${selected.colors[1]} 100%)`,
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="cn-serif text-[11px] tracking-[0.2em] text-[var(--ink-soft)]">
                你选择了 · {RARITY_LABEL[selected.rarity]}
              </div>
              <div className="cn-serif text-[15px] text-[var(--ink)] truncate">
                {selected.identity}
              </div>
            </div>
            <button onClick={() => onAccept(selected)} className="btn-soft shrink-0">
              就是它 →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function MiniCardFront({ card }: { card: PersonaCard }) {
  const [a, b, c] = card.colors;
  return (
    <div className="persona-card h-full" data-rarity={card.rarity}>
      <div
        className="relative h-44 sm:h-52 overflow-hidden"
        style={
          card.cover
            ? undefined
            : { background: `linear-gradient(160deg, ${a} 0%, ${b} 100%)` }
        }
      >
        {card.cover ? (
          <img
            src={card.cover}
            alt={card.identity}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background:
                `radial-gradient(circle at 25% 30%, ${c} 0%, transparent 45%), radial-gradient(circle at 75% 70%, ${a} 0%, transparent 50%)`,
            }}
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
        <div className="absolute top-2 left-2 rarity-chip" data-rarity={card.rarity}>
          ✦ {card.rarity}
        </div>
      </div>
      <div className="p-3.5">
        <div className="cn-serif text-[10px] tracking-[0.22em] text-[var(--ink-soft)]">
          IDENTITY
        </div>
        <h3 className="cn-serif text-[14px] leading-snug text-[var(--ink)] mt-1 line-clamp-2 min-h-[2.6em]">
          {card.identity}
        </h3>
        <div className="mt-2 cn-serif text-[12px] text-[var(--ink-soft)] italic line-clamp-2">
          「{card.mission}」
        </div>
      </div>
    </div>
  );
}

/* -------- 塔罗模式：扇形展开 + 手感拖动 -------- */
function TarotView({
  revealed, onDraw, onAccept, onReset,
}: {
  revealed: PersonaCard | null;
  onDraw: () => void;
  onAccept: (c: PersonaCard) => void;
  onReset: () => void;
}) {
  const CARD_COUNT = 21;
  const SPREAD = 78;         // 总角度（度）
  const RADIUS = 520;        // 弧半径（像素）
  const FAN_W = 720;
  const FAN_H = 360;

  const [order, setOrder] = useState(() => Array.from({ length: CARD_COUNT }, (_, i) => i));
  const [hover, setHover] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [shuffling, setShuffling] = useState(false);
  const fanRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number | null>(null);
  const movedRef = useRef(false);

  function reshuffle() {
    setShuffling(true);
    setPicked(null);
    setHover(null);
    setTimeout(() => {
      setOrder((arr) => [...arr].sort(() => Math.random() - 0.5));
      setTimeout(() => setShuffling(false), 600);
    }, 50);
  }

  function pointerToIndex(clientX: number) {
    const el = fanRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    return Math.round(ratio * (CARD_COUNT - 1));
  }

  function onPointerDown(e: React.PointerEvent) {
    if (picked !== null || shuffling) return;
    dragStartX.current = e.clientX;
    movedRef.current = false;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (picked !== null) return;
    const idx = pointerToIndex(e.clientX);
    if (idx !== null) setHover(idx);
    if (dragStartX.current !== null) {
      const dx = e.clientX - dragStartX.current;
      if (Math.abs(dx) > 4) movedRef.current = true;
      setDragOffset(Math.max(-60, Math.min(60, dx * 0.4)));
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    const wasDrag = movedRef.current;
    dragStartX.current = null;
    setDragOffset(0);
    if (wasDrag) {
      // 拖动幅度大就重洗一次
      if (Math.abs(e.clientX - (e.currentTarget.getBoundingClientRect().left + FAN_W / 2)) > 0) {
        // 仅做轻微重排，让"被拨过"的感觉成立
        setOrder((arr) => {
          const a = [...arr];
          const shift = Math.sign(dragOffset || 1);
          if (shift > 0) a.push(a.shift()!); else a.unshift(a.pop()!);
          return a;
        });
      }
    }
  }
  function onPointerLeave() {
    setHover(null);
    setDragOffset(0);
    dragStartX.current = null;
  }

  function handlePick(visualIdx: number) {
    if (picked !== null || shuffling || movedRef.current) return;
    setPicked(visualIdx);
    // 等飞出动画后再翻牌
    setTimeout(() => onDraw(), 650);
  }

  // 当 revealed 被重置（再抽一次），把扇形也复位
  useEffect(() => {
    if (!revealed) {
      setPicked(null);
    }
  }, [revealed]);

  return (
    <section className="relative z-10 flex flex-col items-center">
      <p className="text-center cn-serif text-[13px] text-[var(--ink-soft)] mb-6 max-w-md">
        说不清想成为谁？把手放上去，拨开牌阵，挑一张属于今天的牌。
      </p>

      {!revealed ? (
        <>
          <div
            ref={fanRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerLeave}
            className="relative select-none touch-none"
            style={{ width: FAN_W, height: FAN_H + 80, maxWidth: "100%" }}
          >
            {order.map((cardId, i) => {
              const t = i / (CARD_COUNT - 1);            // 0..1
              const angle = -SPREAD / 2 + SPREAD * t;     // 角度
              const isHover = hover === i && picked === null;
              const isPicked = picked === i;
              const dist = hover === null ? 0 : Math.abs(i - hover);
              // 邻居推开
              const push = hover === null || picked !== null
                ? 0
                : (i < hover ? -1 : i > hover ? 1 : 0) * Math.max(0, 18 - dist * 6);
              const lift = isHover ? -28 : 0;
              const scale = isHover ? 1.06 : 1;

              const baseTransform = isPicked
                ? `translate(-50%, -260px) rotate(0deg) scale(1.15)`
                : `translate(-50%, 0) rotate(${angle}deg) translateY(${lift}px) translateX(${push + dragOffset * (0.6 + t * 0.4)}px) scale(${scale})`;

              return (
                <div
                  key={cardId}
                  onClick={() => handlePick(i)}
                  className={`absolute card-back rounded-2xl cursor-pointer ${shuffling ? "tarot-shuffle" : ""} ${isPicked ? "tarot-fly" : ""}`}
                  style={{
                    left: "50%",
                    bottom: 0,
                    width: 130,
                    height: 200,
                    transformOrigin: `50% ${RADIUS}px`,
                    transform: baseTransform,
                    transition: shuffling
                      ? "transform 0.5s cubic-bezier(.4,0,.2,1)"
                      : isPicked
                        ? "transform 0.65s cubic-bezier(.22,1,.36,1)"
                        : "transform 0.35s cubic-bezier(.22,1,.36,1)",
                    zIndex: isPicked ? 50 : isHover ? 40 : i,
                    boxShadow: isHover
                      ? "0 26px 50px -18px rgba(0,0,0,0.45)"
                      : "0 14px 30px -18px rgba(0,0,0,0.35)",
                    animationDelay: shuffling ? `${i * 0.025}s` : undefined,
                  }}
                />
              );
            })}

            {/* 桌面底部弧线提示 */}
            <div
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-2 cn-serif text-[10px] tracking-[0.3em] text-[var(--ink-soft)]"
            >
              ← 拨动牌阵 · 点击抽取 →
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button onClick={reshuffle} disabled={shuffling} className="btn-ghost">
              {shuffling ? "洗牌中…" : "重新洗牌 ✶"}
            </button>
          </div>
        </>
      ) : (
        <>
          {revealed.rarity === "SSR" && <div className="ssr-halo" />}
          <div className="flip-card is-flipped relative" style={{ width: 300, height: 420 }}>
            <div className="flip-card-inner">
              <div className="flip-card-face card-back" />
              <div className="flip-card-face back persona-card" data-rarity={revealed.rarity}>
                <FullCardFront card={revealed} />
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center gap-3">
            <button onClick={() => onAccept(revealed)} className="btn-soft">
              接受这个自己 →
            </button>
            <button onClick={onReset} className="btn-ghost">
              再抽一次 ✶
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function FullCardFront({ card }: { card: PersonaCard }) {
  const [a, b, c] = card.colors;
  return (
    <div className="h-full w-full flex flex-col">
      <div
        className="relative h-[58%] overflow-hidden"
        style={
          card.cover
            ? undefined
            : { background: `linear-gradient(160deg, ${a} 0%, ${b} 100%)` }
        }
      >
        {card.cover ? (
          <img src={card.cover} alt={card.identity} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background:
                `radial-gradient(circle at 25% 30%, ${c} 0%, transparent 45%), radial-gradient(circle at 75% 70%, ${a} 0%, transparent 50%)`,
            }}
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />
        <div className="absolute top-3 left-3 rarity-chip" data-rarity={card.rarity}>
          ✦ {card.rarity} · {RARITY_LABEL[card.rarity]}
        </div>
        <div className="absolute bottom-3 right-3 display italic text-[13px] text-white/90 drop-shadow">
          {card.id.replace("card_", "No.")}
        </div>
      </div>
      <div className="flex-1 p-5 flex flex-col">
        <div className="cn-serif text-[11px] tracking-[0.25em] text-[var(--ink-soft)]">
          IDENTITY · 身份
        </div>
        <h3 className="cn-serif text-[20px] leading-tight text-[var(--ink)] mt-1">
          {card.identity}
        </h3>
        <div className="mt-4 cn-serif text-[11px] tracking-[0.25em] text-[var(--ink-soft)]">
          MOOD · 今日状态
        </div>
        <div className="cn-serif text-[14px] text-[var(--ink)] mt-1">{card.mood}</div>
        <div className="mt-4 cn-serif text-[11px] tracking-[0.25em] text-[var(--ink-soft)]">
          MISSION · 今日使命
        </div>
        <div className="cn-serif text-[14px] text-[var(--ink)] mt-1 italic">
          「{card.mission}」
        </div>
      </div>
    </div>
  );
}
