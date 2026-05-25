/**
 * Tool: search_poi
 * 搜索附近兴趣点，调用高德 API
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export interface POI {
  name: string;
  type: string;
  address: string;
  location: string;
  distance?: string;
}

const AMAP_KEY = Deno.env.get("AMAP_WEB_API_KEY") || "";

export const searchPoiTool = new DynamicStructuredTool({
  name: "search_poi",
  description:
    "搜索附近的兴趣点（POI）。返回真实地点列表，包含名称、类型、地址。用于寻找咖啡馆、公园、书店等具体场所。",
  schema: z.object({
    keyword: z
      .string()
      .describe("搜索关键词，如：独立咖啡馆、小众公园、独立书店、花店"),
    radius: z
      .number()
      .optional()
      .default(3000)
      .describe("搜索半径（米），默认3000米"),
    lng: z.number().describe("中心点经度（GCJ02坐标）"),
    lat: z.number().describe("中心点纬度（GCJ02坐标）"),
  }),
  func: async ({ keyword, radius = 3000, lng, lat }) => {
    try {
      const url = new URL("https://restapi.amap.com/v3/place/around");
      url.searchParams.set("key", AMAP_KEY);
      url.searchParams.set("location", `${lng},${lat}`);
      url.searchParams.set("keywords", keyword);
      url.searchParams.set("radius", String(radius));
      url.searchParams.set("offset", "5");
      url.searchParams.set("extensions", "base");

      const res = await fetch(url.toString()).then((r) => r.json());

      if (res.status !== "1" || !Array.isArray(res.pois)) {
        console.warn("POI search failed:", keyword, res);
        return "[]";
      }

      const pois: POI[] = res.pois
        .slice(0, 5)
        .map((p: Record<string, unknown>) => ({
          name: String(p.name ?? ""),
          type: String(p.type ?? "").split(";")[0] || "",
          address: String(p.address ?? ""),
          location: String(p.location ?? ""),
          distance: p.distance ? String(p.distance) : undefined,
        }))
        .filter((p: POI) => p.name);

      return JSON.stringify(pois);
    } catch (e) {
      console.warn("search_poi tool error:", keyword, e);
      return "[]";
    }
  },
});
