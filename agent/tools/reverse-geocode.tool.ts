/**
 * Tool: reverse_geocode
 * 坐标转城市名称，调用高德 API
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export interface GeocodeResult {
  label: string;      // 城市·区县
  city: string;      // 城市
  district: string;  // 区县
  province: string;  // 省份
  formatted: string; // 完整地址
  gcj: {
    lng: number;
    lat: number;
  };
}

const AMAP_KEY = Deno.env.get("AMAP_WEB_API_KEY") || "";

/**
 * WGS84 坐标转 GCJ02
 */
async function wgs84ToGcj02(
  lng: number,
  lat: number
): Promise<{ lng: number; lat: number }> {
  try {
    const url = `https://restapi.amap.com/v3/assistant/coordinate/convert?locations=${lng},${lat}&coordsys=gps&key=${AMAP_KEY}`;
    const res = await fetch(url).then((r) => r.json());
    if (res.status === "1" && res.locations) {
      const [glng, glat] = String(res.locations).split(",").map(Number);
      return { lng: glng, lat: glat };
    }
  } catch (e) {
    console.warn("Coordinate conversion failed:", e);
  }
  return { lng, lat };
}

export const reverseGeocodeTool = new DynamicStructuredTool({
  name: "reverse_geocode",
  description:
    "将坐标转换为城市名称。返回：城市、区县、省份、完整地址。用于确定用户所在位置。",
  schema: z.object({
    lat: z.number().describe("纬度（WGS84坐标）"),
    lng: z.number().describe("经度（WGS84坐标）"),
  }),
  func: async ({ lat, lng }) => {
    try {
      // Step 1: WGS84 -> GCJ02
      const gcj = await wgs84ToGcj02(lng, lat);

      // Step 2: 逆地理编码
      const url = `https://restapi.amap.com/v3/geocode/regeo?location=${gcj.lng},${gcj.lat}&key=${AMAP_KEY}`;
      const res = await fetch(url).then((r) => r.json());

      if (res.status !== "1") {
        console.warn("Reverse geocode failed:", res);
        return JSON.stringify({ error: "geocode_failed" });
      }

      const addr = res.regeocode?.addressComponent ?? {};
      const city =
        (typeof addr.city === "string" && addr.city) || addr.province || "";
      const district =
        (typeof addr.district === "string" && addr.district) || "";
      const province =
        (typeof addr.province === "string" && addr.province) || "";
      const formatted = res.regeocode?.formatted_address || "";

      // 生成标签格式：城市·区县
      const label = [city || province, district].filter(Boolean).join("·");

      const result: GeocodeResult = {
        label,
        city: city || province,
        district,
        province,
        formatted,
        gcj: { lng: gcj.lng, lat: gcj.lat },
      };

      return JSON.stringify(result);
    } catch (e) {
      console.warn("reverse_geocode tool error:", e);
      return JSON.stringify({ error: String(e) });
    }
  },
});
