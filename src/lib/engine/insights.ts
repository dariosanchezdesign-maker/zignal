import type {
  Association,
  Business,
  EntityMetrics,
  Evidence,
  Insight,
  InsightStatus,
  InsightType,
  QueryOutcome,
  Severity,
} from "../model/types";
import type { IndustryConfig } from "../industries/types";
import { getCategoryLabel } from "../industries";
import { computeMetrics, HIGH_INTENT_MIN_WEIGHT, type Observation } from "./metrics";

/**
 * Opportunity engine. Every insight is built from query-level evidence and
 * follows Observation → Evidence → Diagnosis → Action. Expected impact is a
 * projection: the score recomputed as if the business won half of the
 * queries the insight is about.
 */

export const YOU = "you";

export const INSIGHT_LABEL: Record<InsightType, string> = {
  "visibility-gap": "Visibility gap",
  "competitive-threat": "Competitive threat",
  "positioning-gap": "Positioning gap",
  "query-opportunity": "Query opportunity",
  "reputation-signal": "Reputation signal",
  "coverage-gap": "Coverage gap",
};

const pct = (n: number) => `${Math.round(n * 100)}%`;
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
/** Lower-cases a label unless it contains a proper noun or number ("Act 60"). */
const lowerLabel = (s: string) => (/\d/.test(s) ? s : s.toLowerCase());

interface Context {
  business: Business;
  industry: IndustryConfig;
  outcomes: QueryOutcome[];
  observations: Observation[];
  you: EntityMetrics;
  competitors: EntityMetrics[];
  perception: Record<string, Association[]>;
  statuses: Record<string, InsightStatus>;
}

const isRec = (o: QueryOutcome, id: string) => o.recommendations.some((r) => r.matched_business_id === id && r.recommended);
const posOf = (o: QueryOutcome, id: string) => o.recommendations.find((r) => r.matched_business_id === id && r.recommended)?.position ?? null;

/** Most common AI-stated reason (excluding location and reputation) among recs of `id` in `outcomes`. */
function topRationale(outcomes: QueryOutcome[], id: string | null, industry: IndustryConfig, askedOnly = false, exclude?: Set<string>) {
  const counts = new Map<string, number>();
  for (const o of outcomes) {
    for (const r of o.recommendations) {
      if (!r.recommended || (id ? r.matched_business_id !== id : r.position !== 1)) continue;
      for (const reason of r.rationale) {
        const attr = industry.attributes.find((a) => a.rationale === reason);
        if (attr && (!askedOnly || o.query.attributes.includes(attr.id))) counts.set(attr.id, (counts.get(attr.id) ?? 0) + 1);
      }
    }
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1]).find(([id]) => !exclude?.has(id));
  return best ? { attr: industry.attributes.find((a) => a.id === best[0])!, count: best[1] } : null;
}

/** Score if the business were recommended at #2 in half of `queryIds` it currently misses. */
function projectedLift(ctx: Context, queryIds: string[]): number {
  const missing = queryIds.filter((id) => {
    const o = ctx.observations.find((x) => x.query.id === id);
    return o && !o.ranked.includes(YOU);
  });
  const flip = new Set(missing.slice(0, Math.ceil(missing.length / 2)));
  const projected = ctx.observations.map((o) =>
    flip.has(o.query.id) ? { ...o, ranked: [o.ranked[0], YOU, ...o.ranked.slice(1)].slice(0, 5), mentioned: o.mentioned.filter((m) => m !== YOU) } : o,
  );
  const cats = ctx.industry.categories.map((c) => c.id);
  return computeMetrics(YOU, ctx.business.name, projected, cats).score - ctx.you.score;
}

