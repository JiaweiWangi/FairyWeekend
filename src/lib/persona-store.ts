import type { JourneyRunState, PersonaCard, Journey, SceneRecord } from "./persona-types";

const KEY = "todaypersona:run:v1";
const CARD_KEY = "todaypersona:card:v1";

export function saveRun(run: JourneyRunState) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(run));
}

export function loadRun(): JourneyRunState | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as JourneyRunState; } catch { return null; }
}

export function clearRun() {
  if (typeof window !== "undefined") sessionStorage.removeItem(KEY);
}

export function savePendingCard(card: PersonaCard) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CARD_KEY, JSON.stringify(card));
}
export function loadPendingCard(): PersonaCard | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(CARD_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as PersonaCard; } catch { return null; }
}

export function startRun(card: PersonaCard, journey: Journey, city?: string): JourneyRunState {
  const run: JourneyRunState = {
    card,
    city,
    journey,
    completedSceneOrders: [],
    createdAt: Date.now(),
  };
  saveRun(run);
  return run;
}

export function completeScene(order: number) {
  const run = loadRun();
  if (!run) return;
  if (!run.completedSceneOrders.includes(order)) {
    run.completedSceneOrders.push(order);
    saveRun(run);
  }
}
