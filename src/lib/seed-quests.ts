import type { CharacterClass, Quest } from "./quest-types";

// 每个新角色对应一条种子副本，作为 AI 生成失败时的兜底。
// 主题都贴近真实的"今天想干啥"，避免奇幻味盖过实用性。

const MOUNTAIN: Quest = {
  quest_name: "城市山系疗愈三程",
  quest_brief:
    "疗愈师，城市没有真山，但有三座替身：一片绿、一条江、一段坡。我为你开启的副本是『城市山系疗愈三程』——任务只有一个：让脚先走起来，脑子自然会跟上。",
  emotion_arc: { start: "闷在屋里、需要呼吸", end: "腿酸、但脑子清空了" },
  stages: [
    {
      order: 1,
      stage_name: "第一座小山头",
      location_name: "就近的城市公园",
      location_type: "公园",
      location_hint: "步行 15 分钟内有大树的那个",
      mission: "绕公园外圈走一整圈，不抄近道，不停下看手机。",
      dm_narrative:
        "公园是城市留给疲惫者的呼吸口。一圈下来 20 分钟，你的肺会先谢你，然后是膝盖。",
      stay_minutes: 25,
      emotion_tags: ["呼吸", "节奏感"],
      unlock_words: "第一程完成。腿热了，继续。",
      transition: "找最近的水——河、江、湖、甚至喷泉都算。",
      meituan_keyword: "公园",
    },
    {
      order: 2,
      stage_name: "水边的回血点",
      location_name: "江边/河边/湖边步道",
      location_type: "水边",
      location_hint: "能看到水面、有长椅的地方",
      mission: "走到一处看得见水的位置，坐 15 分钟，不戴耳机。",
      dm_narrative:
        "水比任何 App 都会调节心跳。你不需要做什么，让水替你流。",
      stay_minutes: 20,
      emotion_tags: ["放空", "被自然托住"],
      unlock_words: "第二程完成。准备最后一段坡。",
      transition: "找一段有点高度的路——天桥、坡道、楼顶平台都行。",
      meituan_keyword: "江边步道",
    },
    {
      order: 3,
      stage_name: "登顶仪式",
      location_name: "可以看远的地方",
      location_type: "观景点",
      location_hint: "天桥、坡顶、商场顶楼平台、高地公园",
      mission: "走到一处能看远的地方，深呼吸 10 次，给城市拍一张照。",
      dm_narrative:
        "这是你今天的山顶。不必征服什么，只要能看远，就赢了。",
      stay_minutes: 15,
      emotion_tags: ["开阔", "回到自己"],
      unlock_words: "三程完成，副本结束。回家路上别打车。",
      transition: "去结算页领取你的疗愈勋章。",
      meituan_keyword: "观景平台",
    },
  ],
  completion_speech:
    "你没去任何一座真山，但你的腿告诉你今天爬过了。城市的疗愈很便宜——只要你肯走。",
};

const FOODIE: Quest = {
  quest_name: "市井觅食三连击",
  quest_brief:
    "觅食家，今天的快乐预算我替你算好了：花在嘴上。我开启的副本是『市井觅食三连击』——三个不在攻略里的地方，每个都让你的胃赢一次。",
  emotion_arc: { start: "嘴馋、外卖味腻了", end: "撑得有点幸福" },
  stages: [
    {
      order: 1,
      stage_name: "晨间的烟火祭坛",
      location_name: "就近早市或菜场",
      location_type: "市集",
      location_hint: "本地人买菜的那种，不是网红市集",
      mission: "买一样现做的小吃（包子、煎饼、豆浆都行），站着吃完。",
      dm_narrative:
        "早市的食物是城市里最诚实的——价格诚实、热度诚实、油腻诚实。站着吃，才有那个味。",
      stay_minutes: 20,
      emotion_tags: ["真实", "热乎"],
      unlock_words: "胃开机完成，开始正餐探索。",
      transition: "凭直觉拐进一条没去过的巷子。",
      meituan_keyword: "早市 小吃",
    },
    {
      order: 2,
      stage_name: "苍蝇馆子的猎物",
      location_name: "招牌最旧的小馆子",
      location_type: "餐馆",
      location_hint: "评分别看，看油烟和翻台",
      mission: "进去，点老板桌上正在吃的那一道，不看菜单。",
      dm_narrative:
        "本地人吃什么，你就吃什么——这是觅食家的第一守则。今天的奖励是肚子里那口热的。",
      stay_minutes: 35,
      emotion_tags: ["胜利感", "满足"],
      unlock_words: "主餐通关，准备甜点收尾。",
      transition: "找一家开了至少 10 年的甜品/茶饮老店。",
      meituan_keyword: "本地小馆",
    },
    {
      order: 3,
      stage_name: "甜点收官咒",
      location_name: "老字号甜品店/糖水铺",
      location_type: "甜品店",
      location_hint: "门面不大、招牌掉漆那种最好",
      mission: "点店里最便宜的那一样，慢慢吃完，不带走。",
      dm_narrative:
        "最便宜的那一样，往往是镇店之宝——因为它从开店第一天就在。",
      stay_minutes: 20,
      emotion_tags: ["甜", "圆满"],
      unlock_words: "三连击完成。回家路上少走两步消食。",
      transition: "去结算页给今天的胃发奖。",
      meituan_keyword: "老字号 甜品",
    },
  ],
  completion_speech:
    "今天的快乐预算花得很值。胃满了，人就稳了——这是城市最古老的疗法。",
};

