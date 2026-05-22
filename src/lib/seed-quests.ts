import type { CharacterClass, Quest } from "./quest-types";

// Fallback quests — one per character class. Used when AI generation fails
// so the demo always stays thematically consistent with the chosen class.

const POET: Quest = {
  quest_name: "失重城市的漂浮者",
  quest_brief:
    "诗人，你来了。今天的城市像一杯凉掉的茶——表面平静，底下还有些没沉下去的东西。我为你开启了今日副本：『失重城市的漂浮者』。任务很简单：在三个不起眼的角落，证明你还在呼吸。",
  emotion_arc: { start: "蔫蔫的、有点漂", end: "被城市轻轻接住" },
  stages: [
    {
      order: 1,
      stage_name: "遗忘市集的守门人",
      location_name: "武康路某老咖啡馆",
      location_type: "咖啡馆",
      location_hint: "徐汇·武康路梧桐荫下",
      mission: "点一杯黑咖啡，看 30 分钟路人，不要看手机。",
      dm_narrative:
        "这里的老板已经在这个街角站了 20 年，他见过无数个像你一样迷路的人。坐下，喝一口苦的，让眼睛先工作。",
      stay_minutes: 30,
      emotion_tags: ["时间感消失", "被接纳"],
      unlock_words: "你停下来了，这就赢了一半。继续走。",
      transition: "穿过两条梧桐街，下一关就在巷子深处。",
      meituan_keyword: "武康路 咖啡",
    },
    {
      order: 2,
      stage_name: "余庆路的旧门铭文",
      location_name: "余庆路梧桐弄堂",
      location_type: "街道",
      location_hint: "徐汇·余庆路",
      mission: "找一扇你觉得好看的门，拍下来。理由不重要。",
      dm_narrative:
        "门后面有人正在做晚饭，有人正在午睡，有人正在哭。你不需要知道是谁。把它拍下来，就够了。",
      stay_minutes: 20,
      emotion_tags: ["旁观者", "温柔的距离"],
      unlock_words: "好门收下了。继续走，最后一关。",
      transition: "再走两个路口，灯就亮了。",
      meituan_keyword: "余庆路",
    },
    {
      order: 3,
      stage_name: "衡山路的未读咒语",
      location_name: "衡山路某旧书店",
      location_type: "书店",
      location_hint: "徐汇·衡山路",
      mission: "买一本你完全不了解的书，不要看封面挑。",
      dm_narrative:
        "书架是城市的另一种地图，每一本都是一个没去过的地方。闭眼伸手，让运气帮你选。",
      stay_minutes: 25,
      emotion_tags: ["未知的礼物", "新的入口"],
      unlock_words: "今天的咒语已经收齐。回去念给自己听。",
      transition: "副本即将结算，准备好。",
      meituan_keyword: "衡山路 书店",
    },
  ],
  completion_speech:
    "你看，蔫蔫的人也走完了一整张地图。城市今天没治愈你，但接住了你。下次还来，这里的座位给你留着。",
};

const RANGER: Quest = {
  quest_name: "边境野径巡游记",
  quest_brief:
    "游侠，今天的城市边境刚刚解封。我为你解锁的是『边境野径巡游记』——不去网红点，不进购物中心，去找城市还没被修剪过的那一面。",
  emotion_arc: { start: "野生感、躁动", end: "畅快、电量满格" },
  stages: [
    {
      order: 1,
      stage_name: "野市的开盘咒",
      location_name: "城郊早市/批发市场",
      location_type: "市集",
      location_hint: "城郊就近的早市或批发市场",
      mission: "买一样从没见过的水果或小吃，问摊主一句『这怎么挑』。",
      dm_narrative:
        "早市是城市最不修饰的器官，所有定价都是现场算的。听一耳朵讨价还价，你的耳朵会变灵。",
      stay_minutes: 25,
      emotion_tags: ["真实", "野生气息"],
      unlock_words: "你被市集认了。继续。",
      transition: "找一辆公交或骑一辆共享单车，往人少的方向开。",
      meituan_keyword: "早市 批发市场",
    },
    {
      order: 2,
      stage_name: "无人巷的拐弯术",
      location_name: "陌生街区随机巷子",
      location_type: "街道",
      location_hint: "凭直觉拐三次弯",
      mission: "选一条没走过的小巷，走到底，把尽头拍下来。",
      dm_narrative:
        "城市的故事不在主干道上，在那些『再走 10 米就死路』的拐角里。猫、晾衣绳、突兀的涂鸦——都算战利品。",
      stay_minutes: 20,
      emotion_tags: ["纯粹探索", "反算法"],
      unlock_words: "路收下了。野性 +1。",
      transition: "找一家最近的、招牌最旧的小店。",
      meituan_keyword: "苍蝇小馆",
    },
    {
      order: 3,
      stage_name: "苍蝇馆子的猎物",
      location_name: "招牌最旧的小馆子",
      location_type: "餐馆",
      location_hint: "评分别看，看人流和油烟",
      mission: "进去，点老板桌上正在吃的那道，不要看菜单。",
      dm_narrative:
        "本地人吃什么，你就吃什么——这是边境游侠的第一守则。今天的奖励是肚子里那口热的。",
      stay_minutes: 30,
      emotion_tags: ["满足", "胜利感"],
      unlock_words: "猎物到手，副本通关。",
      transition: "回程路上别看手机，听一首老歌。",
      meituan_keyword: "本地小馆",
    },
  ],
  completion_speech:
    "你看，城市还是那个城市，但你今天没走任何人推荐的路。这就是游侠的奖励——一张只属于你的地图。",
};

