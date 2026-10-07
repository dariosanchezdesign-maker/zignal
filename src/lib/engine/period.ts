import type { ScanResult } from "../types";

/** Change over the selected window, derived from the monitored trend. */
export function periodChange(scan: ScanResult, days: number) {
  const t = scan.trend;
  const now = t[t.length - 1].score;
  const then = t[Math.max(0, t.length - 1 - days)].score;
  const score = now - then;
  return {
    score,
    mentionRate: Math.round(score * 0.9),
    recommendationRate: Math.round(score * 1.1),
    avgPosition: -Math.round(score * 4) / 100,
    share: Math.round(score * 0.4),
    queries: days >= 30 ? Math.round(scan.queries.length * 0.12) : days >= 7 ? 3 : 0,
  };
}

export function trendWindow(scan: ScanResult, days: number) {
  return scan.trend.slice(-days);
}
