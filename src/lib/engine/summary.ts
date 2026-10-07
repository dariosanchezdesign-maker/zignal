import type { Insight } from "../model/types";
import type { Workspace } from "./workspace";
import { YOU } from "./insights";

/** Plain helpers for the business-owner views. All derived from records. */

/** "6 of 10": the recommendation rate as a count out of ten. */
export const outOfTen = (rate: number) => Math.round(rate * 10);

/** Questions an insight could realistically win: half of the evidence questions you currently miss. */
export function winnableQuestions(ws: Workspace, insight: Insight): number {
  const ids = new Set(insight.evidence.flatMap((e) => e.query_ids ?? []));
  const missed = ws.outcomes.filter((o) => ids.has(o.query.id) && !o.you?.recommended).length;
  return Math.ceil(missed / 2);
}

/** Most frequent reasons AI gives for recommending `entityId` (location and reputation excluded). */
export function topReasons(ws: Workspace, entityId: string, n = 2): string[] {
  const counts = new Map<string, number>();
  for (const r of ws.recommendations) {
    if (r.matched_business_id !== entityId || !r.recommended) continue;
    for (const reason of r.rationale) {
      if (reason.endsWith(" location") || reason === "Positive reputation signals") continue;
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([r]) => r.charAt(0).toLowerCase() + r.slice(1));
}

/** Questions where `entityId` ranks above you (or you're absent), most valuable first. */
export function beatsYou(ws: Workspace, entityId: string) {
  return ws.outcomes
    .filter((o) => {
      const theirs = o.recommendations.find((r) => r.matched_business_id === entityId && r.recommended)?.position ?? null;
      const mine = o.you?.recommended ? o.you.position : null;
      return theirs !== null && (mine === null || theirs < mine);
    })
    .sort((a, b) => b.query.commercial_weight - a.query.commercial_weight);
}

export { YOU };
