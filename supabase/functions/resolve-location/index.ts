// Reverse-geocode WGS84 lat/lng to a Chinese "城市·区" string via Amap.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lat, lng } = await req.json();
    const amapKey = Deno.env.get("AMAP_WEB_API_KEY");
    if (!amapKey) {
      return new Response(JSON.stringify({ error: "AMAP_WEB_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(JSON.stringify({ error: "lat/lng required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // WGS84 -> GCJ02
    let glng = lng, glat = lat;
    try {
      const cv = await fetch(
        `https://restapi.amap.com/v3/assistant/coordinate/convert?locations=${lng},${lat}&coordsys=gps&key=${amapKey}`,
      ).then((r) => r.json());
      if (cv.status === "1" && cv.locations) {
        const [a, b] = String(cv.locations).split(",").map(Number);
        glng = a; glat = b;
      }
    } catch (_) { /* ignore */ }

    // Reverse geocode
    const r = await fetch(
      `https://restapi.amap.com/v3/geocode/regeo?location=${glng},${glat}&key=${amapKey}`,
    ).then((res) => res.json());

    if (r.status !== "1") {
      return new Response(JSON.stringify({ error: "regeo failed", detail: r }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const addr = r.regeocode?.addressComponent ?? {};
    const city = (typeof addr.city === "string" && addr.city) || addr.province || "";
    const district = (typeof addr.district === "string" && addr.district) || "";
    const province = (typeof addr.province === "string" && addr.province) || "";
    const label = [city || province, district].filter(Boolean).join("·") || "未知区域";
    const formatted = r.regeocode?.formatted_address || label;

    return new Response(JSON.stringify({
      label,
      city: city || province,
      district,
      province,
      formatted,
      gcj: { lng: glng, lat: glat },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
