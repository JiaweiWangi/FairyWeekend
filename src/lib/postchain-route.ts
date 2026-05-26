import type { ArchivedChapter } from "./persona-store";
import type { DmMemorySnapshot } from "./city-preference";
import type { Journey, JourneyScene } from "./persona-types";

export type RouteCheckLevel = "pass" | "review" | "blocked";

export interface RouteRevalidationCheck {
  key: string;
  label: string;
  level: RouteCheckLevel;
  detail: string;
}

export interface RouteRevalidationResult {
  canReplay: boolean;
  summary: string;
  checks: RouteRevalidationCheck[];
}

export interface AdaptationNodeReason {
  order: number;
  originalOrder: number;
  sceneName: string;
  locationType: string;
  matchedLovedTags: string[];
  matchedDislikedTags: string[];
  score: number;
  change: "promoted" | "kept" | "deprioritized";
  reason: string;
}

export interface AdaptedJourneyResult {
  journey: Journey;
  reason: string;
  evidence: {
    lovedTags: string[];
    dislikedTags: string[];
    matchedTags: string[];
    promoted: AdaptationNodeReason[];
    cautioned: AdaptationNodeReason[];
    nodes: AdaptationNodeReason[];
  };
}

function hasUsefulLocation(scene: JourneyScene): boolean {
  return Boolean(scene.location_name?.trim() && scene.location_hint?.trim());
}

function looksLikeSpecificPlace(name: string): boolean {
  return !/待定|未知|附近|某|任意|推荐/.test(name);
}

function countMatches(scene: JourneyScene, tags: string[]): number {
  const source = [
    scene.location_type,
    scene.scene_name,
    scene.action_task,
    scene.meituan_keyword,
    ...scene.emotion_tags,
  ].join(" ");
  return tags.filter((tag) => tag && source.includes(tag)).length;
}

function matchedTags(scene: JourneyScene, tags: string[]): string[] {
  const source = [
    scene.location_type,
    scene.scene_name,
    scene.action_task,
    scene.meituan_keyword,
    ...scene.emotion_tags,
  ].join(" ");
  return tags.filter((tag) => tag && source.includes(tag));
}

export function revalidateRouteForReplay(chapter: ArchivedChapter): RouteRevalidationResult {
  const scenes = chapter.journey.scenes;
  const checks: RouteRevalidationCheck[] = [];
  const missingLocations = scenes.filter((scene) => !hasUsefulLocation(scene));
  const genericLocations = scenes.filter((scene) => !looksLikeSpecificPlace(scene.location_name));
  const missingKeywords = scenes.filter((scene) => !scene.meituan_keyword?.trim());
  const totalStay = scenes.reduce((sum, scene) => sum + Math.max(scene.stay_minutes || 0, 0), 0);

  checks.push({
    key: "merchant",
    label: "商户/地点可识别",
    level: missingLocations.length || genericLocations.length ? "review" : "pass",
    detail:
      missingLocations.length || genericLocations.length
        ? `${missingLocations.length + genericLocations.length} 个节点缺少明确地点信息，复刻前建议确认。`
        : "所有节点都有明确地点名称和地址线索。",
  });
  checks.push({
    key: "opening-hours",
    label: "营业状态",
    level: "review",
    detail: "当前归档未保存实时营业时间，进入路线前需要在地图/商户页二次确认。",
  });
  checks.push({
    key: "coupon",
    label: "优惠有效性",
    level: "review",
    detail: "当前尚未接入券包/订单数据，优惠状态不会作为复刻依据。",
  });
  checks.push({
    key: "distance",
    label: "距离与节奏",
    level: totalStay > 0 && totalStay <= 300 ? "pass" : "review",
    detail:
      totalStay > 0
        ? `原路线预计停留约 ${totalStay} 分钟；未接入当前位置，实际通勤时间需出发前确认。`
        : "缺少停留时长，建议进入路线后逐节点确认节奏。",
  });
  checks.push({
    key: "search-keyword",
    label: "复查入口",
    level: missingKeywords.length ? "review" : "pass",
    detail: missingKeywords.length
      ? `${missingKeywords.length} 个节点缺少搜索关键词。`
      : "所有节点都保留了商户搜索关键词。",
  });

  const blocked = checks.some((check) => check.level === "blocked");
  const review = checks.some((check) => check.level === "review");
  return {
    canReplay: !blocked,
    summary: blocked
      ? "这条路线缺少关键地点信息，暂不建议直接复刻。"
      : review
        ? "这条路线可以复刻，但需要在出发前确认营业、优惠和距离。"
        : "这条路线具备直接复刻所需的基础信息。",
    checks,
  };
}

