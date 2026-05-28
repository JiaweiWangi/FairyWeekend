import { useEffect, useRef, useState } from "react";
import {
  fileToCompressedDataUrl,
  getUserPhoto,
  setUserPhoto,
  subscribeUserPhoto,
  setPersonalizedCard,
  getPersonalizedCard,
  clearPersonalizedCard,
} from "@/lib/user-photo";
import { PERSONA_CARDS } from "@/lib/cards";

interface Props {
  variant?: "modal" | "inline";
  onDone?: () => void;
}

async function urlToDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export function UserPhotoCard({ variant = "inline", onDone }: Props) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 批量生成状态
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchDone, setBatchDone] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchFailed, setBatchFailed] = useState<string[]>([]);
  const [generatedCount, setGeneratedCount] = useState(0);
  const cancelRef = useRef(false);

  function refreshGeneratedCount() {
    if (typeof window === "undefined") return;
    let n = 0;
    for (const c of PERSONA_CARDS) if (getPersonalizedCard(c.id)) n++;
    setGeneratedCount(n);
  }

  useEffect(() => {
    setPhoto(getUserPhoto());
    refreshGeneratedCount();
    return subscribeUserPhoto((p) => {
      setPhoto(p);
      refreshGeneratedCount();
    });
  }, []);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setErr("请选一张图片");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file, 768);
      setUserPhoto(dataUrl);
    } catch {
      setErr("处理图片失败，再试一次");
    } finally {
      setBusy(false);
    }
  }

  async function handleBatchGenerate(force = false) {
    if (!photo || batchRunning) return;
    cancelRef.current = false;
    setBatchRunning(true);
    setBatchFailed([]);
    setBatchDone(0);

    const targets = force
      ? PERSONA_CARDS
      : PERSONA_CARDS.filter((c) => !getPersonalizedCard(c.id));
    setBatchTotal(targets.length);

    if (targets.length === 0) {
      setBatchRunning(false);
      return;
    }

    const failed: string[] = [];
    // 串行，避免触发限流；逐张更新进度
    for (const card of targets) {
      if (cancelRef.current) break;
      try {
        const coverDataUrl = card.cover ? await urlToDataUrl(card.cover) : "";
        const res = await fetch("/api/personalize-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userPhoto: photo,
            cardCover: coverDataUrl,
            identity: card.identity,
            mood: card.mood,
            illustration_keyword: card.illustration_keyword,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const { image } = (await res.json()) as { image: string };
        setPersonalizedCard(card.id, image);
      } catch {
        failed.push(card.identity);
      } finally {
        setBatchDone((n) => n + 1);
        refreshGeneratedCount();
      }
    }
    setBatchFailed(failed);
    setBatchRunning(false);
  }

  function handleClearAll() {
    if (!confirm("清除所有已生成的人设卡？")) return;
    for (const c of PERSONA_CARDS) clearPersonalizedCard(c.id);
    refreshGeneratedCount();
  }

  const total = PERSONA_CARDS.length;
  const allDone = generatedCount === total;

  return (
    <div
      className={
        variant === "inline"
          ? "rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
          : ""
      }
    >
      <div className="flex items-start gap-4">
        <div className="relative w-20 h-20 shrink-0 rounded-full overflow-hidden border-2 border-[var(--border)] bg-[var(--muted)] flex items-center justify-center">
          {photo ? (
            <img src={photo} alt="你的照片" className="w-full h-full object-cover" />
          ) : (
            <span className="display text-[11px] tracking-[0.2em] text-[var(--ink-soft)]">
              NO<br />PHOTO
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="cn-serif text-[15px] text-[var(--ink)] leading-snug">
            {photo ? "你的照片" : "上传一张你的照片"}
          </div>
          <p className="cn-serif text-[12.5px] text-[var(--ink-soft)] mt-1 leading-relaxed">
            会用在每天的人设卡上，让卡片真的属于你。只存在你这台设备上，不会上传。
          </p>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy || batchRunning}
          className="px-4 py-2 rounded-full bg-[var(--ink)] text-[var(--card)] cn-serif text-[13px] disabled:opacity-50"
        >
          {busy ? "处理中…" : photo ? "换一张" : "选择照片"}
        </button>
        {photo && (
          <button
            type="button"
            onClick={() => setUserPhoto(null)}
            disabled={batchRunning}
            className="px-4 py-2 rounded-full border border-[var(--border)] cn-serif text-[13px] text-[var(--ink-soft)] disabled:opacity-50"
          >
            移除
          </button>
        )}
        {variant === "modal" && (
          <button
            type="button"
            onClick={onDone}
            className="ml-auto px-4 py-2 rounded-full cn-serif text-[13px] text-[var(--ink-soft)]"
          >
            {photo ? "好了" : "先跳过"}
          </button>
        )}
      </div>

      {err && (
        <p className="mt-2 cn-serif text-[12px] text-[oklch(0.55_0.18_25)]">{err}</p>
      )}

      {/* 一键生成所有人设卡 */}
      {photo && variant === "inline" && (
        <div className="mt-5 pt-5 border-t border-dashed border-[var(--border)]">
          <div className="flex items-baseline justify-between gap-3">
            <div className="cn-serif text-[14px] text-[var(--ink)]">
              ✨ 把所有人设卡都画成你
            </div>
            <div className="display text-[10.5px] tracking-[0.2em] text-[var(--ink-soft)]">
              {generatedCount}/{total}
            </div>
          </div>
          <p className="cn-serif text-[12.5px] text-[var(--ink-soft)] mt-1 leading-relaxed">
            AI 会为每一张人设卡生成一张「你的版本」，融合你的形象与卡片风格。约 10-20 秒/张，可随时停止。
          </p>

          {batchRunning && (
            <div className="mt-3">
              <div className="h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
                <div
                  className="h-full bg-[var(--ink)] transition-all"
                  style={{ width: `${batchTotal ? (batchDone / batchTotal) * 100 : 0}%` }}
                />
              </div>
              <div className="cn-serif text-[11.5px] text-[var(--ink-soft)] mt-1.5">
                正在生成 {batchDone}/{batchTotal}…
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {!batchRunning ? (
              <>
                <button
                  type="button"
                  onClick={() => handleBatchGenerate(false)}
                  className="px-4 py-2 rounded-full bg-[var(--ink)] text-[var(--card)] cn-serif text-[13px]"
                >
                  {allDone ? "全部已生成" : generatedCount > 0 ? "继续生成剩余" : "一键生成全部"}
                </button>
                {generatedCount > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleBatchGenerate(true)}
                      className="px-4 py-2 rounded-full border border-[var(--border)] cn-serif text-[13px] text-[var(--ink-soft)]"
                    >
                      全部重新生成
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="px-4 py-2 rounded-full cn-serif text-[13px] text-[var(--ink-soft)]"
                    >
                      清空
                    </button>
                  </>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  cancelRef.current = true;
                }}
                className="px-4 py-2 rounded-full border border-[var(--border)] cn-serif text-[13px] text-[var(--ink-soft)]"
              >
                停止
              </button>
            )}
          </div>

          {batchFailed.length > 0 && !batchRunning && (
            <p className="mt-2 cn-serif text-[12px] text-[oklch(0.55_0.18_25)]">
              {batchFailed.length} 张生成失败：{batchFailed.slice(0, 3).join("、")}
              {batchFailed.length > 3 ? "…" : ""}（再点一次「继续生成剩余」可重试）
            </p>
          )}
        </div>
      )}
    </div>
  );
}
