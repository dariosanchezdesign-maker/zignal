import type {
  AIRun,
  Association,
  Business,
  Competitor,
  EntityMetrics,
  Insight,
  InsightStatus,
  Query,
  QueryOutcome,
  Recommendation,
  Severity,
  SignalProfile,
  Simulation,
  Snapshot,
} from "../model/types";
import type { IndustryConfig } from "../industries/types";
import { getIndustry } from "../industries";
import { generateQueries } from "./queries";
import { rankQuery, simulateRun, SIM_MODEL, SIM_PROVIDER } from "./simulate";
import { extractRecommendations, type KnownEntity } from "./extract";
import { computeMetrics, type Observation } from "./metrics";
import { associations } from "./perception";
import { generateInsights, YOU } from "./insights";
import { buildNarrative, type Narrative } from "./narrative";
import { clamp } from "./random";

/** What gets persisted for a workspace (a backend would store the same). */
export interface WorkspaceRecord {
  business: Business;
  competitors: Competitor[];
  /** Simulation state: hidden signal model per entity ("you", competitors, others). */
  signals: SignalProfile[];
  /** Days of simulated monitoring history before the baseline (demo only). */
  history_days: number;
  baseline_date: string;
  manual_runs: string[]; // ISO dates of user-triggered simulations
}

export interface InsightState {
  status: InsightStatus;
  /** Index of the latest simulation when the work was marked completed. */
  completed_at_index?: number;
  /** Attributes the completed action strengthens in later simulations. */
  targets?: string[];
  /** Copy of the insight, kept so completed work stays visible after the gap closes. */
  snapshot?: Insight;
}

export interface Workspace {
  record: WorkspaceRecord;
  business: Business;
  competitors: Competitor[];
  industry: IndustryConfig;
  queries: Query[];
  simulations: Simulation[];
  latest: Simulation;
  runs: AIRun[];
  recommendations: Recommendation[];
  outcomes: QueryOutcome[];
  you: EntityMetrics;
  competitorMetrics: EntityMetrics[];
  perception: Record<string, Association[]>;
  insights: Insight[];
  history: Snapshot[];
  narrative: Narrative;
}

const DAY = 86400000;

/** Signals in effect for simulation `index`: drift for history, boosts for completed work. */
function effectiveSignals(record: WorkspaceRecord, index: number, state: Record<string, InsightState>): SignalProfile[] {
  return record.signals.map((s) => {
    if (s.entity_id !== YOU) return s;
    const drift = index < 0 ? 0.0009 * index : 0;
    const attributes: Record<string, number> = {};
    for (const [k, v] of Object.entries(s.attributes)) attributes[k] = clamp(v + drift, 0.05, 0.97);
    let authority = clamp(s.authority + drift * 0.6, 0.05, 0.97);
    for (const [id, st] of Object.entries(state)) {
      if (st.status !== "completed" || st.completed_at_index === undefined || index <= st.completed_at_index) continue;
      for (const attr of st.targets ?? []) {
        if (attr === "__authority") authority = clamp(authority + 0.06, 0, 0.97);
        else attributes[attr] = clamp((attributes[attr] ?? 0.3) + 0.15, 0, 0.95);
      }
    }
    return { ...s, attributes, authority };
  });
}

export function simulationsFor(record: WorkspaceRecord): Simulation[] {
  const base = new Date(record.baseline_date).getTime();
  const sims: Simulation[] = [];
  const step = 3; // scheduled re-runs every 3 days
  for (let k = -record.history_days; k <= 0; k += step) {
    sims.push({
      id: `${record.business.id}:sim${k}`,
      business_id: record.business.id,
      index: k,
      run_date: new Date(base + k * DAY).toISOString(),
      mode: "simulated",
      provider: SIM_PROVIDER,
      model: SIM_MODEL,
      query_count: 0,
      trigger: k === 0 ? "baseline" : "scheduled",
    });
  }
  record.manual_runs.forEach((date, i) =>
    sims.push({
      id: `${record.business.id}:sim${i + 1}`,
      business_id: record.business.id,
      index: i + 1,
      run_date: date,
      mode: "simulated",
      provider: SIM_PROVIDER,
      model: SIM_MODEL,
      query_count: 0,
      trigger: "manual",
    }),
  );
  return sims;
}

