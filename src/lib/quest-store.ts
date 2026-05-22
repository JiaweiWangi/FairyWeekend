// Lightweight session-storage backed store for the current quest run.
import type { QuestRunState, CharacterClass, Quest } from "./quest-types";

const KEY = "driftquest:run:v1";

export function saveRun(run: QuestRunState) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(run));
}

export function loadRun(): QuestRunState | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as QuestRunState;
  } catch {
    return null;
  }
}

export function clearRun() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}

export function unlockStage(order: number) {
  const run = loadRun();
  if (!run) return;
  if (!run.unlockedStageOrders.includes(order)) {
    run.unlockedStageOrders.push(order);
    saveRun(run);
  }
}

export function startRun(opts: {
  character: CharacterClass;
  emotion: string;
  quest: Quest;
}): QuestRunState {
  const run: QuestRunState = {
    character: opts.character,
    emotion: opts.emotion,
    quest: opts.quest,
    unlockedStageOrders: [],
    createdAt: Date.now(),
  };
  saveRun(run);
  return run;
}
