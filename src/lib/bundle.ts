import type { JourneyRunState, Rarity } from "./persona-types";

export interface JourneyBundle {
  title: string;
  subtitle: string;
  highlights: string[];      // 3-4 个卖点（来自场景名）
  originalPrice: number;
  dealPrice: number;
  dealId: string;
  perks: string[];           // 套装福利
}

const PRICE_BY_RARITY: Record<Rarity, { deal: number; original: number }> = {
  N:   { deal: 58,  original: 108 },
  R:   { deal: 78,  original: 148 },
  SR:  { deal: 98,  original: 198 },
  SSR: { deal: 168, original: 348 },
};

const PERKS_BY_RARITY: Record<Rarity, string[]> = {
  N:   ["全程含 1 杯饮品", "未到场景自动退款"],
  R:   ["每店至少 1 件招牌", "未到场景原路退回"],
  SR:  ["含 1 个隐藏小店", "全程满减叠加", "未到场景自动退"],
  SSR: ["独家限定体验券", "含人设纪念小物", "全程专属价 · 不可叠加"],
};

export function buildBundle(run: JourneyRunState): JourneyBundle {
  const { card, journey } = run;
  const scenes = journey.scenes ?? [];
  const highlights = scenes.slice(0, 4).map((s) => s.scene_name || s.location_name);
  const price = PRICE_BY_RARITY[card.rarity] ?? PRICE_BY_RARITY.R;
  // 用 card.id 后 6 位做稳定 dealId
  const tail = (card.id || "00000000").replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
  return {
    title: `${card.identity}·今日全程套装`,
    subtitle: card.mission ? `「${card.mission}」一日通行` : "今日人设一日通行",
    highlights,
    originalPrice: price.original,
    dealPrice: price.deal,
    dealId: `MT-${card.rarity}-${tail}`,
    perks: PERKS_BY_RARITY[card.rarity] ?? PERKS_BY_RARITY.R,
  };
}

const KEY = "todaypersona.bundle_purchased.v1";

function readMap(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function writeMap(m: Record<string, number>) {
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* ignore */ }
}

export function isBundlePurchased(cardId: string): boolean {
  if (!cardId) return false;
  return Boolean(readMap()[cardId]);
}

export function markBundlePurchased(cardId: string) {
  if (!cardId) return;
  const m = readMap();
  m[cardId] = Date.now();
  writeMap(m);
}

export function clearBundlePurchase(cardId: string) {
  const m = readMap();
  delete m[cardId];
  writeMap(m);
}
