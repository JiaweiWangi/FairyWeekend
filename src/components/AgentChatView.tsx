import { useEffect, useMemo, useRef, useState } from "react";
import { PERSONA_CARDS, RARITY_LABEL } from "@/lib/cards";
import type { PersonaCard } from "@/lib/persona-types";

/* -------- 卡片标签映射（用于快速匹配推荐） -------- */
const CARD_TAGS: Record<string, string[]> = {
  card_001: ["治愈", "自然", "安静", "独处"],
  card_002: ["疲惫", "慵懒", "安静", "短时"],
  card_003: ["好奇", "热闹", "复古", "陌生"],
  card_004: ["冒险", "燥", "自然", "热闹", "长时"],
  card_005: ["治愈", "感伤", "安静", "独处"],
  card_006: ["感伤", "独处", "复古", "怀旧"],
  card_007: ["感伤", "怀旧", "记录", "随性"],
  card_008: ["好奇", "热闹", "冒险", "陌生"],
};

type Step = "mood" | "duration" | "vibe" | "extra" | "result";

const MOOD_CHIPS = [
  { label: "想被治愈 🌿", tag: "治愈" },
  { label: "想冒险 🔥", tag: "冒险" },
  { label: "有点累 🥱", tag: "疲惫" },
  { label: "好奇心爆棚 ✨", tag: "好奇" },
  { label: "想独处 🌙", tag: "独处" },
  { label: "想热闹 🎈", tag: "热闹" },
  { label: "有点感伤 🥀", tag: "感伤" },
];
const DURATION_CHIPS = [
  { label: "1 小时左右", tag: "短时" },
  { label: "2–3 小时", tag: "" },
  { label: "半天", tag: "长时" },
  { label: "一整天", tag: "长时" },
];
const VIBE_CHIPS = [
  { label: "安静的角落", tag: "安静" },
  { label: "烟火气", tag: "热闹" },
  { label: "自然/绿意", tag: "自然" },
  { label: "复古/旧时光", tag: "复古" },
  { label: "随便都好", tag: "随性" },
];

interface ChatMsg {
  id: number;
  who: "agent" | "user";
  text?: string;
  chips?: { label: string; tag: string }[];
  step?: Step;
  freeInput?: boolean;
  card?: PersonaCard;
}

