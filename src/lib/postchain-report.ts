import type { ArchivedChapter } from "./persona-store";
import type { JourneyScene, SceneRecord } from "./persona-types";

export type PostchainAuthLevel = "basic" | "personal" | "full";
export type PostchainReportStyle = "moments" | "literary" | "saving" | "niche";
export type PostchainContentFormat = "self_expression" | "route_spread";

export interface PostchainPrivacySettings {
  showMerchantNames: boolean;
  showVisitTime: boolean;
  showLocation: boolean;
  showPhotos: boolean;
  showAmount: boolean;
  showDiscount: boolean;
}

export interface PostchainReportOptions {
  authLevel: PostchainAuthLevel;
  reportStyle: PostchainReportStyle;
  privacy?: PostchainPrivacySettings;
}

export interface PostchainCta {
  title: string;
  body: string;
  action: string;
}

export interface PostchainNodeSummary {
  order: number;
  sceneName: string;
  displayName: string;
  locationType: string;
}

export interface PostchainFactCheck {
  ok: boolean;
  warnings: string[];
  allowedPlaces: string[];
  allowedCompletedOrders: number[];
}

export interface PostchainContentVariant {
  format: PostchainContentFormat;
  title: string;
  body: string;
  sections: Array<{
    title: string;
    text: string;
  }>;
  bullets: string[];
  hashtags: string[];
  riskWarnings: string[];
}

export interface PostchainTextRisk {
  level: "warning" | "blocked";
  label: string;
  detail: string;
}

export interface PostchainReport {
  title: string;
  routeTheme: string;
  routeSummary: string;
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
  completionPercent: number;
  completionText: string;
  completedNodes: PostchainNodeSummary[];
  incompleteNodes: PostchainNodeSummary[];
  completedPlaces: string[];
  incompletePlaces: string[];
  routeKeywords: string[];
  behaviorTraits: string[];
  initialPersona: string;
  recommendedNextActions: PostchainCta[];
  factCheck: PostchainFactCheck;
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
  contentVariants: PostchainContentVariant[];
}

type CompletedScene = {
  scene: JourneyScene;
  record?: SceneRecord;
};

type SceneSummaryOptions = {
  privacy: PostchainPrivacySettings;
};