const MAGE: Quest = {
  quest_name: "失落古卷的回声",
  quest_brief:
    "法师，你说记忆掉了一半，那正好——城市的旧物比任何人都会讲故事。我为你开启的副本是『失落古卷的回声』，三个老地方，每一个都藏着一句你忘掉的咒语。",
  emotion_arc: { start: "迷茫、空白", end: "线索归位、心里有底" },
  stages: [
    {
      order: 1,
      stage_name: "古籍守望塔",
      location_name: "图书馆/旧书店",
      location_type: "图书馆",
      location_hint: "城里最老的那一座",
      mission: "随机抽一本书，翻到第 77 页，把第一句抄进备忘录。",
      dm_narrative:
        "纸张比人记得更久。第 77 页是命定页——不必懂，先抄下来，咒语会自己生效。",
      stay_minutes: 30,
      emotion_tags: ["静默", "意义浮现"],
      unlock_words: "第一段咒语已经入册。",
      transition: "出门往老城方向走，找一座有年头的建筑。",
      meituan_keyword: "图书馆",
    },
    {
      order: 2,
      stage_name: "石墙下的铭文",
      location_name: "老城区历史建筑",
      location_type: "古建筑",
      location_hint: "随便一座挂着保护铭牌的房子",
      mission: "在建筑外绕一圈，找到挂牌，把建造年份记下来。",
      dm_narrative:
        "石头不说话，但它在等一个肯绕一圈的人。年份就是密码——它告诉你，你之前的人活到了哪里。",
      stay_minutes: 20,
      emotion_tags: ["时间感", "归属"],
      unlock_words: "时间收下你了。",
      transition: "找一家博物馆或老茶馆，让咒语沉淀。",
      meituan_keyword: "历史建筑",
    },
    {
      order: 3,
      stage_name: "记忆归还所",
      location_name: "城市博物馆/老茶馆",
      location_type: "博物馆",
      location_hint: "门票别超过 30 元的那种",
      mission: "选一件最不显眼的展品，盯着看 5 分钟，写下三个形容词。",
      dm_narrative:
        "最不起眼的，往往是上一任法师留下的。三个形容词，就是你的新咒语。",
      stay_minutes: 40,
      emotion_tags: ["顿悟", "完整"],
      unlock_words: "记忆找回。副本结束。",
      transition: "去结算页念一遍今天的咒语。",
      meituan_keyword: "博物馆",
    },
  ],
  completion_speech:
    "你没找回全部记忆，但你拼回了三块。剩下的下次再说——古卷不急，城市不急，你也别急。",
};

