import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { drawCard, RARITY_LABEL } from "@/lib/cards";
import { savePendingCard } from "@/lib/persona-store";
import type { PersonaCard } from "@/lib/persona-types";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const navigate = useNavigate();
  const [drawn, setDrawn] = useState<PersonaCard | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [drawCount, setDrawCount] = useState(0);
  const lastIdRef = useRef<string | undefined>(undefined);

  // 浮动花瓣装饰
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

  function handleDraw() {
    if (drawing) return;
    setDrawing(true);
    setFlipped(false);
    setDrawn(null);

    // 抽卡：先飘入 → 翻面
    setTimeout(() => {
      const card = drawCard(lastIdRef.current);
      lastIdRef.current = card.id;
      setDrawn(card);
      setDrawCount((c) => c + 1);
      // 翻面
      setTimeout(() => setFlipped(true), 220);
      // 解锁按钮
      setTimeout(() => setDrawing(false), 1200);
    }, 280);
  }

  function handleAccept() {
    if (!drawn) return;
    savePendingCard(drawn);
    navigate({ to: "/card" });
  }

  // 自动展示一次
  useEffect(() => {
    const t = setTimeout(() => handleDraw(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden px-5 pt-10 pb-14 max-w-xl mx-auto">
      {/* 背景浮动花瓣 */}
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
      <header className="text-center mb-8 relative z-10 fade-up">
        <div className="display text-xs tracking-[0.4em] text-[var(--ink-soft)] mb-3">
          TODAYPERSONA · v0.1
        </div>
        <h1 className="display text-5xl md:text-6xl text-[var(--ink)] leading-[1.05]">
          今日<span className="italic">人设</span>
        </h1>
        <p className="cn-serif mt-4 text-[15px] text-[var(--ink-soft)]">
          抽一张卡，活进今天的故事里
        </p>
      </header>

      {/* Card stage */}
      <section className="relative z-10 flex flex-col items-center">
        {/* SSR halo */}
        {drawn?.rarity === "SSR" && flipped && <div className="ssr-halo" />}

        <div
          className={`flip-card relative ${flipped ? "is-flipped" : ""}`}
          style={{ width: 300, height: 420 }}
        >
          <div
            className="flip-card-inner"
            style={{
              transform: drawing && !drawn ? "translateY(40px) scale(0.92)" : undefined,
              opacity: drawing && !drawn ? 0 : 1,
              transition: "transform 0.5s ease, opacity 0.4s ease",
            }}
          >
            {/* 背面 */}
            <div className="flip-card-face card-back" />
            {/* 正面（人设卡）*/}
            <div className="flip-card-face back persona-card" data-rarity={drawn?.rarity}>
              {drawn && <CardFront card={drawn} />}
            </div>
          </div>
        </div>

        {/* SR/SSR sparkles */}
        {flipped && drawn && (drawn.rarity === "SR" || drawn.rarity === "SSR") && (
          <div className="pointer-events-none absolute inset-0">
            {Array.from({ length: drawn.rarity === "SSR" ? 18 : 8 }).map((_, i) => (
              <span
                key={i}
                className="spark"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  width: 6 + Math.random() * 6,
                  height: 6 + Math.random() * 6,
                  ['--dx' as string]: `${(Math.random() - 0.5) * 120}px`,
                  animationDelay: `${Math.random() * 0.8}s`,
                  animationDuration: `${3 + Math.random() * 2}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}

        {/* Action area */}
        <div className="mt-10 flex flex-col items-center gap-3 relative z-10">
          {flipped && drawn ? (
            <>
              <button onClick={handleAccept} className="btn-soft">
                接受这个自己 →
              </button>
              <button onClick={handleDraw} className="btn-ghost" disabled={drawing}>
                再抽一次 ✶
              </button>
              <div className="cn-serif text-xs text-[var(--ink-soft)] mt-1">
                第 {drawCount} 次抽卡
              </div>
            </>
          ) : (
            <button onClick={handleDraw} className="btn-soft" disabled={drawing}>
              {drawing ? "抽取中…" : "抽取今日人设"}
            </button>
          )}
        </div>
      </section>

      <footer className="mt-16 text-center text-[11px] tracking-[0.3em] text-[var(--ink-soft)] display relative z-10">
        © 2026 · MEITUAN HACKATHON
      </footer>
    </div>
  );
}

function CardFront({ card }: { card: PersonaCard }) {
  const [a, b, c] = card.colors;
  return (
    <div className="h-full w-full flex flex-col">
      {/* 插画区（渐变 + 装饰花瓣）*/}
      <div
        className="relative h-[40%] overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${a} 0%, ${b} 100%)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              `radial-gradient(circle at 25% 30%, ${c} 0%, transparent 45%), radial-gradient(circle at 75% 70%, ${a} 0%, transparent 50%)`,
          }}
        />
        <div className="absolute top-3 left-3 rarity-chip" data-rarity={card.rarity}>
          ✦ {card.rarity} · {RARITY_LABEL[card.rarity]}
        </div>
        <div className="absolute bottom-3 right-3 display italic text-[13px] text-[var(--ink)] opacity-70">
          {card.id.replace("card_", "No.")}
        </div>
      </div>

      {/* 内容区 */}
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
