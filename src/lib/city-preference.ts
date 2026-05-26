import type { ArchivedChapter } from "./persona-store";

export interface DmMemorySnapshot {
  profile: string;
  loved_tags: string[] | null;
  disliked_tags: string[] | null;
  visited_pois: string[] | null;
  total_runs: number;
}

export interface CityPreferenceProfile {
  persona: string;
  topCities: string[];
  topDistricts: string[];
  topCategories: string[];
  pace: string;
  emotionTags: string[];
  keywords: string[];
  categoryReasons: string[];
  districtReasons: string[];
  paceReason: string;
  trendSummary: string;
  nextRouteBrief: string;
  recommendationProof: string[];
  nextRecommendationReason: string;
  memorySource: "cloud" | "local" | "mixed";
}

function top(items: Array<string | undefined | null>, limit: number): string[] {
  const counts = new Map<string, number>();
  for (const item of items.map((value) => value?.trim()).filter(Boolean) as string[]) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .slice(0, limit)
    .map(([value]) => value);
}

function splitRecent<T>(items: T[]): [T[], T[]] {
  const midpoint = Math.max(Math.ceil(items.length / 2), 1);
  return [items.slice(0, midpoint), items.slice(midpoint)];
}

function describeShift(recent: string[], older: string[], label: string): string {
  const fresh = recent.find((item) => !older.includes(item));
  if (fresh) return `${label}正在向「${fresh}」倾斜`;
  if (recent[0]) return `${label}保持在「${recent[0]}」附近`;
  return `${label}还在等待更多记录`;
}

export function buildCityPreferenceProfile(
  sagas: ArchivedChapter[],
  memory: DmMemorySnapshot | null,
): CityPreferenceProfile {
  const completedScenes = sagas.flatMap((chapter) =>
    chapter.journey.scenes
      .filter((scene) => chapter.completedSceneOrders.includes(scene.order))
      .map((scene) => ({ chapter, scene })),
  );
  const topCities = top(sagas.map((chapter) => chapter.city), 3);
  const topCategories = top(completedScenes.map(({ scene }) => scene.location_type), 5);
  const emotionTags = top(completedScenes.flatMap(({ scene }) => scene.emotion_tags), 6);
  const topDistricts = top(
    completedScenes.map(({ scene }) => scene.location_hint.split(/[·,，\s]/).filter(Boolean)[0]),
    4,
  );
  const avgStay =
    completedScenes.reduce((sum, { scene }) => sum + (scene.stay_minutes || 0), 0) /
    Math.max(completedScenes.length, 1);
  const pace = avgStay >= 45 ? "慢节奏深停留" : avgStay >= 25 ? "中等节奏漫游" : "轻量快速探索";
  const loved = memory?.loved_tags?.filter(Boolean) ?? [];
  const disliked = memory?.disliked_tags?.filter(Boolean) ?? [];
  const keywords = top([...loved, ...topCategories, ...emotionTags], 8);
  const [recentChapters, olderChapters] = splitRecent(sagas);
  const recentScenes = recentChapters.flatMap((chapter) =>
    chapter.journey.scenes.filter((scene) => chapter.completedSceneOrders.includes(scene.order)),
  );
  const olderScenes = olderChapters.flatMap((chapter) =>
    chapter.journey.scenes.filter((scene) => chapter.completedSceneOrders.includes(scene.order)),
  );
  const recentCategories = top(recentScenes.map((scene) => scene.location_type), 3);
  const olderCategories = top(olderScenes.map((scene) => scene.location_type), 3);
  const recentEmotions = top(recentScenes.flatMap((scene) => scene.emotion_tags), 3);
  const olderEmotions = top(olderScenes.flatMap((scene) => scene.emotion_tags), 3);
  const categoryReasons = topCategories.map((category) => {
    const count = completedScenes.filter(({ scene }) => scene.location_type === category).length;
    return `${category}：已完成 ${count} 次，是当前路线内容里的高频选择。`;
  });
  const districtReasons = topDistricts.map((district) => {
    const count = completedScenes.filter(({ scene }) => scene.location_hint.includes(district)).length;
    return `${district}：出现 ${count} 次，适合作为下一条路线的默认活动半径。`;
  });
  const paceReason =
    completedScenes.length > 0
      ? `平均单点停留约 ${Math.round(avgStay)} 分钟，因此判断为「${pace}」。`
      : "还没有足够的完成节点判断路线节奏。";
  const trendSummary = [
    describeShift(recentCategories, olderCategories, "品类"),
    describeShift(recentEmotions, olderEmotions, "情绪"),
  ].join("；");
  const persona =
    memory?.profile ||
    (keywords.length
      ? `偏好${keywords.slice(0, 3).join("、")}的城市漫游者`
      : "等待更多路线记录的城市玩家");
  const nextRecommendationReason = keywords.length
    ? `基于你常选择的${keywords.slice(0, 3).join("、")}，下一条路线适合推荐${pace}、低负担且可继续沉淀记录的城市路线。`
    : "完成更多路线后，系统会基于城市、品类、节奏和情绪标签生成下一条推荐理由。";
  const nextRouteBrief = keywords.length
    ? `${topCities[0] || "当前城市"} · ${keywords.slice(0, 2).join(" + ")} · ${pace}`
    : "完成更多路线后生成下一条路线 brief";
  const recommendationProof = [
    topCategories[0] ? `高频品类：${topCategories.slice(0, 3).join("、")}` : "",
    emotionTags[0] ? `常见情绪：${emotionTags.slice(0, 3).join("、")}` : "",
    topDistricts[0] ? `活动半径：${topDistricts.slice(0, 2).join("、")}` : "",
    disliked[0] ? `避开倾向：${disliked.slice(0, 3).join("、")}` : "",
  ].filter(Boolean);

  return {
    persona,
    topCities,
    topDistricts,
    topCategories,
    pace,
    emotionTags,
    keywords,
    categoryReasons,
    districtReasons,
    paceReason,
    trendSummary,
    nextRouteBrief,
    recommendationProof,
    nextRecommendationReason,
    memorySource: memory && sagas.length > 0 ? "mixed" : memory ? "cloud" : "local",
  };
}