function completedScenes(chapter: ArchivedChapter): CompletedScene[] {
  return chapter.journey.scenes
    .filter((scene) => chapter.completedSceneOrders.includes(scene.order))
    .map((scene) => ({ scene, record: chapter.sceneRecords?.[scene.order] }));
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function sceneDisplayName(scene: JourneyScene, privacy: PostchainPrivacySettings): string {
  return privacy.showMerchantNames ? scene.location_name : scene.scene_name;
}

function sceneSummary(
  scene: JourneyScene,
  options: SceneSummaryOptions,
): PostchainNodeSummary {
  return {
    order: scene.order,
    sceneName: scene.scene_name,
    displayName: sceneDisplayName(scene, options.privacy),
    locationType: scene.location_type,
  };
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

function buildRouteKeywords(
  chapter: ArchivedChapter,
  completed: CompletedScene[],
  privacy: PostchainPrivacySettings,
): string[] {
  return unique(
    [
      privacy.showLocation ? chapter.city : undefined,
      chapter.card.rarity,
      ...chapter.card.mood.split(/[，、\s]+/),
      ...chapter.card.mission.split(/[，、\s]+/),
      ...completed.flatMap(({ scene }) => [
        scene.location_type,
        ...scene.emotion_tags,
        scene.meituan_keyword,
      ]),
    ]
      .map((item) => item?.trim())
      .filter(Boolean) as string[],
  ).slice(0, 10);
}

function buildBehaviorTraits(
  completed: CompletedScene[],
  incomplete: JourneyScene[],
  completionRate: number,
): string[] {
  const traits: string[] = [];
  const typeCount = unique(completed.map(({ scene }) => scene.location_type)).length;
  const noteCount = completed.filter(({ record }) => record?.note).length;
  const photoCount = completed.filter(({ record }) => record?.photo).length;
  const avgStay =
    completed.reduce((sum, { scene }) => sum + (scene.stay_minutes || 0), 0) /
    Math.max(completed.length, 1);

  if (completionRate >= 1) traits.push("完整完成路线");
  else if (completionRate >= 0.5) traits.push("完成核心节点");
  else traits.push("轻量体验路线");
  if (typeCount >= 3) traits.push("跨品类探索");
  if (avgStay >= 45) traits.push("慢节奏停留");
  if (noteCount > 0) traits.push("主动记录体验");
  if (photoCount > 0) traits.push("有照片素材");
  if (incomplete.length > 0) traits.push("存在可补完节点");

  return traits.slice(0, 6);
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
    const hasSweetCue = /低糖|甜|甜品/.test(source);
    return {
      identityBadge: hasSweetCue ? "高敏甜味自救者" : "低压状态修复者",
      personalityCore: hasSweetCue
        ? "你不是单纯爱吃甜，而是会用一点可控的小确幸，把快要散掉的自己重新收拢起来。"
        : "你选择的不是强刺激路线，而是一组低压、可控、能慢慢把状态调回来的城市节点。",
      hiddenDesire: "你真正想要的不是热闹，是被允许慢下来、被认真照顾一次。",
      socialSignature: hasSweetCue
        ? "外表像在随便逛逛，内心其实在给自己做一场温和的情绪修复。"
        : "外表像在随便逛逛，内心其实是在给自己找一个不用硬撑的缓冲区。",
      bragLine: hasSweetCue
        ? "不是脆弱，是拥有把日常调回甜味频道的高级能力。"
        : "不是偷懒，是知道怎么把日常调回舒服一点的频道。",
      rarityPercent: 3.7,
      rarityRankText: hasSweetCue
        ? "每 100 个城市玩家里，大约只有 4 个会把甜、慢和自我修复排在同一条路线上。"
        : "每 100 个城市玩家里，大约只有 4 个会主动选择低压、慢停留和状态恢复放在同一条路线上。",
      rarityReason: "你没有选择最高效的路线，而是选择了能照顾情绪颗粒度的路线。",
      lifestyleInvestmentScore: investmentScore(completed, 88),
      lifestyleInvestmentLabel: hasSweetCue ? "情绪修复型消费" : "低压补氧型消费",
      flexLine: hasSweetCue
        ? "我的消费不是冲动，是给情绪系统续费。"
        : "我不是随便逛逛，我是在给自己留一点恢复空间。",
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
  incomplete: JourneyScene[],
  options: PostchainReportOptions,
): string[] {
  const privacy = resolvePrivacy(options.privacy);
  const placeLabel = privacy.showMerchantNames ? "已完成地点" : "已完成节点";
  const completedNames = completed
    .map(({ scene }) => sceneDisplayName(scene, privacy))
    .join("、");
  const incompleteNames = incomplete.map((scene) => scene.scene_name).join("、");
  const facts = [
    privacy.showLocation ? `路线城市：${chapter.city || "未知城市"}` : "路线城市：已隐藏",
    `完成点位：${completed.length}/${chapter.journey.scenes.length}`,
    `路线完成度：${Math.round((completed.length / Math.max(chapter.journey.scenes.length, 1)) * 100)}%`,
    `${placeLabel}：${completedNames || "暂无"}`,
    `未完成节点：${incompleteNames || "无"}`,
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
    if (privacy.showPhotos) {
      facts.push(`照片素材：${completed.filter(({ record }) => record?.photo).length} 张`);
    }
    if (privacy.showVisitTime) {
      const latest = completed
        .map(({ record }) => record?.completedAt)
        .filter(Boolean)
        .sort((a, b) => Number(b) - Number(a))[0];
      facts.push(
        latest
          ? `最近打卡：${new Date(latest).toLocaleString("zh-CN", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "最近打卡：暂无",
      );
    }
    facts.push(privacy.showAmount ? "消费金额：等待订单数据接入" : "消费金额：已隐藏");
    facts.push(privacy.showDiscount ? "优惠使用：等待券包数据接入" : "优惠使用：已隐藏");
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

function buildDataSignals(
  chapter: ArchivedChapter,
  completed: CompletedScene[],
  authLevel: PostchainAuthLevel,
  privacy: PostchainPrivacySettings,
): string[] {
  const canUsePersonalRecords = authLevel !== "basic";
  const enhanced = completed.filter(({ record }) => record?.note || record?.photo).length;
  const topTypes = unique(completed.map(({ scene }) => scene.location_type)).slice(0, 4);
  const signals = [
    `完成 ${completed.length}/${chapter.journey.scenes.length} 个剧情节点`,
    canUsePersonalRecords && privacy.showPhotos
      ? `上传照片 ${completed.filter(({ record }) => record?.photo).length} 张`
      : "照片素材：未授权使用",
    canUsePersonalRecords
      ? `留下随笔 ${completed.filter(({ record }) => record?.note).length} 条`
      : "随笔记录：未授权使用",
    canUsePersonalRecords ? `增强记录 ${enhanced} 个场景` : "增强记录：未授权使用",
    topTypes.length ? `路线品类：${topTypes.join(" / ")}` : "路线品类：等待点亮",
    `情绪弧线：${chapter.journey.emotion_arc.start} → ${chapter.journey.emotion_arc.end}`,
  ];
  if (!privacy.showMerchantNames) signals.push("商户名称：分享时隐藏");
  if (!privacy.showVisitTime) signals.push("具体时间：分享时隐藏");
  return signals;
}

function buildPoem(
  chapter: ArchivedChapter,
  completed: CompletedScene[],
  identityBadge: string,
  style: PostchainReportStyle,
  privacy: PostchainPrivacySettings,
): [string, string[]] {
  const categories = completed.map(({ scene }) => scene.location_type);
  const first = categories[0] || "城市";
  const second = categories[1] || "晚风";
  const cityLabel = privacy.showLocation ? chapter.city || "这座城市" : "这座城市";
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
        `${cityLabel}替你留下慢下来的证据，`,
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

function buildRecommendedNextActions(
  completionRate: number,
  style: PostchainReportStyle,
  incomplete: JourneyScene[],
  routeKeywords: string[],
): PostchainCta[] {
  const actions: PostchainCta[] = [];

  if (incomplete.length > 0) {
    actions.push({
      title: "补完未完成点位",
      body: `还有 ${incomplete.length} 个节点没有点亮，可以从「${incomplete[0].scene_name}」继续这条路线。`,
      action: "继续点亮",
    });
  }

  actions.push({
    title: "生成下一条相似路线",
    body: `基于 ${routeKeywords.slice(0, 3).join("、") || "本次路线"} 继续推荐同气质路线。`,
    action: "生成相似路线",
  });

  if (completionRate >= 1) {
    actions.push({
      title: "复刻这条路线",
      body: "将本次路线整理成可分享版本，朋友可一键复刻或生成适合自己的版本。",
      action: "生成复刻链接",
    });
  }

  if (style === "saving") {
    actions.push({
      title: "领取同款券包",
      body: "后续可接入券包数据，为同商圈路线承接优惠转化。",
      action: "查看券包",
    });
  }

  return actions.slice(0, 4);
}

function validatePostchainReportFacts(
  chapter: ArchivedChapter,
  completed: CompletedScene[],
  privacy: PostchainPrivacySettings,
  report: Pick<
    PostchainReport,
    | "completedNodes"
    | "incompleteNodes"
    | "completedPlaces"
    | "incompletePlaces"
    | "completionPercent"
    | "storyFragments"
  >,
): PostchainFactCheck {
  const warnings: string[] = [];
  const allSceneNames = new Set(chapter.journey.scenes.map((scene) => scene.scene_name));
  const allPlaceNames = new Set(chapter.journey.scenes.map((scene) => scene.location_name));
  const allTypes = new Set(chapter.journey.scenes.map((scene) => scene.location_type));
  const completedOrders = new Set(chapter.completedSceneOrders);
  const realCompletionPercent = Math.round(
    (completed.length / Math.max(chapter.journey.scenes.length, 1)) * 100,
  );

  for (const node of report.completedNodes) {
    if (!completedOrders.has(node.order)) warnings.push(`完成节点未被真实点亮：${node.displayName}`);
    if (!allSceneNames.has(node.sceneName)) warnings.push(`完成节点不在路线中：${node.sceneName}`);
  }
  for (const node of report.incompleteNodes) {
    if (completedOrders.has(node.order)) warnings.push(`未完成节点实际已点亮：${node.displayName}`);
    if (!allSceneNames.has(node.sceneName)) warnings.push(`未完成节点不在路线中：${node.sceneName}`);
  }
  for (const name of [...report.completedPlaces, ...report.incompletePlaces]) {
    if (!allSceneNames.has(name) && !allPlaceNames.has(name) && !allTypes.has(name)) {
      warnings.push(`报告出现路线外地点：${name}`);
    }
  }
  if (report.completionPercent !== realCompletionPercent) {
    warnings.push(`完成度不一致：${report.completionPercent}% / ${realCompletionPercent}%`);
  }
  if (report.storyFragments.some((item) => /¥|￥|\d+\s*元/.test(item))) {
    warnings.push("故事片段出现未接入订单金额");
  }
  if (!privacy.showLocation && chapter.city) {
    if (report.storyFragments.some((item) => item.includes(chapter.city || ""))) {
      warnings.push("故事片段包含已隐藏的城市/地点信息");
    }
  }
  if (!privacy.showMerchantNames) {
    const leakedMerchant = chapter.journey.scenes.find((scene) =>
      report.storyFragments.some((item) => item.includes(scene.location_name)),
    );
    if (leakedMerchant) warnings.push(`故事片段包含已隐藏商户名：${leakedMerchant.location_name}`);
  }

  return {
    ok: warnings.length === 0,
    warnings,
    allowedPlaces: [...allPlaceNames],
    allowedCompletedOrders: [...completedOrders],
  };
}

export function validatePostchainEditedReport(
  chapter: ArchivedChapter,
  privacy: PostchainPrivacySettings,
  report: Pick<
    PostchainReport,
    | "completedNodes"
    | "incompleteNodes"
    | "completedPlaces"
    | "incompletePlaces"
    | "completionPercent"
    | "storyFragments"
  >,
): PostchainFactCheck {
  return validatePostchainReportFacts(chapter, completedScenes(chapter), privacy, report);
}

export function validatePostchainShareText(
  chapter: ArchivedChapter,
  privacy: PostchainPrivacySettings,
  text: string,
): string[] {
  const warnings: string[] = [];
  if (/¥|￥|\d+\s*元/.test(text)) {
    warnings.push("分享文案出现订单金额，但当前未接入订单金额事实。");
  }
  if (!privacy.showLocation && chapter.city && text.includes(chapter.city)) {
    warnings.push("分享文案包含已隐藏的城市/地点信息。");
  }
  if (!privacy.showMerchantNames) {
    const leakedMerchant = chapter.journey.scenes.find(
      (scene) => scene.location_name && text.includes(scene.location_name),
    );
    if (leakedMerchant) warnings.push(`分享文案包含已隐藏商户名：${leakedMerchant.location_name}`);
  }
  return warnings;
}

export function analyzePostchainTextRisks(
  chapter: ArchivedChapter,
  privacy: PostchainPrivacySettings,
  text: string,
): PostchainTextRisk[] {
  const risks: PostchainTextRisk[] = [];
  const amountMatch = text.match(/¥|￥|\d+\s*元/);
  if (amountMatch) {
    risks.push({
      level: "blocked",
      label: "金额事实风险",
      detail: "当前未接入真实订单金额，文案里不能出现具体消费金额。",
    });
  }
  if (!privacy.showLocation && chapter.city && text.includes(chapter.city)) {
    risks.push({
      level: "blocked",
      label: "地点隐私风险",
      detail: `你已关闭地点展示，但文案里出现了「${chapter.city}」。`,
    });
  }
  if (!privacy.showMerchantNames) {
    const leakedMerchant = chapter.journey.scenes.find(
      (scene) => scene.location_name && text.includes(scene.location_name),
    );
    if (leakedMerchant) {
      risks.push({
        level: "blocked",
        label: "商户隐私风险",
        detail: `你已关闭商户名展示，但文案里出现了「${leakedMerchant.location_name}」。`,
      });
    }
  }
  const knownNames = new Set(
    chapter.journey.scenes.flatMap((scene) => [
      scene.scene_name,
      scene.location_name,
      scene.location_type,
      scene.meituan_keyword,
    ]),
  );
  const suspiciousPlace = text
    .match(/[\u4e00-\u9fa5A-Za-z0-9]{2,16}(咖啡|餐厅|美术馆|博物馆|花店|书店|公园|酒馆|甜品|影院|商场|市集|面馆|茶馆)/g)
    ?.find((name) => ![...knownNames].some((known) => known && name.includes(known)));
  if (suspiciousPlace) {
    risks.push({
      level: "warning",
      label: "路线外地点风险",
      detail: `文案里可能出现了路线外地点「${suspiciousPlace}」，发布前请确认。`,
    });
  }
  if (/已购买|已核销|已支付|下单|实付|省了|优惠券已用/.test(text)) {
    risks.push({
      level: "blocked",
      label: "订单/核销事实风险",
      detail: "当前未接入订单、核销或券包事实，不能描述已支付、已核销或已使用优惠。",
    });
  }
  return risks;
}

function nodeRole(node: PostchainNodeSummary, index: number, total: number): string {
  if (index === 0) return "启动节点";
  if (index === total - 1) return "收尾节点";
  if (/咖啡|茶|甜品|饮品|书店/.test(node.locationType + node.displayName)) return "缓冲节点";
  if (/展览|美术馆|博物馆|公园|风景|街区|市场|市集/.test(node.locationType + node.displayName)) {
    return "内容节点";
  }
  if (/餐|酒|饭|小吃/.test(node.locationType + node.displayName)) return "补给节点";
  return "转场节点";
}

function compactNodeRoles(nodes: PostchainNodeSummary[]): string {
  if (!nodes.length) return "暂无已完成节点，先保留路线主题。";
  return nodes
    .slice(0, 3)
    .map((node, index) => `${node.displayName}是${nodeRole(node, index, nodes.length)}`)
    .join("，");
}

function platformHashtags(city: string, categories: string[]): string[] {
  return unique([
    city !== "这座城市" ? `#${city}周末` : "#周末路线",
    "#城市漫游",
    "#半日路线",
    "#周末去哪儿",
    ...categories.slice(0, 2).map((category) => `#${category}`),
  ]).slice(0, 6);
}

function buildContentVariants(
  chapter: ArchivedChapter,
  report: Omit<PostchainReport, "contentVariants" | "factCheck">,
  privacy: PostchainPrivacySettings,
): PostchainContentVariant[] {
  const places = report.completedNodes.map((node) => node.displayName).slice(0, 3);
  const categories = unique(report.completedNodes.map((node) => node.locationType)).slice(0, 3);
  const keywords = report.routeKeywords.slice(0, 5);
  const city = privacy.showLocation && chapter.city ? chapter.city : "这座城市";
  const placeText = places.length ? places.join("、") : "已点亮节点";
  const categoryText = categories.length ? categories.join("、") : "本次路线节点";
  const traitText = report.behaviorTraits.slice(0, 3).join("、") || "轻量探索";
  const taskText = report.routeTheme || chapter.card.mission;
  const completedNodeText = compactNodeRoles(report.completedNodes);
  const incompleteText = report.incompleteNodes.length
    ? `还有 ${report.incompleteNodes.length} 个节点没完成，可以留作下次支线。`
    : "路线已完整点亮，形成了清晰闭环。";
  const routeSequence = report.completedNodes.length
    ? report.completedNodes
        .map((node, index) => `${node.displayName}承担${nodeRole(node, index, report.completedNodes.length)}`)
        .join("，")
    : "当前路线还缺少已完成节点，适合先从核心节点开始轻量复刻";
  const publicTags = platformHashtags(city, categories);
  const selfExpressionText = `今天在${city}走完了一条很轻的路线：${placeText}。它更接近「${report.identityBadge}」这种状态，因为你围绕「${taskText}」完成了${categoryText}节点，${report.completionText}。${completedNodeText}；${incompleteText} 这次不用把一次出门解释得太重，它只是把普通周末变成了一次有开始、有停留、有结束的轻行动。${publicTags.slice(0, 4).join(" ")}`;
  const routeSpreadText = `这是一条适合在${city}复刻的半日路线：${placeText}。核心任务是「${taskText}」，节奏可以按“进入状态—停留体验—放松收尾”来走，${routeSequence}。它适合${traitText}的人，也适合独处、朋友轻约会或低压力同行；复刻前确认营业状态、距离和排队情况，时间不够就先保留${places.slice(0, 2).join("、") || "两个核心节点"}。${publicTags.slice(0, 4).join(" ")}`;
  const variants: Array<Omit<PostchainContentVariant, "riskWarnings">> = [
    {
      format: "self_expression",
      title: "自我表达",
      body: "把这次路线整理成一段可直接外发的状态表达。",
      sections: [
        {
          title: "最终报告",
          text: selfExpressionText,
        },
      ],
      bullets: [
        "单次行程只生成短报告",
        "不展示内部报告字段",
        "可加入图片报告",
      ],
      hashtags: publicTags,
    },
    {
      format: "route_spread",
      title: "路线传播",
      body: "把这次路线整理成一段可转发、可复刻的路线说明。",
      sections: [
        {
          title: "最终报告",
          text: routeSpreadText,
        },
      ],
      bullets: [
        "单次行程只生成短报告",
        "保留复刻需要的信息",
        "可加入图片报告",
      ],
      hashtags: ["#路线推荐", "#可复刻路线", ...publicTags],
    },
  ];

  return variants.map((variant) => {
    const text = [
      variant.title,
      variant.body,
      ...variant.sections.flatMap((section) => [section.title, section.text]),
      ...variant.bullets,
      ...variant.hashtags,
    ].join("\n");
    return {
      ...variant,
      riskWarnings: analyzePostchainTextRisks(chapter, privacy, text).map((risk) => risk.detail),
    };
  });
}

const DEFAULT_PRIVACY: PostchainPrivacySettings = {
  showMerchantNames: true,
  showVisitTime: false,
  showLocation: true,
  showPhotos: true,
  showAmount: false,
  showDiscount: false,
};

function resolvePrivacy(privacy?: PostchainPrivacySettings): PostchainPrivacySettings {
  return { ...DEFAULT_PRIVACY, ...privacy };
}

export function buildPostchainReport(
  chapter: ArchivedChapter,
  options: PostchainReportOptions,
): PostchainReport {
  const privacy = resolvePrivacy(options.privacy);
  const canUsePersonalRecords = options.authLevel !== "basic";
  const completed = completedScenes(chapter);
  const incomplete = chapter.journey.scenes.filter(
    (scene) => !chapter.completedSceneOrders.includes(scene.order),
  );
  const completedForGeneration: CompletedScene[] = canUsePersonalRecords
    ? completed
    : completed.map(({ scene }) => ({ scene }));
  const completionRate = completed.length / Math.max(chapter.journey.scenes.length, 1);
  const completionPercent = Math.round(completionRate * 100);
  const unlockedKeywords = buildKeywords(chapter, completedForGeneration);
  const routeKeywords = buildRouteKeywords(chapter, completedForGeneration, privacy);
  const behaviorTraits = canUsePersonalRecords
    ? buildBehaviorTraits(completed, incomplete, completionRate)
    : buildBehaviorTraits(completedForGeneration, incomplete, completionRate).filter(
        (trait) => trait !== "主动记录体验" && trait !== "有照片素材",
      );
  const insight = inferInsight(chapter, completedForGeneration, unlockedKeywords);
  const [poemType, poemLines] = buildPoem(
    chapter,
    completedForGeneration,
    insight.identityBadge,
    options.reportStyle,
    privacy,
  );
  const completedPlaces = completed.map(({ scene }) =>
    sceneDisplayName(scene, privacy),
  );
  const incompletePlaces = incomplete.map((scene) => scene.scene_name);
  const completedNodes = completed.map(({ scene }) => sceneSummary(scene, { privacy }));
  const incompleteNodes = incomplete.map((scene) => sceneSummary(scene, { privacy }));
  const photoUrls = canUsePersonalRecords && privacy.showPhotos
    ? (completed.map(({ record }) => record?.photo).filter(Boolean) as string[])
    : [];
  const storyFragments = completed.map(({ scene, record }) =>
    canUsePersonalRecords && record?.note
      ? `${scene.scene_name} ${
          privacy.showMerchantNames ? scene.location_name : scene.location_type
        }：${record.note}`
      : `${scene.scene_name} ${
          privacy.showMerchantNames ? scene.location_name : scene.location_type
        }：你完成了「${scene.action_task}」`,
  );
  const primaryCta = buildCta(completionRate, options.reportStyle);
  const recommendedNextActions = buildRecommendedNextActions(
    completionRate,
    options.reportStyle,
    incomplete,
    routeKeywords,
  );
  const ending =
    completionRate >= 1
      ? "你把这个下午从日常里偷了回来，并把它写成了自己的隐藏结局。"
      : completionRate >= 0.5
        ? "你没有走完整条路线，但已经从城市手里拿回了一枚属于今天的线索。"
        : "故事刚刚亮起一角，城市还把后半段留给下一次见面。";

  const draftReport: Omit<PostchainReport, "contentVariants"> = {
    title: `${insight.identityBadge}的今日结局`,
    routeTheme: chapter.card.mission,
    routeSummary: `${chapter.card.identity} · ${chapter.journey.emotion_arc.start} → ${chapter.journey.emotion_arc.end}`,
    ...insight,
    completionRate,
    completionPercent,
    completionText: `已完成 ${completed.length}/${chapter.journey.scenes.length} 个节点，完成度 ${completionPercent}%`,
    completedNodes,
    incompleteNodes,
    completedPlaces,
    incompletePlaces,
    routeKeywords,
    behaviorTraits,
    initialPersona: insight.identityBadge,
    recommendedNextActions,
    factCheck: {
      ok: true,
      warnings: [],
      allowedPlaces: [],
      allowedCompletedOrders: [],
    },
    unlockedKeywords,
    storyFragments,
    factSummary: buildFactSummary(chapter, completed, incomplete, options),
    dataSignals: buildDataSignals(chapter, completed, options.authLevel, privacy),
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
  const contentVariants = buildContentVariants(chapter, draftReport, privacy);

  return {
    ...draftReport,
    contentVariants,
    factCheck: validatePostchainReportFacts(chapter, completed, privacy, draftReport),
  };
}