const CURATOR: Quest = {
  quest_name: "慢调策展三章",
  quest_brief:
    "策展人，今天的城市替你安排好了三个慢镜头：一杯咖啡、一本书、一件展品。副本叫『慢调策展三章』，不赶时间，不打卡，只看你愿不愿意慢下来。",
  emotion_arc: { start: "想安静、被吵到了", end: "时间感回来了" },
  stages: [
    {
      order: 1,
      stage_name: "第一章 · 咖啡馆的座位",
      location_name: "梧桐街区某老咖啡馆",
      location_type: "咖啡馆",
      location_hint: "不是连锁的、有老木地板的那种",
      mission: "点一杯黑咖啡，看 30 分钟路人，不要看手机。",
      dm_narrative:
        "这家店的老板见过无数个像你一样想躲一躲的人。坐下，喝一口苦的，让眼睛先工作。",
      stay_minutes: 30,
      emotion_tags: ["时间感消失", "被接纳"],
      unlock_words: "第一章完成。你停下来了，这就赢了一半。",
      transition: "出门往老街区走，找一家独立书店。",
      meituan_keyword: "独立咖啡",
    },
    {
      order: 2,
      stage_name: "第二章 · 书架的暗格",
      location_name: "独立书店/旧书店",
      location_type: "书店",
      location_hint: "门口没有畅销榜的那种最好",
      mission: "闭眼伸手抽一本书，翻到第 77 页，把第一句抄进备忘录。",
      dm_narrative:
        "书架是城市的另一种地图。第 77 页是命定页——不必懂，先抄下来。",
      stay_minutes: 25,
      emotion_tags: ["未知的礼物", "新的入口"],
      unlock_words: "第二章完成。咒语已经入册。",
      transition: "找一家小型展览或博物馆，门票不超过 30 元那种。",
      meituan_keyword: "独立书店",
    },
    {
      order: 3,
      stage_name: "第三章 · 展品的回声",
      location_name: "小型美术馆/城市博物馆",
      location_type: "博物馆",
      location_hint: "人不多、灯光偏暗的那种最好",
      mission: "选一件最不起眼的展品，盯着看 5 分钟，写下三个形容词。",
      dm_narrative:
        "最不起眼的往往是上一任策展人留下的暗线。三个形容词，就是你今天的收藏。",
      stay_minutes: 35,
      emotion_tags: ["顿悟", "完整"],
      unlock_words: "三章收齐。副本结束。",
      transition: "去结算页念一遍今天的咒语。",
      meituan_keyword: "美术馆",
    },
  ],
  completion_speech:
    "你没买任何东西，但你带走了三样：一段安静、一句陌生人写的话、一件没人注意的展品。这是最贵的展览。",
};