const KNIGHT: Quest = {
  quest_name: "归乡骑士的炉火三程",
  quest_brief:
    "骑士，盔甲很重，但今晚不用打了。我开启的副本是『归乡骑士的炉火三程』——三个温度合适的地方，把今天的疲惫一段一段放下来。",
  emotion_arc: { start: "疲惫、需要治愈", end: "电池回血、有人间味" },
  stages: [
    {
      order: 1,
      stage_name: "第一段炉火",
      location_name: "社区里的老面馆",
      location_type: "餐厅",
      location_hint: "走路 10 分钟内、有蒸汽冒出来的那种",
      mission: "点一碗热汤的，慢慢吃，不要赶时间。",
      dm_narrative:
        "热汤是这一关的奖励。骑士不丢人，今天可以不打仗，只吃面。",
      stay_minutes: 35,
      emotion_tags: ["放松", "被照顾"],
      unlock_words: "胃暖了，心就跟着暖了。",
      transition: "顺着路走到下一个有树的地方。",
      meituan_keyword: "面馆",
    },
    {
      order: 2,
      stage_name: "树荫下的卸甲",
      location_name: "社区公园/绿地",
      location_type: "公园",
      location_hint: "有长椅、有大爷下棋的那种",
      mission: "找一张长椅坐下，至少 20 分钟，什么都不做。",
      dm_narrative:
        "树会替你站岗。大爷的棋局是这关的背景音乐——你不用懂，只要在场。",
      stay_minutes: 25,
      emotion_tags: ["治愈", "无所事事的合法性"],
      unlock_words: "你卸下了第一片甲。",
      transition: "回家路上拐进一家小店。",
      meituan_keyword: "公园",
    },
    {
      order: 3,
      stage_name: "回程补给站",
      location_name: "巷口便利店或社区小店",
      location_type: "便利店",
      location_hint: "灯还亮着的那一家",
      mission: "买一样小时候吃过的零食，路上拆开吃掉。",
      dm_narrative:
        "童年零食是骑士的回血药水。今天的副本不发金币，只发一点点幸福。",
      stay_minutes: 10,
      emotion_tags: ["温柔", "归家"],
      unlock_words: "副本结束。回家吧。",
      transition: "去结算页给自己点个赞。",
      meituan_keyword: "便利店",
    },
  ],
  completion_speech:
    "骑士今天没有屠龙，也没有救人，但你救了你自己。这一关的勋章是热的、软的、甜的。",
};

const WARLOCK: Quest = {
  quest_name: "随机事件表：第七号",
  quest_brief:
    "术士，骰子滚出来了，你的今日副本是『随机事件表：第七号』。规则只有一条：不要预设，跟着指令走，结果不归你管。",
  emotion_arc: { start: "无聊、什么都行", end: "被意外砸中、活过来了" },
  stages: [
    {
      order: 1,
      stage_name: "未知食材的祭坛",
      location_name: "某家菜市场",
      location_type: "市集",
      location_hint: "就近任意菜场",
      mission: "买一样你从没吃过的食材，问摊主怎么做。",
      dm_narrative:
        "菜场是城市最诚实的角落，没有滤镜，没有摆盘。今天的咒语藏在某个你叫不出名字的根茎里。",
      stay_minutes: 20,
      emotion_tags: ["陌生的好奇", "人间烟火"],
      unlock_words: "食材收下了，跟摊主道个谢。下一关在路上。",
      transition: "随便挑一个方向走，越没去过越好。",
      meituan_keyword: "菜市场",
    },
    {
      order: 2,
      stage_name: "死路尽头的镜面",
      location_name: "陌生街区随机巷子",
      location_type: "街道",
      location_hint: "凭直觉拐三次弯",
      mission: "走进任意一条没去过的巷子，走到死路或不能再走为止。",
      dm_narrative:
        "死路不是失败，是城市替你按下的暂停键。看看尽头有什么——一面墙、一只猫、一句涂鸦，都是奖励。",
      stay_minutes: 15,
      emotion_tags: ["反直觉", "纯粹的探索"],
      unlock_words: "好，你看到的我都记下了。最后一关。",
      transition: "回到亮的地方，找最近的便利店。",
      meituan_keyword: "便利店",
    },
    {
      order: 3,
      stage_name: "便利店神谕",
      location_name: "任意便利店",
      location_type: "便利店",
      location_hint: "回程路上随机一家",
      mission: "让店员推荐任意一样东西，买下来，立刻打开。",
      dm_narrative:
        "店员是这个城市的低阶神祇，他们见过凌晨三点的所有人。听他们的，今天就这么定了。",
      stay_minutes: 10,
      emotion_tags: ["被随机选中", "小小的庆祝"],
      unlock_words: "副本通关，骰子收回。下次再摇。",
      transition: "结算页见。",
      meituan_keyword: "便利店",
    },
  ],
  completion_speech:
    "什么都行的人，今天什么都遇到了。这就是混沌的奖励：你没选它，它选了你。",
};

const SEED_BY_CLASS: Record<CharacterClass, Quest> = {
  游荡诗人: POET,
  边境游侠: RANGER,
  失忆法师: MAGE,
  归家骑士: KNIGHT,
  混沌术士: WARLOCK,
};

export function getSeedQuest(
  character: CharacterClass,
  _emotion: string,
): Quest | null {
  return SEED_BY_CLASS[character] ?? null;
}

export function fallbackSeedQuest(character?: CharacterClass): Quest {
  if (character && SEED_BY_CLASS[character]) return SEED_BY_CLASS[character];
  return POET;
}
