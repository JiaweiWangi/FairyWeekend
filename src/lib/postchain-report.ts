import type { ArchivedChapter } from "./persona-store";
import type { JourneyScene, SceneRecord } from "./persona-types";

export type PostchainAuthLevel = "basic" | "personal" | "full";
export type PostchainReportStyle = "moments" | "literary" | "saving" | "niche";

export interface PostchainReportOptions {
  authLevel: PostchainAuthLevel;
  reportStyle: PostchainReportStyle;
}

export interface PostchainCta {
  title: string;
  body: string;
  action: string;
}

export interface PostchainReport {
  title: string;
  identityBadge: string;
  personalityCore: string;
  hiddenDesire: string;
  socialSignature: string;
  bragLine: string;
  rarityPercent: number;
  rarityRankText: string;
  rarityReason: string;
  lifestyleInvestmentScore: number;
  lifestyleInvestmentLabel: string;
  flexLine: string;
  completionRate: number;
  completedPlaces: string[];
  unlockedKeywords: string[];
  storyFragments: string[];
  factSummary: string[];
  dataSignals: string[];
  photoUrls: string[];
  poemType: string;
  poemLines: string[];
  ending: string;
  nextHook: string;
  primaryCta: PostchainCta;
  shareText: string;
}

type CompletedScene = {
  scene: JourneyScene;
  record?: SceneRecord;
};

