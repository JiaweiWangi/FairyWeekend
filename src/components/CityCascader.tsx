import { useEffect, useState } from "react";

type District = {
  adcode: string;
  name: string;
  level: string;
  center?: string;
  districts?: District[];
};

interface Props {
  apiKey: string;
  value?: { province?: string; city?: string; district?: string };
  onChange: (v: {
    province: string;
    city: string;
    district: string;
    label: string;
    center?: { lat: number; lng: number };
  }) => void;
}

export function CityCascader({ apiKey, value, onChange }: Props) {
  const [provinces, setProvinces] = useState<District[]>([]);
  const [cities, setCities] = useState<District[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [province, setProvince] = useState(value?.province ?? "");
  const [city, setCity] = useState(value?.city ?? "");
  const [district, setDistrict] = useState(value?.district ?? "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Load provinces
  useEffect(() => {
    if (!apiKey) {
      setErr("地图服务未配置");
      return;
    }
    setLoading(true);
    fetch(
      `https://restapi.amap.com/v3/config/district?keywords=中国&subdistrict=1&key=${apiKey}`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "1" && d.districts?.[0]?.districts) {
          setProvinces(d.districts[0].districts as District[]);
        } else {
          setErr("加载省份失败");
        }
      })
      .catch(() => setErr("网络错误"))
      .finally(() => setLoading(false));
  }, [apiKey]);

  // Load cities/districts when province selected
  useEffect(() => {
    if (!province || !apiKey) {
      setCities([]);
      return;
    }
    fetch(
      `https://restapi.amap.com/v3/config/district?keywords=${encodeURIComponent(province)}&subdistrict=2&key=${apiKey}`,
    )
      .then((r) => r.json())
      .then((d) => {
        const sub = (d.districts?.[0]?.districts ?? []) as District[];
        setCities(sub);
      })
      .catch(() => setCities([]));
  }, [province, apiKey]);

  // Update districts when city changes
  useEffect(() => {
    if (!city) {
      setDistricts([]);
      return;
    }
    const c = cities.find((x) => x.name === city);
    setDistricts(c?.districts ?? []);
  }, [city, cities]);

  function emit(p: string, c: string, dist: string) {
    const cityObj = cities.find((x) => x.name === c);
    const distObj = cityObj?.districts?.find((x) => x.name === dist);
    const centerStr = distObj?.center ?? cityObj?.center;
    let center: { lat: number; lng: number } | undefined;
    if (centerStr) {
      const [lng, lat] = centerStr.split(",").map(Number);
      if (!isNaN(lng) && !isNaN(lat)) center = { lat, lng };
    }
    const label =
      [c || p, dist].filter(Boolean).join("·") || p || "";
    onChange({ province: p, city: c, district: dist, label, center });
  }

  const selectCls =
    "pixel-panel p-2 text-sm bg-input flex-1 min-w-0";

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select
          className={selectCls}
          value={province}
          disabled={loading || !provinces.length}
          onChange={(e) => {
            const p = e.target.value;
            setProvince(p);
            setCity("");
            setDistrict("");
            emit(p, "", "");
          }}
          style={{ fontFamily: "var(--font-serif-cn)" }}
        >
          <option value="">{loading ? "加载中…" : "省/直辖市"}</option>
          {provinces.map((p) => (
            <option key={p.adcode} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          className={selectCls}
          value={city}
          disabled={!cities.length}
          onChange={(e) => {
            const c = e.target.value;
            setCity(c);
            setDistrict("");
            emit(province, c, "");
          }}
          style={{ fontFamily: "var(--font-serif-cn)" }}
        >
          <option value="">城市</option>
          {cities.map((c) => (
            <option key={c.adcode} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className={selectCls}
          value={district}
          disabled={!districts.length}
          onChange={(e) => {
            const d = e.target.value;
            setDistrict(d);
            emit(province, city, d);
          }}
          style={{ fontFamily: "var(--font-serif-cn)" }}
        >
          <option value="">区/县</option>
          {districts.map((d) => (
            <option key={d.adcode} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      {err && <div className="text-xs text-destructive pixel">{err}</div>}
    </div>
  );
}
