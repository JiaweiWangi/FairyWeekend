import { useEffect, useRef, useState } from "react";
import {
  fileToCompressedDataUrl,
  getUserPhoto,
  setUserPhoto,
  subscribeUserPhoto,
} from "@/lib/user-photo";

interface Props {
  variant?: "modal" | "inline";
  onDone?: () => void;
}

export function UserPhotoCard({ variant = "inline", onDone }: Props) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPhoto(getUserPhoto());
    return subscribeUserPhoto(setPhoto);
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
          disabled={busy}
          className="px-4 py-2 rounded-full bg-[var(--ink)] text-[var(--card)] cn-serif text-[13px] disabled:opacity-50"
        >
          {busy ? "处理中…" : photo ? "换一张" : "选择照片"}
        </button>
        {photo && (
          <button
            type="button"
            onClick={() => setUserPhoto(null)}
            className="px-4 py-2 rounded-full border border-[var(--border)] cn-serif text-[13px] text-[var(--ink-soft)]"
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
    </div>
  );
}
