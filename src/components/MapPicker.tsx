import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    AMap?: any;
  }
}

interface MapPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number) => void;
  apiKey: string;
  initialCenter?: [number, number];
}

export function MapPicker({ open, onClose, onSelect, apiKey, initialCenter }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(null);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ name: string; address: string; lat: number; lng: number }>>([]);
  const [mapReady, setMapReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);

  useEffect(() => {
    if (!open || !apiKey || !mapRef.current) return;

    let script: HTMLScriptElement | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy();
        } catch { /* noop */ }
        mapInstanceRef.current = null;
      }
      markerRef.current = null;
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    const createMap = () => {
      if (!mapRef.current || !window.AMap) {
        setScriptFailed(true);
        return;
      }
      try {
        const center: [number, number] = initialCenter ?? [121.4737, 31.2304];
        const map = new window.AMap.Map(mapRef.current, {
          zoom: 12,
          center,
        });
        mapInstanceRef.current = map;
        setMapReady(true);

        map.on("click", (e: any) => {
          const lng = e.lnglat.getLng();
          const lat = e.lnglat.getLat();
          setSelected({ lat, lng });
          setSearchResults([]);

          if (markerRef.current) {
            markerRef.current.setPosition([lng, lat]);
          } else {
            const marker = new window.AMap.Marker({
              position: [lng, lat],
            });
            map.add(marker);
            markerRef.current = marker;
          }
        });
      } catch {
        setScriptFailed(true);
      }
    };

    const loadMap = () => {
      if (window.AMap) {
        createMap();
        return;
      }
      script = document.createElement("script");
      script.type = "text/javascript";
      script.src = `https://webapi.amap.com/maps?v=1.4.15&key=${apiKey}&plugin=AMap.PlaceSearch`;
      script.onerror = () => setScriptFailed(true);
      document.head.appendChild(script);
      timeout = setTimeout(() => {
        if (window.AMap) createMap();
        else setScriptFailed(true);
      }, 5000);
    };

    loadMap();
    return cleanup;
  }, [open, apiKey, initialCenter]);

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    if (!window.AMap || !mapInstanceRef.current) return;

    try {
      const AMap = window.AMap;
      AMap.service(["AMap.PlaceSearch"], () => {
        const placeSearch = new AMap.PlaceSearch({ pageSize: 8 });
        placeSearch.search(searchText.trim(), (status: string, result: any) => {
          if (status === "complete" && result?.info === "OK") {
            const pois = result.poiList?.pois ?? [];
            const list = pois.map((p: any) => ({
              name: p.name,
              address: p.address || "",
              lat: p.location?.lat ?? 0,
              lng: p.location?.lng ?? 0,
            }));
            setSearchResults(list);
            if (list.length > 1 && mapInstanceRef.current) {
              mapInstanceRef.current.setFitView();
            }
          } else {
            setSearchResults([]);
          }
        });
      });
    } catch {
      setSearchResults([]);
    }
  };

  const handleSelectResult = (item: { lat: number; lng: number }) => {
    setSelected({ lat: item.lat, lng: item.lng });
    setSearchResults([]);
    if (mapInstanceRef.current && window.AMap) {
      mapInstanceRef.current.setCenter([item.lng, item.lat]);
      if (markerRef.current) {
        markerRef.current.setPosition([item.lng, item.lat]);
      } else {
        const marker = new window.AMap.Marker({ position: [item.lng, item.lat] });
        mapInstanceRef.current.add(marker);
        markerRef.current = marker;
      }
    }
  };

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected.lat, selected.lng);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 flex flex-col pixel-panel bg-card w-full max-w-lg h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="text-sm pixel text-primary">
            {scriptFailed ? "🗺️ 搜索选点" : mapReady ? "🗺️ 点击地图选点" : "🗺️ 加载地图中…"}
          </h3>
          <button onClick={onClose} className="text-xs pixel text-accent hover:text-primary">
            ✕ 关闭
          </button>
        </div>

        {/* Search */}
        <div className="flex gap-2 p-3 border-b border-border">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="搜索城市或地点…"
            className="flex-1 pixel-panel p-2 text-sm bg-input"
            style={{ fontFamily: "var(--font-serif-cn)" }}
          />
          <button onClick={handleSearch} className="pixel-btn text-xs whitespace-nowrap">
            搜索
          </button>
        </div>

        {/* Results list (persistent panel) */}
        {searchResults.length > 0 && (
          <div className="border-b border-border bg-card">
            <div className="px-3 py-1.5 text-[10px] pixel text-muted-foreground flex items-center justify-between">
              <span>▸ 找到 {searchResults.length} 个地点</span>
              <button
                onClick={() => setSearchResults([])}
                className="text-accent hover:text-primary"
              >
                清除
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {searchResults.map((item, i) => {
                const active =
                  selected?.lat === item.lat && selected?.lng === item.lng;
                return (
                  <button
                    key={i}
                    onClick={() => handleSelectResult(item)}
                    className="w-full text-left px-3 py-2 text-sm border-b border-border/50 last:border-0 hover:bg-primary/10 transition-colors"
                    style={{
                      fontFamily: "var(--font-serif-cn)",
                      background: active
                        ? "color-mix(in oklab, var(--color-primary) 18%, var(--color-card))"
                        : undefined,
                    }}
                  >
                    <div className="font-medium flex items-center gap-2">
                      {active && <span className="text-primary pixel text-xs">◆</span>}
                      {item.name}
                    </div>
                    {item.address && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {item.address}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Map container */}
        <div ref={mapRef} className="flex-1 min-h-1 bg-muted/30" />

        {/* Fallback when script fails */}
        {scriptFailed && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3" style={{ fontFamily: "var(--font-serif-cn)" }}>
              地图加载受限，请使用上方搜索框查找地点
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-border">
          {selected && (
            <div className="text-xs text-muted-foreground mb-2 pixel">
              已选坐标：{selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
            </div>
          )}
          <button
            onClick={handleConfirm}
            disabled={!selected}
            className="pixel-btn w-full text-xs disabled:opacity-50"
          >
            {selected ? "确认选点" : "在地图或搜索中选择一个位置"}
          </button>
        </div>
      </div>
    </div>
  );
}
