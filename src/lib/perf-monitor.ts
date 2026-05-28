/**
 * 页面性能监测：
 * - 首屏关键时点（TTFB/FCP/DCL/Load）
 * - Web Vitals（LCP/CLS/INP/FCP/TTFB）
 * - JS 包体积估算（已加载的 script / xhr-fetch 流量）
 *
 * 用法：在路由组件 useEffect 里调用 reportPagePerf("me")
 */

import type { Metric } from "web-vitals";

const STARTED = new Set<string>();

function fmtMs(v: number | undefined | null) {
  if (v == null || !isFinite(v)) return "—";
  return `${v.toFixed(0)} ms`;
}

function fmtKB(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function rating(name: string, v: number): string {
  // Web Vitals 阈值（good / needs-improvement / poor）
  const T: Record<string, [number, number]> = {
    LCP: [2500, 4000],
    INP: [200, 500],
    CLS: [0.1, 0.25],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
  };
  const t = T[name];
  if (!t) return "";
  if (v <= t[0]) return "✅ good";
  if (v <= t[1]) return "⚠️ needs-improvement";
  return "❌ poor";
}

function collectResourceStats() {
  if (typeof performance === "undefined") return null;
  const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  let jsBytes = 0;
  let jsCount = 0;
  let cssBytes = 0;
  let imgBytes = 0;
  let xhrBytes = 0;
  const topJs: { name: string; size: number }[] = [];

  for (const e of entries) {
    const size = e.encodedBodySize || e.transferSize || 0;
    const url = e.name;
    if (e.initiatorType === "script" || /\.m?js(\?|$)/.test(url)) {
      jsBytes += size;
      jsCount += 1;
      topJs.push({ name: url.split("/").slice(-2).join("/"), size });
    } else if (e.initiatorType === "link" || /\.css(\?|$)/.test(url)) {
      cssBytes += size;
    } else if (e.initiatorType === "img" || /\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/.test(url)) {
      imgBytes += size;
    } else if (e.initiatorType === "xmlhttprequest" || e.initiatorType === "fetch") {
      xhrBytes += size;
    }
  }
  topJs.sort((a, b) => b.size - a.size);
  return { jsBytes, jsCount, cssBytes, imgBytes, xhrBytes, topJs: topJs.slice(0, 6) };
}

function collectNavTiming() {
  if (typeof performance === "undefined") return null;
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (!nav) return null;
  const paint = performance.getEntriesByType("paint") as PerformancePaintTiming[];
  const fp = paint.find((p) => p.name === "first-paint")?.startTime;
  const fcp = paint.find((p) => p.name === "first-contentful-paint")?.startTime;
  return {
    ttfb: nav.responseStart - nav.requestStart,
    domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
    domComplete: nav.domComplete - nav.startTime,
    loadEvent: nav.loadEventEnd - nav.startTime,
    transferSize: nav.transferSize,
    type: nav.type,
    firstPaint: fp,
    firstContentfulPaint: fcp,
  };
}

export function reportPagePerf(pageName: string) {
  if (typeof window === "undefined") return;
  if (STARTED.has(pageName)) return;
  STARTED.add(pageName);

  const startMark = `perf:${pageName}:start`;
  performance.mark(startMark);

  // 等首屏内容渲染完后再汇总（一帧 + 一点缓冲，确保资源数据齐全）
  const summarize = () => {
    const nav = collectNavTiming();
    const res = collectResourceStats();
    const tag = `📊 [perf · ${pageName}]`;

    console.groupCollapsed(`${tag} 页面加载关键指标`);
    if (nav) {
      console.table({
        TTFB: fmtMs(nav.ttfb),
        "First Paint": fmtMs(nav.firstPaint),
        "First Contentful Paint (FCP)": fmtMs(nav.firstContentfulPaint),
        "DOMContentLoaded": fmtMs(nav.domContentLoaded),
        "DOM Complete": fmtMs(nav.domComplete),
        "Load Event": fmtMs(nav.loadEvent),
        "Navigation 类型": nav.type,
        "首文档传输": fmtKB(nav.transferSize || 0),
      });
    } else {
      console.log(`${tag} 暂无 navigation timing（可能在 SSR 流水线里）`);
    }

    if (res) {
      console.log(
        `${tag} JS ${res.jsCount} 个 / ${fmtKB(res.jsBytes)}  ·  CSS ${fmtKB(res.cssBytes)}  ·  图片 ${fmtKB(res.imgBytes)}  ·  XHR/Fetch ${fmtKB(res.xhrBytes)}`,
      );
      if (res.topJs.length > 0) {
        console.groupCollapsed(`${tag} 最大的 JS 资源 (Top ${res.topJs.length})`);
        console.table(
          res.topJs.map((j) => ({ 资源: j.name, 大小: fmtKB(j.size) })),
        );
        console.groupEnd();
      }
    }
    console.groupEnd();
  };

  if (document.readyState === "complete") {
    setTimeout(summarize, 150);
  } else {
    window.addEventListener("load", () => setTimeout(summarize, 150), { once: true });
  }

  // Web Vitals 持续上报
  const tag = `🎯 [vitals · ${pageName}]`;
  const onMetric = (m: Metric) => {
    const value = m.name === "CLS" ? m.value : Math.round(m.value);
    const formatted = m.name === "CLS" ? value.toFixed(3) : `${value} ms`;
    console.log(`${tag} ${m.name}: ${formatted}  ${rating(m.name, m.value)}`);
  };
  onLCP(onMetric);
  onCLS(onMetric);
  onINP(onMetric);
  onFCP(onMetric);
  onTTFB(onMetric);
}