function completedScenes(chapter: ArchivedChapter): CompletedScene[] {
  return chapter.journey.scenes
    .filter((scene) => chapter.completedSceneOrders.includes(scene.order))
    .map((scene) => ({ scene, record: chapter.sceneRecords?.[scene.order] }));
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function buildKeywords(chapter: ArchivedChapter, completed: CompletedScene[]): string[] {
  return unique(
    [
      chapter.card.rarity,
      ...chapter.card.mood
        .split(/[，、\s]+/)
        .filter(Boolean)
        .slice(0, 2),
      ...completed.flatMap(({ scene, record }) => [
        scene.location_type,
        ...scene.emotion_tags.slice(0, 2),
        record?.mood,
      ]),
    ].filter(Boolean) as string[],
  ).slice(0, 6);
}

function investmentScore(completed: CompletedScene[], base: number): number {
  const noteBonus =
    completed.filter(({ record }) => (record?.note ?? "").trim().length >= 8).length * 3;
  const photoBonus = completed.filter(({ record }) => record?.photo).length * 2;
  const completionBonus = Math.min(completed.length * 2, 8);
  return Math.min(base + noteBonus + photoBonus + completionBonus, 99);
}

function inferInsight(chapter: ArchivedChapter, completed: CompletedScene[], keywords: string[]) {
  const tagText = completed
    .flatMap(({ scene }) => [
      scene.location_type,
      scene.location_name,
      scene.scene_name,
      ...scene.emotion_tags,
    ])
    .join(" ");
  const noteText = completed.map(({ record }) => record?.note ?? "").join(" ");
  const source = `${chapter.card.identity} ${chapter.card.mood} ${chapter.card.mission} ${tagText} ${noteText}`;

  if (/咖啡|低糖|甜|甜品|暂停|治愈|修复/.test(source)) {
    return {
      identityBadge: "高敏甜味自救者",
      personalityCore: "你不是单纯爱吃甜，而是会用一点可控的小确幸，把快要散掉的自己重新收拢起来。",
      hiddenDesire: "你真正想要的不是热闹，是被允许慢下来、被认真照顾一次。",
      socialSignature: "外表像在随便逛逛，内心其实在给自己做一场精密的情绪修复。",
      bragLine: "不是脆弱，是拥有把日常调回甜味频道的高级能力。",
      rarityPercent: 3.7,
      rarityRankText: "每 100 个城市玩家里，大约只有 4 个会把甜、慢和自我修复排在同一条路线上。",
      rarityReason: "你没有选择最高效的路线，而是选择了能照顾情绪颗粒度的路线。",
      lifestyleInvestmentScore: investmentScore(completed, 88),
      lifestyleInvestmentLabel: "情绪修复型消费",
      flexLine: "我的消费不是冲动，是给情绪系统续费。",
    };
  }

  if (/展览|美术馆|博物馆|拍照|影像|记录|慢|证据/.test(source)) {
    return {
      identityBadge: "慢镜头情绪收藏家",
      personalityCore: "你对世界的观察比别人慢半拍，也因此能捕捉到很多人略过的细节。",
      hiddenDesire: "你想被理解的方式不是解释，而是有人看见你没说出口的那部分。",
      socialSignature: "会在普通街角突然停下，因为你发现那里藏着今天的情绪注脚。",
      bragLine: "我的松弛不是摆烂，是对世界保持高分辨率感知。",
      rarityPercent: 5.2,
      rarityRankText: "每 100 个城市玩家里，大约只有 5 个会主动为一次情绪观察安排路线。",
      rarityReason: "你把展览、照片和慢节奏当作自我识别工具，而不是普通打卡素材。",
      lifestyleInvestmentScore: investmentScore(completed, 84),
      lifestyleInvestmentLabel: "审美采样型消费",
      flexLine: "我花钱买的不是门票，是我的精神取景框。",
    };
  }

  if (/餐厅|轻食|花店|鲜花|仪式|体面|被照顾/.test(source)) {
    return {
      identityBadge: "体面感生活策展人",
      personalityCore: "你很会把一个普通下午整理成值得纪念的版本。",
      hiddenDesire: "你想要一种不用解释的偏爱，最好落在座位、花、晚餐和一句刚好的话里。",
      socialSignature: "能把临时起意过成精心安排，也能把疲惫包装成漂亮的出场。",
      bragLine: "我不是麻烦，我只是对生活质感有最低审美要求。",
      rarityPercent: 4.4,
      rarityRankText: "每 100 个城市玩家里，大约只有 4 个会把体面感和自我照顾绑定得这么稳定。",
      rarityReason: "你会为座位、花、晚餐和恰好发生的仪式感付费。",
      lifestyleInvestmentScore: investmentScore(completed, 91),
      lifestyleInvestmentLabel: "体面感维护型消费",
      flexLine: "我不是在花钱，我是在维护自己的生活质感。",
    };
  }

  return {
    identityBadge: `${chapter.card.identity.slice(0, 8)}型城市玩家`,
    personalityCore: "你擅长把生活里的随机事件变成自己的叙事素材。",
    hiddenDesire: "你想从日常里短暂出逃，但也想带着一个更清楚的自己回来。",
    socialSignature: `你的关键词是：${keywords.slice(0, 3).join("、")}。`,
    bragLine: "我不是在打卡，我是在和城市互相确认身份。",
    rarityPercent: 6.8,
    rarityRankText: "每 100 个城市玩家里，大约只有 7 个会把路线走成自己的身份叙事。",
    rarityReason: "你不是完成行程，而是在用地点重新命名今天的自己。",
    lifestyleInvestmentScore: investmentScore(completed, 80),
    lifestyleInvestmentLabel: "身份叙事型消费",
    flexLine: "我花出去的是预算，收回来的是一个更清楚的自己。",
  };
}

function buildFactSummary(
  chapter: ArchivedChapter,
  completed: CompletedScene[],
  options: PostchainReportOptions,
): string[] {
  const facts = [
    `路线城市：${chapter.city || "未知城市"}`,
    `完成点位：${completed.length}/${chapter.journey.scenes.length}`,
    `已完成地点：${completed.map(({ scene }) => scene.location_name).join("、") || "暂无"}`,
  ];
  if (options.authLevel !== "basic") {
    facts.push(
      `消费品类：${unique(completed.map(({ scene }) => scene.location_type)).join("、") || "暂无"}`,
    );
    facts.push(
      `记录增强：${completed.filter(({ record }) => record?.note || record?.photo).length} 个场景`,
    );
  }
  if (options.authLevel === "full") {
    facts.push(`照片素材：${completed.filter(({ record }) => record?.photo).length} 张`);
    facts.push(
      `情绪标签：${
        unique(completed.flatMap(({ scene }) => scene.emotion_tags))
          .slice(0, 5)
          .join("、") || "暂无"
      }`,
    );
  }
  return facts;
}

function buildDataSignals(chapter: ArchivedChapter, completed: CompletedScene[]): string[] {
  const enhanced = completed.filter(({ record }) => record?.note || record?.photo).length;
  const topTypes = unique(completed.map(({ scene }) => scene.location_type)).slice(0, 4);
  return [
    `完成 ${completed.length}/${chapter.journey.scenes.length} 个剧情节点`,
    `上传照片 ${completed.filter(({ record }) => record?.photo).length} 张`,
    `留下随笔 ${completed.filter(({ record }) => record?.note).length} 条`,
    `增强记录 ${enhanced} 个场景`,
    topTypes.length ? `路线品类：${topTypes.join(" / ")}` : "路线品类：等待点亮",
    `情绪弧线：${chapter.journey.emotion_arc.start} → ${chapter.journey.emotion_arc.end}`,
  ];
}

function buildPoem(
  chapter: ArchivedChapter,
  completed: CompletedScene[],
  identityBadge: string,
  style: PostchainReportStyle,
): [string, string[]] {
  const categories = completed.map(({ scene }) => scene.location_type);
  const first = categories[0] || "城市";
  const second = categories[1] || "晚风";
  if (style === "saving") {
    return [
      "打油诗",
      [`${first}之后${second}忙，`, "团券订位都挺香。", "本想随便过下午，", "省心又像样。"],
    ];
  }
  if (style === "literary" || style === "niche") {
    return [
      "三行诗",
      [
        `你把下午交给${first}和${second}，`,
        `${chapter.city || "这座城市"}替你留下慢下来的证据，`,
        `风经过时，悄悄叫出「${identityBadge}」。`,
      ],
    ];
  }
  return [
    "三句半",
    ["出门前说随便逛，", `${first}${second}都安排，`, "订位票券也妥当，", "真省心。"],
  ];
}

function buildCta(completionRate: number, style: PostchainReportStyle): PostchainCta {
  if (completionRate < 1) {
    return {
      title: "补完未解锁点位",
      body: "本次路线还有点位未完成，下次可以继续点亮这条城市剧情。",
      action: "继续点亮",
    };
  }
  if (style === "saving") {
    return {
      title: "领取同款券包",
      body: "基于本次路线偏好，生成同商圈高性价比券包。",
      action: "领取券包",
    };
  }
  return {
    title: "复刻这条路线",
    body: "将本次路线打包成可分享链接，朋友可一键复刻。",
    action: "生成复刻链接",
  };
}

export function buildPostchainReport(
  chapter: ArchivedChapter,
  options: PostchainReportOptions,
): PostchainReport {
  const completed = completedScenes(chapter);
  const completionRate = completed.length / Math.max(chapter.journey.scenes.length, 1);
  const unlockedKeywords = buildKeywords(chapter, completed);
  const insight = inferInsight(chapter, completed, unlockedKeywords);
  const [poemType, poemLines] = buildPoem(
    chapter,
    completed,
    insight.identityBadge,
    options.reportStyle,
  );
  const completedPlaces = completed.map(({ scene }) => scene.location_name);
  const photoUrls = completed.map(({ record }) => record?.photo).filter(Boolean) as string[];
  const storyFragments = completed.map(({ scene, record }) =>
    record?.note
      ? `${scene.scene_name} ${scene.location_name}：${record.note}`
      : `${scene.scene_name} ${scene.location_name}：你完成了「${scene.action_task}」`,
  );
  const primaryCta = buildCta(completionRate, options.reportStyle);
  const ending =
    completionRate >= 1
      ? "你把这个下午从日常里偷了回来，并把它写成了自己的隐藏结局。"
      : completionRate >= 0.5
        ? "你没有走完整条路线，但已经从城市手里拿回了一枚属于今天的线索。"
        : "故事刚刚亮起一角，城市还把后半段留给下一次见面。";

  return {
    title: `${insight.identityBadge}的今日结局`,
    ...insight,
    completionRate,
    completedPlaces,
    unlockedKeywords,
    storyFragments,
    factSummary: buildFactSummary(chapter, completed, options),
    dataSignals: buildDataSignals(chapter, completed),
    photoUrls: photoUrls.slice(0, 4),
    poemType,
    poemLines,
    ending,
    nextHook: /甜|甜品/.test(chapter.card.identity + chapter.card.mission)
      ? "你似乎还欠这座城市一次夜晚甜品支线。"
      : "你似乎还欠这座城市一次夜晚散步。",
    primaryCta,
    shareText: `我今天测出来的城市人格是「${insight.identityBadge}」。据说只占城市玩家 ${insight.rarityPercent}%。${insight.flexLine} 完成度 ${Math.round(completionRate * 100)}%，关键词：${unlockedKeywords.slice(0, 4).join("、")}。`,
  };
}
