import type { Quest } from "./quest-types";

// Demo seed quests for offline / hackathon backup play.
export const SEED_QUESTS: Record<string, Quest> = {
  "游荡诗人|蔫蔫的": {
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
  },
  "混沌术士|混沌待机中": {
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
  },
};

export function getSeedQuest(character: string, emotion: string): Quest | null {
  return SEED_QUESTS[`${character}|${emotion}`] ?? null;
}

export function fallbackSeedQuest(): Quest {
  return SEED_QUESTS["游荡诗人|蔫蔫的"]!;
}
