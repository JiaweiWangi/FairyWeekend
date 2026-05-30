/**
 * 根据文本内容猜测一个可爱的小 emoji，给 MetaRow / 路线条目末尾装饰用。
 * 关键词优先级从上到下；命中第一个即返回。匹配不到返回 null。
 */

const RULES: Array<{ re: RegExp; emoji: string }> = [
  // 动物
  { re: /猫|喵|kitty|cat/i, emoji: "🐾" },
  { re: /狗|汪|puppy|dog/i, emoji: "🐶" },
  { re: /鸟|麻雀|海鸥/, emoji: "🐦" },
  { re: /鱼|水族/, emoji: "🐟" },

  // 书 / 文具
  { re: /书|读|阅读|book/i, emoji: "📖" },
  { re: /笔记|本子|手账/, emoji: "📓" },
  { re: /信|明信片|邮/, emoji: "✉️" },

  // 饮食
  { re: /咖啡|拿铁|手冲|espresso|coffee/i, emoji: "☕" },
  { re: /茶|茶馆|抹茶/, emoji: "🍵" },
  { re: /酒|清酒|威士忌|wine|bar/i, emoji: "🍷" },
  { re: /面|拉面|noodle/i, emoji: "🍜" },
  { re: /蛋糕|甜点|甜品|dessert/i, emoji: "🍰" },
  { re: /面包|可颂|bakery/i, emoji: "🥐" },
  { re: /冰淇淋|雪糕/, emoji: "🍦" },
  { re: /巧克力/, emoji: "🍫" },
  { re: /水|热水/, emoji: "💧" },

  // 自然 / 风景
  { re: /夕阳|落日|黄昏|太阳偏西/, emoji: "🌇" },
  { re: /日出|清晨/, emoji: "🌅" },
  { re: /月|夜晚|深夜/, emoji: "🌙" },
  { re: /星|银河/, emoji: "✨" },
  { re: /河|江|湖|海|溪/, emoji: "🌊" },
  { re: /山|登山/, emoji: "⛰️" },
  { re: /花|樱花|玫瑰|插花|花艺/, emoji: "🌸" },
  { re: /植物|绿植|叶|森林|公园/, emoji: "🌿" },
  { re: /光线|阳光|温柔/, emoji: "☀️" },
  { re: /雨/, emoji: "🌧️" },
  { re: /雪/, emoji: "❄️" },

  // 城市 / 地点
  { re: /集市|菜市场|市场|market/i, emoji: "🧺" },
  { re: /电影|影院|cinema/i, emoji: "🎬" },
  { re: /博物馆|美术馆|展览|gallery|museum/i, emoji: "🖼️" },
  { re: /教堂|寺庙|神社|temple/i, emoji: "⛩️" },
  { re: /唱片|黑胶|vinyl/i, emoji: "💿" },

  // 行为 / 情绪
  { re: /BGM|音乐|歌|city pop|爵士|jazz/i, emoji: "🎵" },
  { re: /散步|citywalk|走|漫步/i, emoji: "🚶" },
  { re: /拍照|相机|出片|photo/i, emoji: "📷" },
  { re: /独自|一个人/, emoji: "🌱" },
  { re: /朋友|同伴/, emoji: "👯" },
  { re: /恋人|约会/, emoji: "💞" },
  { re: /家人|孩子|宝宝/, emoji: "🏡" },

  // 禁忌 / 提醒
  { re: /别去|别做|别排|网红/, emoji: "🚫" },
  { re: /人挤人|排队/, emoji: "⏳" },

  // 时间
  { re: /下午|傍晚/, emoji: "🌤️" },
  { re: /上午|早/, emoji: "🌅" },

  // 礼物
  { re: /礼|赠|gift/i, emoji: "🎁" },
];

export function pickEmoji(text: string): string | null {
  if (!text) return null;
  for (const r of RULES) {
    if (r.re.test(text)) return r.emoji;
  }
  return null;
}
