// 按场景 kind 生成可信的"团购/推荐"卡片（纯本地模板，演示用）。
export type SceneDeal = {
  title: string;
  tag: string;           // 例如「双人套餐」「招牌」
  original: number;
  price: number;
  sold: string;          // "已售 1.2k"
};

const TEMPLATES: Record<string, SceneDeal[]> = {
  cafe: [
    { title: "招牌拿铁 + 当季手作甜品", tag: "单人套餐", original: 78, price: 49, sold: "已售 2.3k" },
    { title: "周末双人下午茶 · 任选两饮一甜", tag: "双人 · 闺蜜", original: 158, price: 98, sold: "已售 860" },
  ],
  bakery: [
    { title: "现烤可颂 3 件组合", tag: "招牌", original: 54, price: 36, sold: "已售 1.8k" },
    { title: "黄油吐司 + 拿铁", tag: "早餐", original: 48, price: 29, sold: "已售 940" },
  ],
  dessert: [
    { title: "招牌芝士蛋糕 + 茶", tag: "单人", original: 68, price: 39, sold: "已售 1.5k" },
    { title: "双人甜品下午茶 · 三选二", tag: "双人", original: 168, price: 108, sold: "已售 720" },
  ],
  bar: [
    { title: "招牌特调 2 杯 · 含小食", tag: "微醺", original: 188, price: 128, sold: "已售 540" },
    { title: "Happy Hour · 任选鸡尾酒", tag: "限时", original: 88, price: 58, sold: "已售 1.1k" },
  ],
  noodle: [
    { title: "招牌面 + 卤味小拼", tag: "单人", original: 48, price: 32, sold: "已售 3.4k" },
    { title: "双人面食套餐 · 含小菜", tag: "双人", original: 96, price: 68, sold: "已售 1.2k" },
  ],
  restaurant: [
    { title: "双人午市套餐 · 4 菜 1 汤", tag: "双人", original: 268, price: 188, sold: "已售 980" },
    { title: "招牌硬菜三选一", tag: "单点", original: 128, price: 88, sold: "已售 1.6k" },
  ],
  market: [
    { title: "探店地图 · 任选 5 家小吃", tag: "通票", original: 88, price: 58, sold: "已售 1.3k" },
    { title: "夜市试吃通行证 · 单人", tag: "夜场", original: 68, price: 42, sold: "已售 760" },
  ],
  bookstore: [
    { title: "单人手冲 + 一本书阅读券", tag: "安静角", original: 58, price: 38, sold: "已售 640" },
    { title: "周末读书会 · 含茶水", tag: "活动", original: 88, price: 58, sold: "已售 230" },
  ],
  flower: [
    { title: "当季小束花 · 自选", tag: "送自己", original: 88, price: 58, sold: "已售 1.0k" },
    { title: "90 分钟插花体验课", tag: "体验", original: 268, price: 198, sold: "已售 420" },
  ],
  plant: [
    { title: "多肉拼盘 DIY", tag: "体验", original: 128, price: 78, sold: "已售 880" },
    { title: "苔藓微景观入门课", tag: "周末", original: 198, price: 138, sold: "已售 360" },
  ],
  park: [
    { title: "单人入园 + 一杯热饮", tag: "门票", original: 48, price: 32, sold: "已售 2.1k" },
    { title: "双人野餐礼盒 · 含毯子", tag: "双人", original: 168, price: 118, sold: "已售 540" },
  ],
  gallery: [
    { title: "单人参观票", tag: "门票", original: 60, price: 45, sold: "已售 1.4k" },
    { title: "双人套票 · 含画册", tag: "双人", original: 168, price: 128, sold: "已售 420" },
  ],
  museum: [
    { title: "单人参观票", tag: "门票", original: 60, price: 45, sold: "已售 2.0k" },
    { title: "双人套票 · 含讲解", tag: "双人", original: 168, price: 128, sold: "已售 480" },
  ],
  cinema: [
    { title: "单人黄金场电影票", tag: "影票", original: 78, price: 49, sold: "已售 3.1k" },
    { title: "双人爆米花 + 可乐套餐", tag: "双人", original: 168, price: 108, sold: "已售 980" },
  ],
  spa: [
    { title: "肩颈舒缓 60min", tag: "单人", original: 388, price: 248, sold: "已售 720" },
    { title: "双人节气养护 90min", tag: "双人", original: 888, price: 598, sold: "已售 240" },
  ],
  temple: [
    { title: "祈福手串 · 含开光", tag: "限量", original: 128, price: 88, sold: "已售 540" },
    { title: "抄经体验 · 含茶歇", tag: "体验", original: 168, price: 118, sold: "已售 280" },
  ],
  river: [
    { title: "城市漫游地图 · 河岸线", tag: "路书", original: 48, price: 28, sold: "已售 620" },
    { title: "双人小船 30min", tag: "双人", original: 168, price: 128, sold: "已售 380" },
  ],
  street: [
    { title: "小吃打卡地图 · 5 选 3", tag: "通票", original: 88, price: 58, sold: "已售 1.5k" },
    { title: "citywalk 路书 · 摄影机位", tag: "路书", original: 38, price: 22, sold: "已售 740" },
  ],
  shop: [
    { title: "招牌好物 3 件组合", tag: "组合", original: 198, price: 138, sold: "已售 620" },
    { title: "探店礼券 · 进店即享", tag: "礼券", original: 50, price: 30, sold: "已售 1.1k" },
  ],
  default: [
    { title: "到店体验组合 · 招牌精选", tag: "推荐", original: 128, price: 88, sold: "已售 980" },
    { title: "双人探店套餐", tag: "双人", original: 198, price: 138, sold: "已售 520" },
  ],
};

// 用 scene order 当种子做轻微偏移，让不同场景显示稍有差异。
export function getSceneDeals(kind: string, seed = 0): SceneDeal[] {
  const base = TEMPLATES[kind] ?? TEMPLATES.default;
  return base.map((d, i) => {
    const bump = ((seed * 13 + i * 7) % 9) - 4; // -4..+4
    const price = Math.max(9, d.price + bump);
    const original = Math.max(price + 10, d.original + bump);
    return { ...d, price, original };
  });
}