export function generateInsights(ctx: Context): Insight[] {
  const { business, industry, outcomes, competitors, perception } = ctx;
  const candidates: Omit<Insight, "expected_impact" | "severity" | "status">[] = [];
  const targeted = new Set<string>();

  const push = (c: Omit<Insight, "expected_impact" | "severity" | "status">) => candidates.push(c);

  // A. Visibility gaps by category
  for (const cat of industry.categories) {
    const qs = outcomes.filter((o) => o.query.category === cat.id);
    if (qs.length < 3) continue;
    const yourRec = qs.filter((o) => isRec(o, YOU)).length;
    const leader = competitors
      .map((c) => ({ c, n: qs.filter((o) => isRec(o, c.entity_id)).length }))
      .sort((a, b) => b.n - a.n)[0];
    if (!leader || (leader.n - yourRec) / qs.length < 0.2) continue;
    const lost = qs.filter((o) => !isRec(o, YOU));
    const reason = topRationale(lost, leader.c.entity_id, industry, true);
    if (!reason || targeted.has(reason.attr.id)) continue;
    targeted.add(reason.attr.id);
    push({
      id: `visibility-gap:${cat.id}`,
      business_id: business.id,
      type: "visibility-gap",
      title: `Strengthen your ${reason.attr.diagnosis}`,
      observation: `You're recommended in ${pct(yourRec / qs.length)} of ${cat.label.toLowerCase()} queries (${yourRec} of ${qs.length}).`,
      evidence: [
        { label: "Your recommendation rate", value: `${pct(yourRec / qs.length)} · ${yourRec} of ${qs.length} queries`, query_ids: lost.map((o) => o.query.id) },
        { label: `${leader.c.name}`, value: `${pct(leader.n / qs.length)} · ${leader.n} of ${qs.length} queries` },
        { label: `Reason AI gives most for ${leader.c.name}`, value: `“${reason.attr.rationale}” · ${reason.count} answers` },
      ],
      diagnosis: `When AI recommends ${leader.c.name} for these questions, it most often credits ${reason.attr.diagnosis}. It rarely credits you with it.`,
      recommendation: reason.attr.action,
      target_attributes: [reason.attr.id],
      query_ids: qs.map((o) => o.query.id),
    });
  }

  // B. High-intent underperformance
  const hi = outcomes.filter((o) => o.query.commercial_weight >= HIGH_INTENT_MIN_WEIGHT);
  if (hi.length >= 4 && ctx.you.high_intent_visibility < ctx.you.recommendation_rate - 0.06) {
    const lost = hi.filter((o) => !isRec(o, YOU));
    const reason = topRationale(lost, null, industry, false, targeted) ?? topRationale(lost, null, industry);
    if (reason) targeted.add(reason.attr.id);
    const winners = new Map<string, number>();
    lost.forEach((o) => winners.set(o.winner.business_name, (winners.get(o.winner.business_name) ?? 0) + 1));
    const top = [...winners.entries()].sort((a, b) => b[1] - a[1])[0];
    push({
      id: "visibility-gap:high-intent",
      business_id: business.id,
      type: "visibility-gap",
      title: "Win more of the queries closest to a purchase decision",
      observation: `Your overall recommendation rate is ${pct(ctx.you.recommendation_rate)}, but your weighted visibility on high-intent queries is ${pct(ctx.you.high_intent_visibility)}.`,
      evidence: [
        { label: "High and very-high value queries you miss", value: `${lost.length} of ${hi.length}`, query_ids: lost.map((o) => o.query.id) },
        ...(top ? [{ label: "Most frequent winner on those queries", value: `${top[0]} · ${top[1]} queries` }] : []),
        ...(reason ? [{ label: "Reason AI gives most for the #1 pick", value: `“${reason.attr.rationale}”` }] : []),
      ],
      diagnosis: `On decision-stage questions, AI favors businesses it can tie directly to what the customer asked for${reason ? `, most often ${reason.attr.diagnosis}` : ""}.`,
      recommendation: `${reason ? reason.attr.action + " " : ""}Make it easy for AI to answer booking and hiring questions: who you're best for, pricing guidance and how to get started.`,
      target_attributes: reason ? [reason.attr.id] : [],
      query_ids: hi.map((o) => o.query.id),
    });
  }

  // C. Competitive threat on high-value queries
  const threat = competitors
    .map((c) => {
      const above = hi.filter((o) => {
        const theirs = posOf(o, c.entity_id);
        const mine = posOf(o, YOU);
        return theirs !== null && (mine === null || theirs < mine);
      });
      return { c, above };
    })
    .sort((a, b) => b.above.length - a.above.length)[0];
  if (threat && threat.above.length >= 4) {
    const theirs = (perception[threat.c.entity_id] ?? []).slice(0, 3);
    const mine = perception[YOU] ?? [];
    const gapAttr = theirs
      .map((t) => ({ t, diff: t.strength - (mine.find((m) => m.attribute === t.attribute)?.strength ?? 0) }))
      .sort((a, b) => b.diff - a.diff);
    const pickGap = gapAttr.find((g) => !targeted.has(g.t.attribute)) ?? gapAttr[0];
    const attr = pickGap ? industry.attributes.find((a) => a.id === pickGap.t.attribute) : undefined;
    push({
      id: `competitive-threat:${threat.c.entity_id}`,
      business_id: business.id,
      type: "competitive-threat",
      title: `${threat.c.name} is winning your highest-value questions`,
      observation: `${threat.c.name} ranks above you in ${threat.above.length} of ${hi.length} high-value queries.`,
      evidence: [
        { label: `Queries where ${threat.c.name} outranks you`, value: `${threat.above.length}`, query_ids: threat.above.map((o) => o.query.id) },
        { label: `What AI associates with ${threat.c.name}`, value: theirs.map((t) => `${t.label} ${t.strength}`).join(" · ") },
        { label: "Your association with the same", value: theirs.map((t) => `${t.label} ${mine.find((m) => m.attribute === t.attribute)?.strength ?? 0}`).join(" · ") },
      ],
      diagnosis: attr
        ? `AI associates ${threat.c.name} with ${attr.diagnosis} far more than it associates you with it.`
        : `AI gives ${threat.c.name} stronger reasons to be recommended on decision-stage queries.`,
      recommendation: attr ? attr.action : "Close the gaps listed in your positioning opportunities.",
      target_attributes: attr ? [attr.id] : [],
      query_ids: threat.above.map((o) => o.query.id),
    });
    if (attr) targeted.add(attr.id);
  }

  // D. Positioning gaps from perception
  const mine = perception[YOU] ?? [];
  let positioning = 0;
  for (const a of [...mine].sort((x, y) => y.relevantQueries - x.relevantQueries)) {
    if (positioning >= 3 || a.relevantQueries < 3 || a.strength >= 30 || targeted.has(a.attribute)) continue;
    const best = competitors
      .map((c) => ({ c, s: perception[c.entity_id]?.find((x) => x.attribute === a.attribute)?.strength ?? 0 }))
      .sort((x, y) => y.s - x.s)[0];
    if (!best || best.s < 45) continue;
    const attr = industry.attributes.find((x) => x.id === a.attribute)!;
    const qs = outcomes.filter((o) => o.query.attributes.includes(attr.id));
    push({
      id: `positioning-gap:${attr.id}`,
      business_id: business.id,
      type: "positioning-gap",
      title: `AI rarely associates you with “${lowerLabel(attr.label)}”`,
      observation: `${a.relevantQueries} queries ask for ${lowerLabel(attr.label)}. AI cites it as a reason to recommend you in ${a.strength}% of them.`,
      evidence: [
        { label: `Your “${attr.label}” association`, value: `${a.strength} / 100`, query_ids: qs.filter((o) => !isRec(o, YOU)).map((o) => o.query.id) },
        { label: `${best.c.name}'s association`, value: `${best.s} / 100` },
      ],
      diagnosis: `AI does not appear to have evidence connecting you to ${attr.diagnosis}, so it recommends ${best.c.name} instead.`,
      recommendation: attr.action,
      target_attributes: [attr.id],
      query_ids: qs.map((o) => o.query.id),
    });
    targeted.add(attr.id);
    positioning++;
  }

  // E. Near misses
  const near = outcomes.filter(
    (o) => o.query.commercial_weight >= 45 && ((o.you && !o.you.recommended) || (o.you?.position ?? 0) >= 4),
  );
  if (near.length >= 3) {
    const reason = topRationale(near, null, industry, false, targeted) ?? topRationale(near, null, industry);
    if (reason) targeted.add(reason.attr.id);
    push({
      id: "query-opportunity:near-misses",
      business_id: business.id,
      type: "query-opportunity",
      title: "Turn near-misses into recommendations",
      observation: `AI already mentions you in ${near.length} commercially valuable queries but either doesn't recommend you or ranks you #4 or lower.`,
      evidence: [
        { label: "Mentioned without a recommendation", value: `${near.filter((o) => !o.you?.recommended).length} queries`, query_ids: near.map((o) => o.query.id) },
        { label: "Ranked #4 or lower", value: `${near.filter((o) => (o.you?.position ?? 0) >= 4).length} queries` },
        ...(reason ? [{ label: "Reason AI gives most for the #1 pick", value: `“${reason.attr.rationale}”` }] : []),
      ],
      diagnosis: `AI knows you exist in these answers but finds stronger evidence for others${reason ? `, most often ${reason.attr.diagnosis}` : ""}.`,
      recommendation: reason ? reason.attr.action : "Add specific, quotable detail to the pages that cover these topics.",
      target_attributes: reason ? [reason.attr.id] : [],
      query_ids: near.map((o) => o.query.id),
    });
  }

  // F. Reputation signals
  const repRate = (id: string) => {
    const recs = outcomes.flatMap((o) => o.recommendations.filter((r) => r.matched_business_id === id && r.recommended));
    return { n: recs.length, rate: recs.length ? recs.filter((r) => r.rationale.includes("Positive reputation signals")).length / recs.length : 0 };
  };
  const myRep = repRate(YOU);
  const repLeader = competitors.map((c) => ({ c, ...repRate(c.entity_id) })).sort((a, b) => b.rate - a.rate)[0];
  if (repLeader && repLeader.rate - myRep.rate >= 0.3) {
    push({
      id: "reputation-signal:authority",
      business_id: business.id,
      type: "reputation-signal",
      title: "Build the reputation signals AI relies on",
      observation: `AI mentions reviews and press for ${repLeader.c.name} in ${pct(repLeader.rate)} of its recommendations, and for you in ${pct(myRep.rate)}.`,
      evidence: [
        { label: `${repLeader.c.name}: “Positive reputation signals”`, value: `${pct(repLeader.rate)} of ${repLeader.n} recommendations` },
        { label: "You", value: `${pct(myRep.rate)} of ${myRep.n} recommendations` },
      ],
      diagnosis: "AI treats third-party reviews and press as evidence of trust. It finds less of that evidence for you.",
      recommendation: "Grow review volume on Google and industry platforms, and pursue two or three earned press mentions per quarter that name your core service.",
      target_attributes: ["__authority"],
      query_ids: [],
    });
  }

  // G. Coverage gaps
  for (const [cat, cov] of Object.entries(ctx.you.coverage_by_category)) {
    const qs = outcomes.filter((o) => o.query.category === cat);
    if (cov > 0.15 || qs.length < 3 || candidates.some((c) => c.id === `visibility-gap:${cat}`)) continue;
    const label = getCategoryLabel(industry, cat);
    const reason = topRationale(qs, null, industry);
    push({
      id: `coverage-gap:${cat}`,
      business_id: business.id,
      type: "coverage-gap",
      title: `You're almost invisible in ${label.toLowerCase()} queries`,
      observation: `AI mentions you in ${pct(cov)} of ${label.toLowerCase()} queries.`,
      evidence: [{ label: `${label} queries without you`, value: `${qs.filter((o) => !o.you).length} of ${qs.length}`, query_ids: qs.map((o) => o.query.id) }],
      diagnosis: `AI doesn't connect your business to ${label.toLowerCase()} at all${reason ? `. Businesses it recommends here are credited with ${reason.attr.diagnosis}` : ""}.`,
      recommendation: reason ? reason.attr.action : `Publish content that answers ${label.toLowerCase()} questions directly.`,
      target_attributes: reason ? [reason.attr.id] : [],
      query_ids: qs.map((o) => o.query.id),
    });
  }

  return candidates
    .map((c) => {
      const ids = c.evidence.flatMap((e) => e.query_ids ?? []);
      const points = Math.max(1, projectedLift(ctx, ids.length ? ids : c.query_ids));
      const level: Severity = points >= 4 ? "high" : points >= 2 ? "medium" : "low";
      return { ...c, expected_impact: { points, level }, severity: level, status: ctx.statuses[c.id] ?? "not-started" } as Insight;
    })
    .sort((a, b) => b.expected_impact.points - a.expected_impact.points)
    .slice(0, 8);
}

export { lowerFirst };