function scoreCards(tags: string[], freeText: string): PersonaCard[] {
  const text = freeText.toLowerCase();
  const scored = PERSONA_CARDS.map((c) => {
    const ctags = CARD_TAGS[c.id] ?? [];
    let score = 0;
    for (const t of tags) if (ctags.includes(t)) score += 2;
    // 自由文本里软匹配
    if (text) {
      for (const t of ctags) if (text.includes(t)) score += 1;
      if (text.includes(c.identity.slice(0, 4))) score += 3;
    }
    // 加一点随机扰动避免总是同一张
    score += Math.random() * 0.4;
    return { c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.c);
}

export function AgentChatView({ onAccept }: { onAccept: (c: PersonaCard) => void }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [recIdx, setRecIdx] = useState(0);
  const ranking = useRef<PersonaCard[]>([]);
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const nextId = () => ++idRef.current;

  function push(msg: Omit<ChatMsg, "id">, delay = 600) {
    setTyping(true);
    setTimeout(() => {
      setMsgs((m) => [...m, { id: nextId(), ...msg }]);
      setTyping(false);
    }, delay);
  }

  // 初始化：agent 欢迎 + 第一个问题
  useEffect(() => {
    push({ who: "agent", text: "嗨，我是今日小说的策划助理 ❦" }, 200);
    push({ who: "agent", text: "今天不知道想成为谁？我帮你想。先告诉我——你现在大概是什么状态？" }, 1100);
    push({ who: "agent", chips: MOOD_CHIPS, step: "mood", freeInput: true }, 1900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 自动滚到底
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  function handleChip(step: Step, label: string, tag: string) {
    // 把这条消息的 chips 标记为已选并隐藏（通过移除 chips 字段）
    setMsgs((m) =>
      m.map((x) =>
        x.step === step && x.chips ? { ...x, chips: undefined, freeInput: false } : x,
      ),
    );
    // 显示用户气泡
    setMsgs((m) => [...m, { id: nextId(), who: "user", text: label }]);
    const newTags = tag ? [...tags, tag] : tags;
    setTags(newTags);
    advance(step, newTags, freeText);
  }

  function handleFreeSubmit(currentStep: Step) {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMsgs((m) =>
      m.map((x) =>
        x.step === currentStep && x.chips ? { ...x, chips: undefined, freeInput: false } : x,
      ),
    );
    setMsgs((m) => [...m, { id: nextId(), who: "user", text }]);
    const combined = freeText ? `${freeText} ${text}` : text;
    setFreeText(combined);
    advance(currentStep, tags, combined);
  }

  function advance(fromStep: Step, curTags: string[], curText: string) {
    if (fromStep === "mood") {
      push({ who: "agent", text: "好嘞。今天你大概有多少时间？" }, 700);
      push({ who: "agent", chips: DURATION_CHIPS, step: "duration", freeInput: false }, 1400);
    } else if (fromStep === "duration") {
      push({ who: "agent", text: "想要的氛围是哪种？" }, 700);
      push({ who: "agent", chips: VIBE_CHIPS, step: "vibe", freeInput: false }, 1400);
    } else if (fromStep === "vibe") {
      push({ who: "agent", text: "最后——想再用一句话告诉我什么吗？（比如「想去一家从来没去过的咖啡馆」）" }, 700);
      push({ who: "agent", chips: [{ label: "不用了，给我推荐吧 →", tag: "" }], step: "extra", freeInput: true }, 1400);
    } else if (fromStep === "extra") {
      finalize(curTags, curText);
    }
  }

  function finalize(curTags: string[], curText: string) {
    push({ who: "agent", text: "让我想想……" }, 600);
    setTimeout(() => {
      const ranked = scoreCards(curTags, curText);
      ranking.current = ranked;
      setRecIdx(0);
      push({ who: "agent", text: "为你挑了这张卡 ✦" }, 800);
      push({ who: "agent", card: ranked[0], step: "result" }, 1500);
    }, 1500);
  }

  function reroll() {
    const next = (recIdx + 1) % ranking.current.length;
    setRecIdx(next);
    setMsgs((m) => [...m, { id: nextId(), who: "user", text: "再换一张" }]);
    push({ who: "agent", text: "好，这张如何？" }, 600);
    push({ who: "agent", card: ranking.current[next], step: "result" }, 1200);
  }

  // 找到最后一条等待输入的 agent 消息
  const lastInteractive = useMemo(
    () => [...msgs].reverse().find((m) => m.chips || m.freeInput),
    [msgs],
  );

  return (
    <section className="relative z-10 agent-chat-wrap">
      <p className="text-center cn-serif text-[13px] text-[var(--ink-soft)] mb-5">
        让 AI 边聊边帮你挑一个今天的自己 ❦
      </p>

      <div
        ref={scrollRef}
        className="bg-[var(--muted)]/40 rounded-3xl border border-[var(--border)] p-4 sm:p-5 max-h-[62vh] overflow-y-auto"
      >
        <div className="flex flex-col gap-3">
          {msgs.map((m) => (
            <MsgRow key={m.id} msg={m} onAccept={onAccept} onReroll={reroll} />
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="bubble agent typing-dots">
                <span /><span /><span />
              </div>
            </div>
          )}

          {/* chips */}
          {lastInteractive?.chips && (
            <div className="flex flex-wrap gap-2 mt-1 pl-1">
              {lastInteractive.chips.map((c, i) => (
                <button
                  key={i}
                  className="chip"
                  onClick={() => handleChip(lastInteractive.step!, c.label, c.tag)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {/* free input */}
          {lastInteractive?.freeInput && (
            <form
              onSubmit={(e) => { e.preventDefault(); handleFreeSubmit(lastInteractive.step!); }}
              className="mt-2 flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="也可以自己说一句…"
                className="flex-1 px-4 py-2.5 rounded-full bg-[var(--card)] border border-[var(--border)] cn-serif text-[14px] text-[var(--ink)] placeholder:text-[var(--ink-soft)]"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-4 py-2.5 rounded-full bg-[var(--ink)] text-[var(--card)] cn-serif text-[13px] disabled:opacity-40"
              >
                发送
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="text-center text-[11px] cn-serif text-[var(--ink-soft)] mt-3">
        点气泡就行，也可以打字补充 — 都可以。
      </div>
    </section>
  );
}

function MsgRow({
  msg, onAccept, onReroll,
}: {
  msg: ChatMsg;
  onAccept: (c: PersonaCard) => void;
  onReroll: () => void;
}) {
  if (msg.card) {
    return (
      <div className="flex justify-start">
        <RecCard card={msg.card} onAccept={onAccept} onReroll={onReroll} />
      </div>
    );
  }
  if (!msg.text) return null;
  return (
    <div className={`flex ${msg.who === "user" ? "justify-end" : "justify-start"}`}>
      <div className={`bubble ${msg.who}`}>{msg.text}</div>
    </div>
  );
}

function RecCard({
  card, onAccept, onReroll,
}: {
  card: PersonaCard;
  onAccept: (c: PersonaCard) => void;
  onReroll: () => void;
}) {
  const [a, b, c] = card.colors;
  return (
    <div
      className="persona-card overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] w-[260px] shadow-[0_14px_36px_-20px_rgba(0,0,0,0.25)] fade-up"
      data-rarity={card.rarity}
    >
      <div
        className="relative h-36 overflow-hidden"
        style={card.cover ? undefined : { background: `linear-gradient(160deg, ${a}, ${b})` }}
      >
        {card.cover ? (
          <img src={card.cover} alt={card.identity} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background: `radial-gradient(circle at 25% 30%, ${c} 0%, transparent 45%), radial-gradient(circle at 75% 70%, ${a} 0%, transparent 50%)`,
            }}
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute top-2 left-2 rarity-chip" data-rarity={card.rarity}>
          ✦ {card.rarity} · {RARITY_LABEL[card.rarity]}
        </div>
      </div>
      <div className="p-3.5">
        <div className="cn-serif text-[10px] tracking-[0.22em] text-[var(--ink-soft)]">为你推荐</div>
        <h3 className="cn-serif text-[14.5px] leading-snug mt-1 text-[var(--ink)]">{card.identity}</h3>
        <div className="mt-1.5 cn-serif text-[12px] text-[var(--ink-soft)] italic line-clamp-2">
          「{card.mission}」
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onAccept(card)}
            className="flex-1 px-3 py-2 rounded-full bg-[var(--ink)] text-[var(--card)] cn-serif text-[12.5px]"
          >
            就是它 →
          </button>
          <button
            onClick={onReroll}
            className="px-3 py-2 rounded-full border border-[var(--border)] cn-serif text-[12.5px] text-[var(--ink-soft)]"
          >
            换一张
          </button>
        </div>
      </div>
    </div>
  );
}