export function buildAdaptedJourneyFromArchive(
  chapter: ArchivedChapter,
  memory: DmMemorySnapshot | null,
): AdaptedJourneyResult {
  const loved = memory?.loved_tags?.filter(Boolean) ?? [];
  const disliked = memory?.disliked_tags?.filter(Boolean) ?? [];
  const scored = chapter.journey.scenes.map((scene, index) => ({
    scene,
    index,
    lovedMatches: matchedTags(scene, loved),
    dislikedMatches: matchedTags(scene, disliked),
    score: countMatches(scene, loved) * 2 - countMatches(scene, disliked),
  }));
  const sorted = [...scored].sort((a, b) => b.score - a.score || a.index - b.index);
  const nodeReasons: AdaptationNodeReason[] = sorted.map((item, index) => {
    const change =
      index < item.index ? "promoted" : index > item.index ? "deprioritized" : "kept";
    const reason =
      item.lovedMatches.length > 0
        ? `命中你的偏好：${item.lovedMatches.join("、")}`
        : item.dislikedMatches.length > 0
          ? `包含你可能不喜欢的标签：${item.dislikedMatches.join("、")}，建议轻量体验`
          : "未命中特定偏好，保留原路线气质";
    return {
      order: index + 1,
      originalOrder: item.index + 1,
      sceneName: item.scene.scene_name,
      locationType: item.scene.location_type,
      matchedLovedTags: item.lovedMatches,
      matchedDislikedTags: item.dislikedMatches,
      score: item.score,
      change,
      reason,
    };
  });
  const scenes = sorted.map(({ scene, lovedMatches, dislikedMatches }, index) => ({
      ...scene,
      order: index + 1,
      scene_name: index === 0 ? `${scene.scene_name} · 我的优先支线` : scene.scene_name,
      persona_narrative: lovedMatches.length
        ? `${scene.persona_narrative} 这一步被前置，是因为它命中你的「${lovedMatches.slice(0, 2).join("、")}」偏好。`
        : `${scene.persona_narrative} 这一步保留原路线气质，作为适合你的轻量复刻版本。`,
      action_task: dislikedMatches.length > 0
        ? `${scene.action_task}；如果现场氛围不合适，可以缩短停留。`
        : scene.action_task,
    }));
  const matched = [...new Set(nodeReasons.flatMap((node) => node.matchedLovedTags))];
  const reason = loved.length
    ? matched.length
      ? `已优先前置命中「${matched.slice(0, 3).join("、")}」的节点，地点仍来自原分享路线。`
      : `已读取你的「${loved.slice(0, 3).join("、")}」偏好，但原路线命中较少，因此只做轻量顺序整理。`
    : "已基于原分享路线生成轻量复刻版本，未新增任何地点。";

  return {
    journey: {
      ...chapter.journey,
      story_opening: `${chapter.journey.story_opening}\n\n这是根据你的偏好调整后的复刻版本，地点沿用原路线。`,
      scenes,
      closing: `${chapter.journey.closing}\n\n这一次，你走的是更贴近自己节奏的版本。`,
    },
    reason,
    evidence: {
      lovedTags: loved,
      dislikedTags: disliked,
      matchedTags: matched,
      promoted: nodeReasons.filter((node) => node.change === "promoted").slice(0, 3),
      cautioned: nodeReasons.filter((node) => node.matchedDislikedTags.length > 0).slice(0, 3),
      nodes: nodeReasons,
    },
  };
}
