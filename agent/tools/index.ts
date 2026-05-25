/**
 * Tools Index
 * 导出所有工具和辅助函数
 */

export { searchPoiTool, type POI } from "./search-poi.tool";
export { getPlayerProfileTool, type PlayerProfile } from "./get-player-profile.tool";
export { reverseGeocodeTool, type GeocodeResult } from "./reverse-geocode.tool";

import { searchPoiTool, type POI } from "./search-poi.tool";

/**
 * 并行搜索多个关键词的 POI
 */
export async function searchPoisParallel(
  keywords: string[],
  options: {
    lng: number;
    lat: number;
    radius?: number;
    excludePois?: string[];
  }
): Promise<POI[]> {
  const { lng, lat, radius = 3000, excludePois = [] } = options;
  const seen = new Set<string>();
  const excludeSet = new Set(excludePois);

  // 并行搜索所有关键词
  const searchPromises = keywords.map((keyword) =>
    searchPoiTool.invoke({
      keyword,
      radius,
      lng,
      lat,
    }).catch((err) => {
      console.warn(`POI search failed for "${keyword}":`, err);
      return "[]";
    })
  );

  const results = await Promise.all(searchPromises);

  // 合并去重
  const allPois: POI[] = [];
  for (const result of results) {
    try {
      const pois: POI[] =
        typeof result === "string" ? JSON.parse(result) : result;
      for (const poi of pois) {
        if (!seen.has(poi.name) && !excludeSet.has(poi.name)) {
          seen.add(poi.name);
          allPois.push(poi);
        }
      }
    } catch (e) {
      // 解析失败，跳过
    }
  }

  // 按距离排序
  allPois.sort((a, b) => {
    const distA = parseInt(a.distance || "99999");
    const distB = parseInt(b.distance || "99999");
    return distA - distB;
  });

  return allPois.slice(0, 25);
}
