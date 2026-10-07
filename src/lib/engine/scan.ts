import type {
  BusinessProfile,
  EntityMetrics,
  IndustryConfig,
  Level,
  Opportunity,
  OpportunityStatus,
  QueryResult,
  RankedEntity,
  ScanResult,
  TopicStat,
  TrendPoint,
} from "../types";
import { getCategory, getIndustry, getTopic } from "../industries";
import { DEFAULT_MARKET, nearbyAreas } from "../locations";
import { clamp, pick, pickN, rng } from "./random";

/**
 * The scan engine.
 *
 * MVP note: answers are produced by a deterministic simulation that models how
 * assistants weigh authority and topic-specific evidence. The shape of
 * `QueryResult` is what a live provider (querying real assistants and parsing
 * the businesses they name) returns, so swapping the simulation for live data
 * does not change any screen.
 */

export const YOU = "you";

const fill = (s: string, vars: Record<string, string>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------------------
// 1. Query generation
// ---------------------------------------------------------------------------

export interface GeneratedQuery {
  id: string;
  text: string;
  intent: QueryResult["intent"];
  topic: string;
  location: string;
}

export function generateQueries(business: BusinessProfile, industry: IndustryConfig): GeneratedQuery[] {
  const category = getCategory(industry, business.category);
  const templates = industry.templates[category.templateGroup] ?? Object.values(industry.templates)[0];
  const cities = [business.location, ...nearbyAreas(business.location)];
  const depth = business.depth ?? 4;
  const seen = new Set<string>();
  const out: GeneratedQuery[] = [];

  for (let v = 0; v < depth; v++) {
    templates.forEach((t, i) => {
      const usesFocus = t.text.includes("{focus}");
      const usesCity = t.text.includes("{city}");
      if (v > 0 && !usesFocus && !usesCity) return;
      const city = v === 0 ? business.location : cities[(v + i) % cities.length];
      const focus = category.focuses[(i + v) % category.focuses.length];
      const text = capitalize(
        fill(t.text, {
          city,
          region: DEFAULT_MARKET.region,
          noun: category.noun,
          plural: category.plural,
          focus,
          service: business.primaryService.toLowerCase(),
        }),
      );
      const key = text.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push({
        id: `q${out.length + 1}`,
        text,
        intent: t.intent,
        topic: t.topic,
        location: usesCity ? city : DEFAULT_MARKET.region,
      });
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2. Simulated AI answers
// ---------------------------------------------------------------------------

interface Entity {
  id: string;
  name: string;
  authority: number;
  topicStrength: Record<string, number>;
}

const INCLUDE_THRESHOLD = 0.55;
const MENTION_THRESHOLD = 0.45;

/**
 * AI answers also name businesses the user doesn't track. They compete for the
 * same slots, which keeps rankings honest and realistic.
 */
function otherEntities(business: BusinessProfile, industry: IndustryConfig): Entity[] {
  const group = getCategory(industry, business.category).templateGroup;
  const names = industry.marketNames[group] ?? Object.values(industry.marketNames)[0];
  const tracked = new Set([business.name, ...business.competitors.map((c) => c.name)]);
  return names
    .filter((n) => !tracked.has(n))
    .slice(0, 3)
    .map((name, i) => {
      const r = rng(business.id, "other", name);
      const topicStrength: Record<string, number> = {};
      industry.topics.forEach((t) => (topicStrength[t.id] = clamp(0.28 + r() * 0.42)));
      return { id: `o${i + 1}`, name, authority: clamp(0.42 + r() * 0.14), topicStrength };
    });
}

const WINNER_GAPS = [
  "More authoritative references",
  "More specific service pages",
  "Stronger local signals",
  "More third-party mentions",
  "More recent press coverage",
  "Higher review volume",
];

function entityScore(e: Entity, q: GeneratedQuery, business: BusinessProfile) {
  const r = rng(business.id, q.id, e.id);
  const topic = e.topicStrength[q.topic] ?? 0.4;
  const noise = (r() - 0.5) * 0.3;
  const localBoost = q.intent === "local" && e.id === YOU ? 0.04 : 0;
  return 0.35 * e.authority + 0.65 * topic + noise + localBoost;
}

function simulateAnswer(
  q: GeneratedQuery,
  business: BusinessProfile,
  industry: IndustryConfig,
  entities: Entity[],
): QueryResult {
  const scored = entities
    .map((e) => ({ e, s: entityScore(e, q, business) }))
    .sort((a, b) => b.s - a.s);

  let included = scored.filter((x) => x.s >= INCLUDE_THRESHOLD).slice(0, 4);
  if (included.length < 2) included = scored.slice(0, 2);
  const mentioned = scored.filter((x) => !included.includes(x) && x.s >= MENTION_THRESHOLD).slice(0, 2);

  const ranking: RankedEntity[] = included.map((x, i) => ({ id: x.e.id, name: x.e.name, position: i + 1 }));
  const alsoMentioned: RankedEntity[] = mentioned.map((x) => ({ id: x.e.id, name: x.e.name, position: 0 }));

  const you = ranking.find((x) => x.id === YOU);
  const position = you ? you.position : null;
  const isMentioned = !!you || alsoMentioned.some((x) => x.id === YOU);
  const winner = ranking[0];
  const winnerEntity = entities.find((e) => e.id === winner.id)!;
  const topic = getTopic(industry, q.topic);
  const r = rng(business.id, q.id, "copy");
  const city = business.location;

  const strengths = industry.strengths.map((s) => fill(s, { city, region: DEFAULT_MARKET.region }));
  const yourTopic = business.topicStrength[q.topic] ?? 0.4;
  const whyYou = position
    ? [
        ...(yourTopic > 0.6 ? [topic.winSignals[0]] : []),
        ...pickN(strengths, yourTopic > 0.6 ? 2 : 3, r),
      ].slice(0, 4)
    : [];

  const whyWinner =
    winner.id === YOU
      ? []
      : [topic.winSignals[Math.floor(r() * topic.winSignals.length)], ...pickN(WINNER_GAPS, 3, r)].slice(0, 4);

  let opportunity: Level;
  if (position === 1) opportunity = "low";
  else if (position !== null && position <= 3) opportunity = position === 2 && r() > 0.5 ? "low" : "medium";
  else opportunity = (winnerEntity.topicStrength[q.topic] ?? 0) > 0.6 || r() > 0.4 ? "high" : "medium";

  const runnerUp = ranking.find((x) => x.id !== winner.id);
  let summary: string;
  if (winner.id === YOU) {
    summary = `AI leads with ${business.name}, citing ${lower(whyYou[0] ?? "a clear offering")}. ${
      runnerUp ? `${runnerUp.name} is offered as an alternative.` : ""
    }`;
  } else if (position) {
    summary = `AI recommends ${winner.name} first, pointing to ${lower(whyWinner[0])}. ${business.name} appears at #${position}, noted for ${lower(
      whyYou[0] ?? "its local presence",
    )}.`;
  } else if (isMentioned) {
    summary = `AI recommends ${winner.name}${runnerUp ? ` and ${runnerUp.name}` : ""}. ${business.name} is only mentioned in passing, without a recommendation.`;
  } else {
    summary = `AI recommends ${winner.name}${runnerUp ? ` and ${runnerUp.name}` : ""}. ${business.name} does not appear in the answer at all.`;
  }

  const dr = r();
  const delta = position === null ? 0 : dr > 0.82 ? 1 : dr < 0.12 ? -1 : 0;

  return {
    ...q,
    ranking,
    alsoMentioned,
    position,
    mentioned: isMentioned,
    recommended: position !== null && position <= 3,
    winnerId: winner.id,
    winnerName: winner.name,
    opportunity,
    summary: summary.trim(),
    whyYou,
    whyWinner,
    delta,
  };
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

// ---------------------------------------------------------------------------
// 3. Metrics
// ---------------------------------------------------------------------------

export function entityMetrics(id: string, name: string, queries: QueryResult[]): Omit<EntityMetrics, "topTopics" | "edges"> {
  const total = queries.length || 1;
  let mentions = 0;
  let recs = 0;
  let wins = 0;
  const positions: number[] = [];
  let slots = 0;
  let appearances = 0;
  for (const q of queries) {
    slots += q.ranking.length;
    const hit = q.ranking.find((x) => x.id === id);
    if (hit) {
      appearances++;
      positions.push(hit.position);
      if (hit.position <= 3) recs++;
      if (hit.position === 1) wins++;
    }
    if (hit || q.alsoMentioned.some((x) => x.id === id)) mentions++;
  }
  const mentionRate = mentions / total;
  const recommendationRate = recs / total;
  const avgPosition = positions.length ? positions.reduce((a, b) => a + b, 0) / positions.length : null;
  const share = slots ? appearances / slots : 0;
  const positionScore = avgPosition ? clamp((4.5 - avgPosition) / 3.5) : 0;
  const score = Math.round(
    100 * (0.3 * mentionRate + 0.35 * recommendationRate + 0.2 * positionScore + 0.15 * clamp(share * 3)),
  );
  return { id, name, score, mentionRate, recommendationRate, avgPosition, share, wins };
}

function topicStats(industry: IndustryConfig, queries: QueryResult[], entities: Entity[]): TopicStat[] {
  return industry.topics
    .map((topic) => {
      const qs = queries.filter((q) => q.topic === topic.id);
      if (!qs.length) return null;
      const rate = (id: string) => qs.filter((q) => q.ranking.some((x) => x.id === id && x.position <= 3)).length / qs.length;
      const leaderEntity = [...entities].sort((a, b) => rate(b.id) - rate(a.id))[0];
      return {
        topic,
        queries: qs.length,
        recommendationRate: rate(YOU),
        mentionRate: qs.filter((q) => q.mentioned).length / qs.length,
        leader: { id: leaderEntity.id, name: leaderEntity.name, rate: rate(leaderEntity.id) },
      } satisfies TopicStat;
    })
    .filter((x): x is TopicStat => x !== null);
}

// ---------------------------------------------------------------------------
// 4. Opportunities, story, trend
// ---------------------------------------------------------------------------

function buildOpportunities(
  business: BusinessProfile,
  topics: TopicStat[],
  total: number,
  statuses: Record<string, OpportunityStatus>,
): Opportunity[] {
  const industry = getIndustry(business.industry);
  const vars = {
    city: business.location,
    service: business.primaryService.toLowerCase(),
    name: business.name,
    plural: getCategory(industry, business.category).plural,
  };
  const ranked = topics
    .map((t) => {
      const compRate = t.leader.id === YOU ? 0 : t.leader.rate;
      const gap = Math.max(0, compRate - t.recommendationRate) + (1 - t.recommendationRate) * 0.25;
      return { t, gap, weight: gap * Math.sqrt(t.queries) };
    })
    .sort((a, b) => b.weight - a.weight);

  return ranked.slice(0, 6).map(({ t, gap }, i) => {
    const impact: Level = gap > 0.42 ? "high" : gap > 0.22 ? "medium" : "low";
    const id = `${business.id}:${t.topic.id}`;
    const defaultStatus: OpportunityStatus = business.isDemo ? (i === 2 ? "in-progress" : i === 5 ? "completed" : "not-started") : "not-started";
    return {
      id,
      index: i + 1,
      topicId: t.topic.id,
      title: fill(t.topic.opportunity.title, vars),
      impact,
      why: fill(t.topic.opportunity.why, vars),
      action: fill(t.topic.opportunity.action, vars),
      expectedLift: Math.max(1, Math.round(gap * (t.queries / total) * 36 + gap * 4)),
      affectedQueries: t.queries,
      status: statuses[id] ?? defaultStatus,
    };
  });
}

function buildTrend(business: BusinessProfile, score: number): TrendPoint[] {
  const r = rng(business.id, "trend");
  const days = 90;
  const start = clamp(score - 7 - Math.round(r() * 5), 5, 98);
  const end = new Date();
  const points: TrendPoint[] = [];
  let drift = 0;
  for (let i = 0; i < days; i++) {
    const t = i / (days - 1);
    drift = drift * 0.7 + (r() - 0.5) * 2.4;
    const base = start + (score - start) * (t * t * 0.4 + t * 0.6);
    const value = i === days - 1 ? score : Math.round(clamp(base + drift * (1 - t * 0.6), 1, 99));
    const d = new Date(end);
    d.setDate(end.getDate() - (days - 1 - i));
    points.push({ date: d.toISOString().slice(0, 10), score: value });
  }
  return points;
}

function buildStory(business: BusinessProfile, you: EntityMetrics, competitors: EntityMetrics[]): ScanResult["story"] {
  const top = competitors[0];
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  if (!top || you.score >= top.score) {
    return {
      tone: "leading",
      headline: "You're already highly visible. Here's how to protect your position.",
      detail: top
        ? `AI recommends ${business.name} in ${pct(you.recommendationRate)} of questions — more than any competitor. ${top.name} is closest at ${pct(
            top.recommendationRate,
          )}.`
        : `AI recommends ${business.name} in ${pct(you.recommendationRate)} of questions.`,
    };
  }
  if (you.score >= top.score - 18 && you.mentionRate >= 0.45) {
    return {
      tone: "contender",
      headline: "AI knows you exist, but your competitors are being recommended more often.",
      detail: `${top.name} is recommended in ${pct(top.recommendationRate)} of questions. You're recommended in ${pct(
        you.recommendationRate,
      )} — and mentioned without a recommendation in ${pct(Math.max(0, you.mentionRate - you.recommendationRate))}.`,
    };
  }
  const ratio = you.recommendationRate > 0 ? top.recommendationRate / you.recommendationRate : null;
  return {
    tone: "behind",
    headline: "When customers ask AI, it mostly recommends someone else.",
    detail: ratio
      ? `${top.name} is recommended ${ratio.toFixed(1)}× more often than ${business.name}. In ${pct(
          1 - you.recommendationRate,
        )} of the questions your customers ask, AI points them somewhere else.`
      : `${top.name} leads; ${business.name} is not yet recommended for any tracked question.`,
  };
}

function buildInsights(business: BusinessProfile, topics: TopicStat[]): string[] {
  const sorted = [...topics].sort((a, b) => b.recommendationRate - a.recommendationRate);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const second = sorted[sorted.length - 2];
  const out: string[] = [];
  if (best && worst && best !== worst) {
    out.push(
      `AI recommends you for ${best.topic.phrase}, but you have low visibility for ${worst.topic.phrase}.`,
    );
  }
  if (second && second.leader.id !== YOU) {
    out.push(`AI frequently recommends ${second.leader.name} when people ask about ${second.topic.phrase} in ${business.location}.`);
  }
  const lost = topics.filter((t) => t.leader.id !== YOU && t.leader.rate - t.recommendationRate > 0.3);
  if (lost.length) {
    out.push(`Competitors lead in ${lost.length} of ${topics.length} topics customers ask AI about.`);
  }
  const owned = topics.filter((t) => t.leader.id === YOU);
  if (owned.length) {
    out.push(`You're the most-recommended business for ${owned.map((t) => t.topic.phrase).slice(0, 2).join(" and ")}.`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 5. Run
// ---------------------------------------------------------------------------

export function runScan(business: BusinessProfile, statuses: Record<string, OpportunityStatus> = {}): ScanResult {
  const industry = getIndustry(business.industry);
  const entities: Entity[] = [
    { id: YOU, name: business.name, authority: business.authority, topicStrength: business.topicStrength },
    ...business.competitors.map((c) => ({ id: c.id, name: c.name, authority: c.authority, topicStrength: c.topicStrength })),
  ];
  const generated = generateQueries(business, industry);
  const answerers = [...entities, ...otherEntities(business, industry)];
  const queries = generated.map((q) => simulateAnswer(q, business, industry, answerers));
  const topics = topicStats(industry, queries, entities);

  const youBase = entityMetrics(YOU, business.name, queries);
  const topTopicsFor = (id: string) =>
    industry.topics
      .map((t) => {
        const qs = queries.filter((q) => q.topic === t.id);
        return { t, rate: qs.length ? qs.filter((q) => q.ranking.some((x) => x.id === id && x.position <= 3)).length / qs.length : 0 };
      })
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 3)
      .map((x) => x.t.label);

  const you: EntityMetrics = { ...youBase, topTopics: topTopicsFor(YOU), edges: [] };

  const competitors: EntityMetrics[] = business.competitors
    .map((c) => {
      const base = entityMetrics(c.id, c.name, queries);
      const edgeTopics = topics
        .map((t) => {
          const qs = queries.filter((q) => q.topic === t.topic.id);
          const theirs = qs.filter((q) => q.ranking.some((x) => x.id === c.id && x.position <= 3)).length / (qs.length || 1);
          return { t, diff: theirs - t.recommendationRate, theirs };
        })
        .filter((x) => x.diff > 0.15)
        .sort((a, b) => b.diff - a.diff)
        .slice(0, 2);
      const r = rng(business.id, c.id, "edges");
      const edges = edgeTopics.flatMap((x, i) => {
        const mult = x.t.recommendationRate > 0 ? x.theirs / x.t.recommendationRate : null;
        const headline = mult && mult < 10
          ? `Recommended ${mult.toFixed(1)}× more often for ${x.t.topic.phrase}`
          : `Owns ${x.t.topic.phrase} — you're not recommended there`;
        return i === 0 ? [headline, pick(x.t.topic.winSignals, r)] : [headline];
      });
      return { ...base, topTopics: topTopicsFor(c.id), edges };
    })
    .sort((a, b) => b.score - a.score);

  return {
    business,
    industry,
    queries,
    you,
    competitors,
    topics,
    opportunities: buildOpportunities(business, topics, queries.length, statuses),
    trend: buildTrend(business, you.score),
    story: buildStory(business, you, competitors),
    insights: buildInsights(business, topics),
  };
}
