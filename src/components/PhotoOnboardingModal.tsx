import { useEffect, useState } from "react";
import { hasOnboarded, markOnboarded } from "@/lib/user-photo";
import { UserPhotoCard } from "./UserPhotoCard";

export function PhotoOnboardingModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasOnboarded()) {
      // 稍微延迟，等首屏动画完成
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  function close() {
    markOnboarded();
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm fade-up px-4 pb-4 sm:p-6">
      <div className="w-full max-w-md rounded-3xl bg-[var(--background)] border border-[var(--border)] shadow-xl p-5 sm:p-6">
        <div className="display text-[10.5px] tracking-[0.35em] text-[var(--ink-soft)]">
          欢迎来到 TODAYPERSONA
        </div>
        <h2 className="cn-serif text-[22px] text-[var(--ink)] mt-2 leading-snug">
          先放一张你的照片
        </h2>
        <p className="cn-serif text-[13.5px] text-[var(--ink-soft)] mt-2 leading-relaxed">
          之后每天的人设卡都会用它做主角，让每张卡都「就是你」。可以随时在「我的」里换。
        </p>

        <div className="mt-5">
          <UserPhotoCard variant="modal" onDone={close} />
        </div>
      </div>
    </div>
  );
}
