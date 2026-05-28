// 用户照片本地存储 + 每张卡的 AI 合成结果缓存
const PHOTO_KEY = "todaypersona.user_photo_v1";
const ONBOARD_KEY = "todaypersona.photo_onboarded_v1";
const PERSONALIZED_PREFIX = "todaypersona.personalized_card_v1.";

type Listener = (photo: string | null) => void;
const listeners = new Set<Listener>();

export function getUserPhoto(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PHOTO_KEY);
  } catch {
    return null;
  }
}

export function setUserPhoto(dataUrl: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (dataUrl) {
      localStorage.setItem(PHOTO_KEY, dataUrl);
    } else {
      localStorage.removeItem(PHOTO_KEY);
      // 清掉所有合成缓存（照片换了，旧的就过时了）
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PERSONALIZED_PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    }
  } catch {
    /* quota */
  }
  listeners.forEach((l) => l(dataUrl));
}

export function subscribeUserPhoto(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function hasOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(ONBOARD_KEY) === "1";
  } catch {
    return true;
  }
}

export function markOnboarded() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARD_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function getPersonalizedCard(cardId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PERSONALIZED_PREFIX + cardId);
  } catch {
    return null;
  }
}

export function setPersonalizedCard(cardId: string, dataUrl: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PERSONALIZED_PREFIX + cardId, dataUrl);
  } catch {
    /* quota */
  }
}

export function clearPersonalizedCard(cardId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PERSONALIZED_PREFIX + cardId);
  } catch {
    /* ignore */
  }
}

// 把 File -> 压缩后的 data URL（最长边 768px，jpeg 0.85）
export async function fileToCompressedDataUrl(file: File, maxSide = 768): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