export function queryOpportunity(q: Query, you: Recommendation | null): Severity {
  const valuable = q.commercial_weight >= 60;
  if (!you?.recommended) return valuable ? "high" : "medium";
  if ((you.position ?? 9) >= 3) return valuable ? "medium" : "low";
  return "low";
}

export function buildWorkspace(record: WorkspaceRecord, state: Record<string, InsightState>): Workspace {
  const { business, competitors } = record;
  const industry = getIndustry(business.industry);
  const queries = generateQueries(business);
  const simulations = simulationsFor(record).map((s) => ({ ...s, query_count: queries.length }));
  const latest = simulations[simulations.length - 1];
  const categories = industry.categories.map((c) => c.id);

  // Monitoring history: ranking-only fast path for older simulations.
  const history: Snapshot[] = simulations.slice(0, -1).map((sim) => {
    const ents = effectiveSignals(record, sim.index, state);
    const obs: Observation[] = queries.map((q) => {
      const { listed, mentioned } = rankQuery(q, ents, sim.index, business.id);
      return { query: q, ranked: listed.map((x) => x.entity.entity_id), mentioned: mentioned.map((x) => x.entity.entity_id) };
    });
    const m = computeMetrics(YOU, business.name, obs, categories);
    return { simulation: sim, score: m.score, recommendation_rate: m.recommendation_rate, share_of_voice: m.share_of_voice };
  });

  // Latest simulation: full runs → raw responses → extraction.
  const entities = effectiveSignals(record, latest.index, state);
  const known: KnownEntity[] = entities.map((e) => ({ id: e.entity_id, name: e.name }));
  const runs = queries.map((q) =>
    simulateRun({ business, industry, query: q, entities, index: latest.index, simulationId: latest.id, runDate: latest.run_date }),
  );
  const recsByRun = runs.map((run) => extractRecommendations(run, known, industry));
  const recommendations = recsByRun.flat();

  const outcomes: QueryOutcome[] = queries.map((q, i) => {
    const recs = recsByRun[i];
    const you = recs.find((r) => r.matched_business_id === YOU) ?? null;
    return {
      query: q,
      run: runs[i],
      recommendations: recs,
      you,
      winner: recs.find((r) => r.position === 1) ?? recs[0],
      opportunity: queryOpportunity(q, you),
    };
  });

  const observations: Observation[] = outcomes.map((o) => ({
    query: o.query,
    ranked: o.recommendations
      .filter((r) => r.recommended)
      .sort((a, b) => (a.position ?? 9) - (b.position ?? 9))
      .map((r) => r.matched_business_id ?? `unmatched:${r.business_name}`),
    mentioned: o.recommendations.filter((r) => !r.recommended).map((r) => r.matched_business_id ?? `unmatched:${r.business_name}`),
  }));

  const you = computeMetrics(YOU, business.name, observations, categories);
  history.push({ simulation: latest, score: you.score, recommendation_rate: you.recommendation_rate, share_of_voice: you.share_of_voice });
  const competitorMetrics = competitors
    .map((c) => computeMetrics(c.id, c.name, observations, categories))
    .sort((a, b) => b.score - a.score);

  const perception: Record<string, Association[]> = { [YOU]: associations(YOU, outcomes, industry) };
  competitors.forEach((c) => (perception[c.id] = associations(c.id, outcomes, industry)));

  const statuses: Record<string, InsightStatus> = {};
  for (const [id, st] of Object.entries(state)) statuses[id] = st.status;
  const generated = generateInsights({ business, industry, outcomes, observations, you, competitors: competitorMetrics, perception, statuses });
  const kept = Object.values(state)
    .filter((st) => st.status === "completed" && st.snapshot && !generated.some((g) => g.id === st.snapshot!.id))
    .map((st) => ({ ...st.snapshot!, status: "completed" as const }));
  const insights = [...generated, ...kept];

  const narrative = buildNarrative({ business, industry, you, competitors: competitorMetrics, perception, insights, outcomes });

  return {
    record,
    business,
    competitors,
    industry,
    queries,
    simulations,
    latest,
    runs,
    recommendations,
    outcomes,
    you,
    competitorMetrics,
    perception,
    insights,
    history,
    narrative,
  };
}

