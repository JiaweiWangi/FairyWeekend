import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { build } from "esbuild";

async function importBundled(source) {
  const dir = await mkdtemp(path.join(tmpdir(), "postchain-test-"));
  const outfile = path.join(dir, "bundle.mjs");
  await build({
    entryPoints: [source],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    packages: "external",
    logLevel: "silent",
  });
  const mod = await import(`file://${outfile}?t=${Date.now()}`);
  await rm(dir, { recursive: true, force: true });
  return mod;
}

async function importPostchainModules() {
  const dir = await mkdtemp(path.join(tmpdir(), "postchain-entry-"));
  const entry = path.join(dir, "entry.ts");
  await writeFile(
    entry,
    `
      export {
        buildPostchainReport,
        validatePostchainShareText,
        validatePostchainEditedReport,
      } from "${path.resolve("src/lib/postchain-report.ts")}";
      export {
        buildAdaptedJourneyFromArchive,
        revalidateRouteForReplay,
      } from "${path.resolve("src/lib/postchain-route.ts")}";
      export {
        buildCityPreferenceProfile,
      } from "${path.resolve("src/lib/city-preference.ts")}";
      export {
        buildSerialInsights,
      } from "${path.resolve("src/lib/serial-insights.ts")}";
    `,
  );
  const mod = await importBundled(entry);
  await rm(dir, { recursive: true, force: true });
  return mod;
}

function secondChapterFixture() {
  const chapter = chapterFixture();
  return {
    ...chapter,
    chapterId: "ch-test-2",
    createdAt: 1_710_000_000_000,
    archivedAt: 1_710_000_000_000,
    city: "上海",
    card: {
      ...chapter.card,
      identity: "体面感生活策展人",
      mission: "完成一次餐厅与花店仪式",
    },
    journey: {
      ...chapter.journey,
      emotion_arc: { start: "犹豫", end: "被照顾" },
      scenes: [
        {
          order: 1,
          scene_name: "晚餐仪式",
          location_name: "梧桐餐厅",
          location_type: "餐厅",
          location_hint: "静安区",
          persona_narrative: "吃一顿体面的晚餐",
          action_task: "点一道招牌菜",
          stay_minutes: 60,
          emotion_tags: ["体面", "被照顾"],
          meituan_keyword: "餐厅",
        },
      ],
    },
    completedSceneOrders: [1],
    sceneRecords: {},
  };
}

function chapterFixture() {
  return {
    chapterId: "ch-test",
    archivedAt: 1_700_000_000_000,
    createdAt: 1_700_000_000_000,
    city: "上海",
    card: {
      id: "card-test",
      rarity: "SR",
      identity: "慢镜头情绪收藏家",
      mood: "慢 治愈",
      mission: "完成一次咖啡与展览漫游",
      colors: ["#fff", "#eee"],
      illustration_keyword: "city",
    },
    journey: {
      story_opening: "开始",
      emotion_arc: { start: "疲惫", end: "松弛" },
      closing: "结束",
      scenes: [
        {
          order: 1,
          scene_name: "咖啡暂停",
          location_name: "梧桐咖啡",
          location_type: "咖啡",
          location_hint: "徐汇区",
          persona_narrative: "喝一杯慢咖啡",
          action_task: "点一杯低糖咖啡",
          stay_minutes: 35,
          emotion_tags: ["治愈", "慢节奏"],
          meituan_keyword: "咖啡",
        },
        {
          order: 2,
          scene_name: "白墙展览",
          location_name: "城市美术馆",
          location_type: "展览",
          location_hint: "黄浦区",
          persona_narrative: "看一场展",
          action_task: "挑一件作品停留",
          stay_minutes: 45,
          emotion_tags: ["审美", "记录"],
          meituan_keyword: "展览",
        },
      ],
    },
    completedSceneOrders: [1],
    sceneRecords: {
      1: { note: "今天终于慢下来", completedAt: 1_700_000_000_000 },
    },
  };
}

test("postchain privacy hides merchant and city in generated report", async () => {
  const { buildPostchainReport } = await importPostchainModules();
  const report = buildPostchainReport(chapterFixture(), {
    authLevel: "personal",
    reportStyle: "literary",
    privacy: {
      showMerchantNames: false,
      showVisitTime: false,
      showLocation: false,
      showPhotos: false,
      showAmount: false,
      showDiscount: false,
    },
  });
  assert.equal(report.completedNodes[0].displayName, "咖啡暂停");
  assert.equal(report.factCheck.ok, true);
  assert.equal(report.storyFragments.join(" ").includes("梧桐咖啡"), false);
  assert.equal(report.poemLines.join(" ").includes("上海"), false);
});

test("postchain edited report rejects invented amount", async () => {
  const { buildPostchainReport, validatePostchainEditedReport } = await importPostchainModules();
  const chapter = chapterFixture();
  const privacy = {
    showMerchantNames: true,
    showVisitTime: false,
    showLocation: true,
    showPhotos: false,
    showAmount: false,
    showDiscount: false,
  };
  const report = buildPostchainReport(chapter, {
    authLevel: "personal",
    reportStyle: "moments",
    privacy,
  });
  const checked = validatePostchainEditedReport(chapter, privacy, {
    ...report,
    storyFragments: [...report.storyFragments, "今天消费 88 元"],
  });
  assert.equal(checked.ok, false);
  assert.match(checked.warnings.join("；"), /订单金额/);
});

test("share text validator blocks hidden merchant leaks", async () => {
  const { validatePostchainShareText } = await importPostchainModules();
  const warnings = validatePostchainShareText(
    chapterFixture(),
    {
      showMerchantNames: false,
      showVisitTime: false,
      showLocation: true,
      showPhotos: false,
      showAmount: false,
      showDiscount: false,
    },
    "我去了梧桐咖啡",
  );
  assert.equal(warnings.length, 1);
});

test("adapted journey exposes why it fits the user", async () => {
  const { buildAdaptedJourneyFromArchive } = await importPostchainModules();
  const adapted = buildAdaptedJourneyFromArchive(chapterFixture(), {
    profile: "偏好展览和记录",
    loved_tags: ["展览", "审美", "记录"],
    disliked_tags: ["排队"],
    visited_pois: [],
    total_runs: 3,
  });
  assert.equal(adapted.journey.scenes[0].location_name, "城市美术馆");
  assert.deepEqual(adapted.evidence.matchedTags, ["展览", "审美", "记录"]);
  assert.equal(adapted.evidence.promoted[0].sceneName, "白墙展览");
});

test("city preference profile exposes trend and recommendation proof", async () => {
  const { buildCityPreferenceProfile } = await importPostchainModules();
  const profile = buildCityPreferenceProfile([secondChapterFixture(), chapterFixture()], {
    profile: "偏好餐厅和治愈",
    loved_tags: ["餐厅", "治愈"],
    disliked_tags: ["排队"],
    visited_pois: [],
    total_runs: 2,
  });
  assert.match(profile.trendSummary, /品类/);
  assert.match(profile.nextRouteBrief, /上海/);
  assert.ok(profile.recommendationProof.some((item) => item.includes("避开倾向")));
});

test("serial insights summarize multi-trip arc", async () => {
  const { buildSerialInsights } = await importPostchainModules();
  const insights = buildSerialInsights([secondChapterFixture(), chapterFixture()]);
  assert.match(insights.mainlineSummary, /2 章/);
  assert.match(insights.personaShift, /慢镜头情绪收藏家/);
  assert.ok(insights.chapterTitles["ch-test-2"].includes("第 2 章"));
  assert.notEqual(insights.monthlyRecap, "暂无月度复盘");
});
