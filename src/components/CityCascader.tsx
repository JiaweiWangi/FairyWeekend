import { useMemo, useState } from "react";
import pca from "china-division/dist/pca.json";

// pca: { 省: { 市: [区, 区, ...] } }
const PCA = pca as Record<string, Record<string, string[]>>;

interface Props {
  value?: { province?: string; city?: string; district?: string };
  onChange: (v: {
    province: string;
    city: string;
    district: string;
    label: string;
  }) => void;
}

// 直辖市 / 特殊：城市层只有"市辖区"，折叠掉
const MUNICIPALITIES = new Set([
  "北京市",
  "天津市",
  "上海市",
  "重庆市",
  "香港特别行政区",
  "澳门特别行政区",
]);

export function CityCascader({ value, onChange }: Props) {
  const [province, setProvince] = useState(value?.province ?? "");
  const [city, setCity] = useState(value?.city ?? "");
  const [district, setDistrict] = useState(value?.district ?? "");

  const provinces = useMemo(() => Object.keys(PCA), []);

  const isMuni = MUNICIPALITIES.has(province);

  const cities = useMemo(() => {
    if (!province) return [];
    return Object.keys(PCA[province] ?? {});
  }, [province]);

  const districts = useMemo(() => {
    if (!province) return [];
    if (isMuni) {
      // 直辖市直接取第一个键（"市辖区"）下的区
      const first = Object.keys(PCA[province] ?? {})[0];
      return first ? PCA[province][first] : [];
    }
    if (!city) return [];
    return PCA[province]?.[city] ?? [];
  }, [province, city, isMuni]);

  function emit(p: string, c: string, dist: string) {
    const effectiveCity = MUNICIPALITIES.has(p) ? p : c;
    const label = [effectiveCity || p, dist].filter(Boolean).join("·") || p || "";
    onChange({ province: p, city: effectiveCity, district: dist, label });
  }

  const selectCls = "pixel-panel p-2 text-sm bg-input flex-1 min-w-0";

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select
          className={selectCls}
          value={province}
          onChange={(e) => {
            const p = e.target.value;
            setProvince(p);
            setCity("");
            setDistrict("");
            emit(p, "", "");
          }}
          style={{ fontFamily: "var(--font-serif-cn)" }}
        >
          <option value="">省/直辖市</option>
          {provinces.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {!isMuni && (
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
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}

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
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
