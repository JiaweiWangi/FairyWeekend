import { useEffect, useState } from "react";
import { getUserPhoto, hasOnboarded, markOnboarded } from "@/lib/user-photo";
import { UserPhotoCard } from "./UserPhotoCard";

type Props = {
  /** "auto"：首屏自动弹（旧逻辑，已废弃）；"reward"：任务完成后作为奖励弹出 */
  mode?: "auto" | "reward";
  /** 受控开关，传了就用受控模式 */
  open?: boolean;
  onClose?: () => void;
};

export function PhotoOnboardingModal({ mode = "auto", open: openProp, onClose }: Props) {
  const isControlled = typeof openProp === "boolean";
  const [openState, setOpenState] = useState(false);
  const open = isControlled ? openProp! : openState;

  useEffect(() => {
    if (isControlled) return;
    if (mode === "auto" && !hasOnboarded()) {
      const t = setTimeout(() => setOpenState(true), 600);
      return () => clearTimeout(t);
    }
  }, [isControlled, mode]);

  function close() {
    markOnboarded();
    if (isControlled) onClose?.();
    else setOpenState(false);
  }

  if (!open) return null;

  const isReward = mode === "reward";
  const hasPhoto = !!getUserPhoto();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm fade-up px-4 pb-4 sm:p-6">
      <div className="w-full max-w-md rounded-3xl bg-[var(--background)] border border-[var(--border)] shadow-xl p-5 sm:p-6 relative">
        <button
          onClick={close}
          aria-label="关闭"
          className="absolute top-3 right-3 w-8 h-8 rounded-full text-[var(--ink-soft)] hover:bg-[var(--muted)] flex items-center justify-center text-lg"
        >
          ×
        </button>
        <div className="display text-[10.5px] tracking-[0.35em] text-[var(--ink-soft)]">
          {isReward ? "🎁 解锁奖励" : "欢迎来到 TODAYPERSONA"}
        </div>
        <h2 className="cn-serif text-[22px] text-[var(--ink)] mt-2 leading-snug">
          {isReward
            ? hasPhoto
              ? "再换一张？让人设卡更像你"
              : "把人设卡变成你的样子"
            : "先放一张你的照片"}
        </h2>
        <p className="cn-serif text-[13.5px] text-[var(--ink-soft)] mt-2 leading-relaxed">
          {isReward
            ? "走完了今天的旅程 ✦ 上传一张你的照片，下次开始时，每张人设卡都会带上你的形象。"
            : "之后每天的人设卡都会用它做主角，让每张卡都「就是你」。可以随时在「我的」里换。"}
        </p>

        <div className="mt-5">
          <UserPhotoCard variant="modal" onDone={close} />
        </div>

        <button
          onClick={close}
          className="w-full mt-3 cn-serif text-[12px] text-[var(--ink-soft)] hover:text-[var(--ink)] py-2"
        >
          稍后再说
        </button>
      </div>
    </div>
  );
}
