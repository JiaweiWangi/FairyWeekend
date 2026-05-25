import type { JourneyRunState, PersonaCard, Journey, SceneRecord } from "./persona-types";

const KEY = "todaypersona:run:v1";
const CARD_KEY = "todaypersona:card:v1";
const SAGA_KEY = "todaypersona:saga:v1"; // persistent archive across runs

export interface ArchivedChapter extends JourneyRunState {
  chapterId: string;
  archivedAt: number;
}

export function loadSagas(): ArchivedChapter[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(SAGA_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as ArchivedChapter[]; } catch { return []; }
}

function saveSagas(list: ArchivedChapter[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SAGA_KEY, JSON.stringify(list));
}

export function archiveCurrentRun(): ArchivedChapter | null {
  const run = loadRun();
  if (!run) return null;
  const list = loadSagas();
  const chapterId = `ch-${run.createdAt}`;
  // Avoid duplicate archive of the same run
  if (list.some((c) => c.chapterId === chapterId)) return list.find((c) => c.chapterId === chapterId) ?? null;
  const chapter: ArchivedChapter = { ...run, chapterId, archivedAt: Date.now() };
  const next = [chapter, ...list].slice(0, 100);
  saveSagas(next);
  return chapter;
}

export function deleteChapter(chapterId: string) {
  saveSagas(loadSagas().filter((c) => c.chapterId !== chapterId));
}

export interface LibraryEntry {
  name: string;
  type: string;
  level: number;     // = visits with photo/note count (enhancement)
  visits: number;    // total times visited
  lastAt: number;
  emotions: string[];
  hasPhoto: boolean;
  hasNote: boolean;
}

export function buildLibrary(): { places: LibraryEntry[]; activities: LibraryEntry[] } {
  const sagas = loadSagas();
  const places = new Map<string, LibraryEntry>();
  const activities = new Map<string, LibraryEntry>();
  for (const ch of sagas) {
    for (const s of ch.journey.scenes) {
      const rec = ch.sceneRecords?.[s.order];
      if (!ch.completedSceneOrders.includes(s.order)) continue;
      const enhanced = !!(rec?.note || rec?.photo);
      const pKey = s.location_name;
      const p = places.get(pKey) ?? { name: pKey, type: s.location_type, level: 0, visits: 0, lastAt: 0, emotions: [] };
      p.visits += 1;
      if (enhanced) p.level += 1;
      p.lastAt = Math.max(p.lastAt, rec?.completedAt ?? ch.archivedAt);
      for (const e of s.emotion_tags) if (!p.emotions.includes(e)) p.emotions.push(e);
      places.set(pKey, p);

      const aKey = s.action_task;
      const a = activities.get(aKey) ?? { name: aKey, type: s.scene_name, level: 0, visits: 0, lastAt: 0, emotions: [] };
      a.visits += 1;
      if (enhanced) a.level += 1;
      a.lastAt = Math.max(a.lastAt, rec?.completedAt ?? ch.archivedAt);
      for (const e of s.emotion_tags) if (!a.emotions.includes(e)) a.emotions.push(e);
      activities.set(aKey, a);
    }
  }
  const byLevel = (x: LibraryEntry, y: LibraryEntry) => y.level - x.level || y.visits - x.visits;
  return {
    places: [...places.values()].sort(byLevel),
    activities: [...activities.values()].sort(byLevel),
  };
}


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

export function recordScene(order: number, patch: Partial<Omit<SceneRecord, "completedAt">>) {
  const run = loadRun();
  if (!run) return;
  const records = run.sceneRecords ?? {};
  const prev = records[order];
  records[order] = {
    ...(prev ?? {}),
    ...patch,
    completedAt: prev?.completedAt ?? Date.now(),
  };
  run.sceneRecords = records;
  if (!run.completedSceneOrders.includes(order)) {
    run.completedSceneOrders.push(order);
  }
  saveRun(run);
}

export function clearSceneRecord(order: number) {
  const run = loadRun();
  if (!run) return;
  if (run.sceneRecords) delete run.sceneRecords[order];
  run.completedSceneOrders = run.completedSceneOrders.filter((o) => o !== order);
  saveRun(run);
}
