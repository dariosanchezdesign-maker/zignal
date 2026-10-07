import type { AIRun, Business, Query, SignalProfile } from "../model/types";
import type { IndustryConfig } from "../industries/types";
import { getAttribute } from "../industries";
import { nearbyAreas } from "../locations";
import { clamp, pick, rng } from "./random";

/**
 * Simulation engine. Stands in for querying real assistants until live
 * providers are connected. It models how assistants weigh relevance to what
 * the customer asked for, reputation and location, then writes a response in
 * natural language. Downstream code never reads the simulator's internals: it
 * extracts recommendations from `raw_response`, exactly as it will for live
 * answers.
 *
 * Deterministic: a (business, query, simulation index) triple always yields
 * the same answer. Each new simulation adds only small run-to-run variation.
 */

export const SIM_PROVIDER = "Zignal simulation engine";
export const SIM_MODEL = "GPT-style model (simulated)";

const INCLUDE = 0.555;
const MENTION = 0.47;
export const REPUTATION_PHRASE = "frequently cited in reviews and local press";

export interface RankedEntity {
  entity: SignalProfile;
  score: number;
}

export function relevance(e: SignalProfile, q: Query): number {
  const attrs = q.attributes.length ? q.attributes : Object.keys(e.attributes).slice(0, 3);
  return attrs.reduce((a, id) => a + (e.attributes[id] ?? 0.3), 0) / attrs.length;
}

function geoBoost(e: SignalProfile, q: Query): number {
  if (e.location === q.geography) return 0.05;
  if (nearbyAreas(e.location).includes(q.geography)) return 0.025;
  return 0;
}

export function scoreEntity(e: SignalProfile, q: Query, index: number, businessId: string): number {
  const stable = (rng(businessId, q.id, e.entity_id)() - 0.5) * 0.24;
  const jitter = (rng(businessId, q.id, e.entity_id, "run", index)() - 0.5) * 0.06;
  return 0.34 * e.authority + 0.66 * relevance(e, q) + geoBoost(e, q) + stable + jitter;
}

/** Fast path used for monitoring history: ranking only, no text. */
export function rankQuery(q: Query, entities: SignalProfile[], index: number, businessId: string) {
  const scored = entities
    .map((entity) => ({ entity, score: scoreEntity(entity, q, index, businessId) }))
    .sort((a, b) => b.score - a.score);
  let listed = scored.filter((x) => x.score >= INCLUDE).slice(0, 4);
  if (listed.length < 2) listed = scored.slice(0, 2);
  const mentioned = scored.filter((x) => !listed.includes(x) && x.score >= MENTION).slice(0, 2);
  return { listed, mentioned };
}

/** What the simulated assistant would say about a business for this query. */
function reasonsFor(e: SignalProfile, q: Query): { attrs: string[]; local: boolean; reputation: boolean } {
  const asked = [...q.attributes].filter((a) => (e.attributes[a] ?? 0) >= 0.5).sort((a, b) => (e.attributes[b] ?? 0) - (e.attributes[a] ?? 0));
  const known = Object.entries(e.attributes)
    .filter(([a, v]) => v >= 0.62 && !asked.includes(a))
    .sort((a, b) => b[1] - a[1])
    .map(([a]) => a);
  const attrs = [...asked.slice(0, 2), ...known].slice(0, 2);
  return { attrs: attrs.length ? attrs : known.slice(0, 1), local: geoBoost(e, q) >= 0.05, reputation: e.authority >= 0.62 };
}

const INTROS: Record<string, string[]> = {
  discovery: ["Here are a few good places to start:", "A few options come up consistently for this:"],
  "best-of": ["Here are some of the strongest options, based on reputation and what people consistently highlight:", "These are among the most frequently recommended options:"],
  comparison: ["Comparing the main options, these stand out:", "Here's how the leading options compare:"],
  local: ["Nearby options that fit what you're looking for:", "Close by, these are worth considering:"],
  problem: ["For this situation, these are good options to contact:", "These are well suited to what you describe:"],
  "high-intent": ["If I had to narrow it down, I'd look at these first:", "My top picks for this would be:"],
  transactional: ["You can book or contact these directly:", "These are good places to start booking:"],
};

const OUTROS = [
  "Availability, pricing and fit vary, so it's worth contacting a few of them directly.",
  "Check recent reviews and current pricing before deciding.",
  "Each has a different focus, so compare them against what matters most to you.",
];

function sentence(e: SignalProfile, q: Query, industry: IndustryConfig, r: () => number): string {
  const { attrs, local, reputation } = reasonsFor(e, q);
  const phrases = attrs.map((a) => getAttribute(industry, a).prose);
  const lead = pick(["Known for", "Stands out for", "Often recommended for"], r);
  let s = phrases.length ? `${lead} ${phrases.join(" and ")}.` : "A solid, well-rounded option.";
  if (local) s += ` Its ${e.location} location is a plus.`;
  if (reputation) s += ` It is ${REPUTATION_PHRASE}.`;
  return s;
}

function joinNames(names: string[]) {
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function simulateRun(args: {
  business: Business;
  industry: IndustryConfig;
  query: Query;
  entities: SignalProfile[];
  index: number;
  simulationId: string;
  runDate: string;
}): AIRun {
  const { business, industry, query, entities, index, simulationId, runDate } = args;
  const { listed, mentioned } = rankQuery(query, entities, index, business.id);
  const r = rng(business.id, query.id, "prose", index);

  const lines = [pick(INTROS[query.intent_type], r), ""];
  listed.forEach((x, i) => lines.push(`${i + 1}. **${x.entity.name}** — ${sentence(x.entity, query, industry, r)}`));
  if (mentioned.length) {
    lines.push("", `You could also look at ${joinNames(mentioned.map((m) => m.entity.name))}, which come up less often for this kind of request.`);
  }
  lines.push("", pick(OUTROS, r));

  return {
    id: `${simulationId}:${query.id}`,
    simulation_id: simulationId,
    query_id: query.id,
    business_id: business.id,
    mode: "simulated",
    provider: SIM_PROVIDER,
    model: SIM_MODEL,
    run_date: runDate,
    prompt: query.text,
    raw_response: lines.join("\n"),
    status: "completed",
  };
}

export const confidenceFor = (position: number | null) => (position ? clamp(0.94 - 0.07 * (position - 1), 0.5, 1) : 0.55);
