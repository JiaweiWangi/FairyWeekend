import type { ArchivedChapter } from "./persona-store";

export interface SerialInsights {
  autoTitle: string;
  mainlineSummary: string;
  personaShift: string;
  cityProgress: string;
  monthlyRecap: string;
  chapterTitles: Record<string, string>;
  timelineTags: string[];
}

function top(items: string[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const item of items.map((value) => value.trim()).filter(Boolean)) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .slice(0, limit)
    .map(([value]) => value);
}

function monthKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function buildSerialInsights(sagas: ArchivedChapter[]): SerialInsights {
  const ordered = [...sagas].sort((a, b) => a.createdAt - b.createdAt);
  const completedScenes = ordered.flatMap((chapter) =>
    chapter.journey.scenes.filter((scene) => chapter.completedSceneOrders.includes(scene.order)),
  );
  const identities = ordered.map((chapter) => chapter.card.identity).filter(Boolean);
  const cities = top(ordered.map((chapter) => chapter.city ?? ""), 3);
  const categories = top(completedScenes.map((scene) => scene.location_type), 4);
  const emotions = top(completedScenes.flatMap((scene) => scene.emotion_tags), 5);
  const first = ordered[0];
  const latest = ordered[ordered.length - 1];
  const chapterTitles = Object.fromEntries(
    ordered.map((chapter, index) => {
      const completed = chapter.journey.scenes.filter((scene) =>
        chapter.completedSceneOrders.includes(scene.order),
      );
      const lead = completed[0]?.location_type || chapter.card.mission.slice(0, 8);
      return [chapter.chapterId, `第 ${index + 1} 章 · ${lead}支线里的${chapter.card.identity.slice(0, 8)}`];
    }),
  );
  const monthMap = new Map<string, number>();
  for (const chapter of ordered) {
    const key = monthKey(chapter.createdAt);
    monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
  }
  const monthText = [...monthMap.entries()]
    .map(([month, count]) => `${month} 完成 ${count} 章`)
    .join("；");

  return {
    autoTitle: categories[0]
      ? `${categories[0]}、${emotions[0] || "城市"}和我的连续支线`
      : "我的城市连续支线",
    mainlineSummary:
      ordered.length > 0
        ? `这部连载已经走过 ${ordered.length} 章、${completedScenes.length} 个完成节点，主线集中在${categories.slice(0, 3).join("、") || "待发现品类"}。`
        : "完成第一条路线后，会自动生成你的城市主线。",
    personaShift:
      first && latest
        ? `人设从「${first.card.identity}」延展到「${latest.card.identity}」，情绪线索从「${first.journey.emotion_arc.start}」走向「${latest.journey.emotion_arc.end}」。`
        : "继续完成路线后，会显示人设变化。",
    cityProgress:
      cities.length > 0
        ? `已在 ${cities.join("、")} 留下记录，累计点亮 ${completedScenes.length} 个城市节点。`
        : "还没有形成城市探索进度。",
    monthlyRecap: monthText || "暂无月度复盘",
    chapterTitles,
    timelineTags: top([...categories, ...emotions, ...identities], 8),
  };
}