const NIGHT: Quest = {
  quest_name: "霓虹之下的夜行三段",
  quest_brief:
    "漫游者，太阳下班了，城市的下半场刚开始。我开启的副本是『霓虹之下的夜行三段』——白天的规则全都失效，今晚你说了算。",
  emotion_arc: { start: "白天太吵、想躲", end: "被夜色充上电" },
  stages: [
    {
      order: 1,
      stage_name: "夜市开盘咒",
      location_name: "城市夜市/夜间小吃街",
      location_type: "夜市",
      location_hint: "本地人多、烟火气重的那条",
      mission: "买两样从没吃过的夜市小吃，边走边吃。",
      dm_narrative:
        "夜市是城市最不修饰的脸。摊主在喊价，邻摊在吵架，你在啃——这就是节奏。",
      stay_minutes: 30,
      emotion_tags: ["热闹", "活着的实感"],
      unlock_words: "胃开了，下一段走起。",
      transition: "找一处能看夜景的水边或天桥。",
      meituan_keyword: "夜市 小吃",
    },
    {
      order: 2,
      stage_name: "夜路上的独白",
      location_name: "江边/河边/天桥夜路",
      location_type: "水边",
      location_hint: "有灯但不刺眼的那段",
      mission: "戴上耳机，循环一首老歌，走 20 分钟不停。",
      dm_narrative:
        "夜路是城市留给你独白的场地。歌循环，路也循环——脑子里的事会自己排队。",
      stay_minutes: 25,
      emotion_tags: ["独处", "释怀"],
      unlock_words: "独白录完。最后一关在亮灯的地方。",
      transition: "找一家 24h 营业的便利店或深夜小馆。",
      meituan_keyword: "江边夜景",
    },
    {
      order: 3,
      stage_name: "深夜补给站",
      location_name: "24h 便利店或深夜小馆",
      location_type: "便利店",
      location_hint: "灯最亮的那一家",
      mission: "买一样小时候吃过的零食或一碗热的，坐下慢慢吃完。",
      dm_narrative:
        "凌晨的灯下，你和店员是同一种生物——都还醒着，都还在场。",
      stay_minutes: 20,
      emotion_tags: ["温柔", "陪伴感"],
      unlock_words: "三段完成。可以回家睡了，也可以再走一会儿。",
      transition: "去结算页给今晚发奖。",
      meituan_keyword: "24小时便利店",
    },
  ],
  completion_speech:
    "白天的你输了一场战争，但夜里的你赢回了一座城。明天还是明天，但今晚是你的。",
};

const COMMUNITY: Quest = {
  quest_name: "社区烟火三程",
  quest_brief:
    "烟火家，今晚不用走远，五百米内就有完整的人间。我开启的副本是『社区烟火三程』——三个温度合适的地方，把今天的疲惫一段段放下来。",
  emotion_arc: { start: "疲惫、需要治愈", end: "电池回血、有人间味" },
  stages: [
    {
      order: 1,
      stage_name: "第一段 · 热汤回血",
      location_name: "社区里的老面馆/小馆",
      location_type: "餐厅",
      location_hint: "走路 10 分钟内、冒蒸汽的那家",
      mission: "点一碗热汤的，慢慢吃完，不要赶时间。",
      dm_narrative: "热汤是这关的奖励。今天可以不打仗，只吃面。",
      stay_minutes: 35,
      emotion_tags: ["放松", "被照顾"],
      unlock_words: "胃暖了，心就跟着暖了。",
      transition: "顺着路走到下一个有树的地方。",
      meituan_keyword: "社区面馆",
    },
    {
      order: 2,
      stage_name: "第二段 · 长椅卸甲",
      location_name: "社区公园/小广场长椅",
      location_type: "公园",
      location_hint: "有大爷下棋、有阿姨跳舞的那种",
      mission: "找一张长椅坐下，至少 20 分钟，什么都不做。",
      dm_narrative:
        "树会替你站岗，大爷的棋局是这关的背景音乐。你不用懂，只要在场。",
      stay_minutes: 25,
      emotion_tags: ["治愈", "无所事事的合法性"],
      unlock_words: "你卸下了第一片甲。",
      transition: "回家路上拐进一家小店。",
      meituan_keyword: "社区公园",
    },
    {
      order: 3,
      stage_name: "第三段 · 巷口补给",
      location_name: "巷口便利店或社区小店",
      location_type: "便利店",
      location_hint: "灯还亮着的那一家",
      mission: "买一样小时候吃过的零食，路上拆开吃掉。",
      dm_narrative:
        "童年零食是烟火家的回血药水。今天的副本不发金币，只发一点点幸福。",
      stay_minutes: 10,
      emotion_tags: ["温柔", "归家"],
      unlock_words: "副本结束。回家吧。",
      transition: "去结算页给自己点个赞。",
      meituan_keyword: "便利店",
    },
  ],
  completion_speech:
    "你今天没屠龙，也没救人，但你救了你自己。这一关的勋章是热的、软的、甜的。",
};

const SEED_BY_CLASS: Record<CharacterClass, Quest> = {
  山系疗愈师: MOUNTAIN,
  市井觅食家: FOODIE,
  慢调策展人: CURATOR,
  夜行漫游者: NIGHT,
  社区烟火家: COMMUNITY,
};

export function getSeedQuest(
  character: CharacterClass,
  _emotion: string,
): Quest | null {
  return SEED_BY_CLASS[character] ?? null;
}

export function fallbackSeedQuest(character?: CharacterClass): Quest {
  if (character && SEED_BY_CLASS[character]) return SEED_BY_CLASS[character];
  return COMMUNITY;
}
