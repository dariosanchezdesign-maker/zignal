import type { EntityMetrics, Query, ScoreComponent } from "../model/types";
import { clamp } from "./random";

/**
 * Metric engine. Every metric is computed from observations: for each query,
 * which businesses the AI listed (in order) and which it only mentioned.
 * Observations come from extracted Recommendation records.
 */

export interface Observation {
  query: Query;
  ranked: string[]; // matched entity ids in recommended order
  mentioned: string[]; // matched entity ids mentioned without a recommendation
}

/** Weights of the AI Visibility Score (sum to 1). */
export const SCORE_WEIGHTS = {
  recommendation: 0.35,
  position: 0.25,
  coverage: 0.2,
  share: 0.1,
  high_intent: 0.1,
} as const;

/** Share of voice at or above this level normalizes to 100. */
export const SOV_CEILING = 0.4;
/** Queries at or above this commercial weight count as high intent. */
export const HIGH_INTENT_MIN_WEIGHT = 60;

const pctText = (n: number) => `${Math.round(n * 100)}%`;

export function positionScore(avg: number | null) {
  return avg === null ? 0 : clamp((5 - avg) / 4) * 100;
}

export function computeMetrics(entityId: string, name: string, obs: Observation[], categories: string[]): EntityMetrics {
  const total = obs.length || 1;
  let recommended = 0;
  let mentioned = 0;
  let wins = 0;
  let slots = 0;
  let appearances = 0;
  const positions: number[] = [];
  let wSum = 0;
  let wRec = 0;
  let hiSum = 0;
  let hiRec = 0;
  const catTotals: Record<string, { n: number; hit: number }> = {};

  for (const o of obs) {
    const pos = o.ranked.indexOf(entityId);
    const isRec = pos >= 0;
    const isMention = isRec || o.mentioned.includes(entityId);
    slots += o.ranked.length;
    if (isRec) {
      recommended++;
      appearances++;
      positions.push(pos + 1);
      if (pos === 0) wins++;
    }
    if (isMention) mentioned++;
    const w = o.query.commercial_weight;
    wSum += w;
    if (isRec) wRec += w;
    if (w >= HIGH_INTENT_MIN_WEIGHT) {
      hiSum += w;
      if (isRec) hiRec += w;
    }
    const c = (catTotals[o.query.category] ??= { n: 0, hit: 0 });
    c.n++;
    if (isMention) c.hit++;
  }

  const coverage_by_category: Record<string, number> = {};
  for (const cat of categories) if (catTotals[cat]) coverage_by_category[cat] = catTotals[cat].hit / catTotals[cat].n;
  const covValues = Object.values(coverage_by_category);
  const coverage = covValues.length ? covValues.reduce((a, b) => a + b, 0) / covValues.length : 0;

  const recommendation_rate = recommended / total;
  const avg_position = positions.length ? positions.reduce((a, b) => a + b, 0) / positions.length : null;
  const share_of_voice = slots ? appearances / slots : 0;
  const high_intent_visibility = hiSum ? hiRec / hiSum : 0;

  const components: ScoreComponent[] = [
    {
      key: "recommendation",
      label: "Recommendation rate",
      weight: SCORE_WEIGHTS.recommendation,
      raw: `${recommended} of ${obs.length} queries`,
      normalized: recommendation_rate * 100,
      contribution: 0,
      explanation: "Share of tested queries where AI lists you as a recommendation.",
    },
    {
      key: "position",
      label: "Position",
      weight: SCORE_WEIGHTS.position,
      raw: avg_position === null ? "Never recommended" : `Average #${avg_position.toFixed(1)}`,
      normalized: positionScore(avg_position),
      contribution: 0,
      explanation: "Average rank when recommended. #1 scores 100, #5 or lower scores 0.",
    },
    {
      key: "coverage",
      label: "Query coverage",
      weight: SCORE_WEIGHTS.coverage,
      raw: `${covValues.filter((v) => v > 0).length} of ${covValues.length} categories`,
      normalized: coverage * 100,
      contribution: 0,
      explanation: "Average share of queries you appear in, across every query category.",
    },
    {
      key: "share",
      label: "AI share of voice",
      weight: SCORE_WEIGHTS.share,
      raw: `${pctText(share_of_voice)} of recommendations`,
      normalized: Math.min(1, share_of_voice / SOV_CEILING) * 100,
      contribution: 0,
      explanation: `Your share of every recommendation AI made. ${pctText(SOV_CEILING)} or more scores 100.`,
    },
    {
      key: "high_intent",
      label: "High-intent visibility",
      weight: SCORE_WEIGHTS.high_intent,
      raw: `${pctText(high_intent_visibility)} weighted`,
      normalized: high_intent_visibility * 100,
      contribution: 0,
      explanation: "Recommendation rate on high and very-high value queries, weighted by how close each is to a purchase.",
    },
  ];
  components.forEach((c) => (c.contribution = c.normalized * c.weight));
  const score = Math.round(components.reduce((a, c) => a + c.contribution, 0));

  return {
    entity_id: entityId,
    name,
    queries: obs.length,
    recommended,
    mentioned,
    recommendation_rate,
    mention_rate: mentioned / total,
    avg_position,
    share_of_voice,
    coverage,
    coverage_by_category,
    high_intent_visibility,
    weighted_recommendation_rate: wSum ? wRec / wSum : 0,
    wins,
    components,
    score,
  };
}
