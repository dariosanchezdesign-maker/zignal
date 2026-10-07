import type { Business, CommercialValue, Difficulty, IntentType, Query } from "../model/types";
import type { IndustryConfig, QueryTemplate, VarOption } from "../industries/types";
import { getIndustry, getSubcategory } from "../industries";
import { DEFAULT_MARKET, nearbyAreas } from "../locations";
import { rng } from "./random";

/**
 * Query generation: industry templates × variables × geography.
 * Deterministic for a business, so the same business always tests the same
 * query set (a requirement for comparing simulations over time).
 */

export const TARGET_QUERY_COUNT = 60;

/** How close each intent is to a purchase decision (0–100). */
export const INTENT_WEIGHT: Record<IntentType, number> = {
  discovery: 20,
  "best-of": 45,
  comparison: 45,
  problem: 55,
  local: 65,
  "high-intent": 85,
  transactional: 100,
};

export const INTENT_LABEL: Record<IntentType, string> = {
  discovery: "Discovery",
  "best-of": "Best-of",
  comparison: "Comparison",
  local: "Local",
  problem: "Problem-based",
  "high-intent": "High intent",
  transactional: "Transactional",
};

export const COMMERCIAL_LABEL: Record<CommercialValue, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  "very-high": "Very high",
};

export function commercialValue(weight: number): CommercialValue {
  if (weight >= 85) return "very-high";
  if (weight >= 60) return "high";
  if (weight >= 35) return "medium";
  return "low";
}

const HIGH_VALUE_ATTRS = new Set(["luxury", "investment", "commercial", "advisory", "act-60"]);

function locationOptions(business: Business, scope: QueryTemplate["scope"]): string[] {
  const near = nearbyAreas(business.location);
  if (scope === "local") return [business.location, ...near.slice(0, 2)];
  if (scope === "broad") return [DEFAULT_MARKET.region, "San Juan"];
  return [business.location, DEFAULT_MARKET.region, near[0]].filter((v, i, a) => a.indexOf(v) === i);
}

interface Combo {
  location: string;
  picks: Record<string, VarOption>;
}

function combos(template: QueryTemplate, vars: Record<string, VarOption[]>, locations: string[]): Combo[] {
  const keys = Array.from(template.text.matchAll(/\{(\w+)\}/g))
    .map((m) => m[1])
    .filter((k) => k !== "location");
  let out: Combo[] = (template.text.includes("{location}") ? locations : [""]).map((location) => ({ location, picks: {} }));
  for (const key of keys) {
    const options = vars[key] ?? [];
    out = out.flatMap((c) => options.map((o) => ({ location: c.location, picks: { ...c.picks, [key]: o } })));
  }
  return out;
}

function shuffle<T>(items: T[], r: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function difficultyFor(intent: IntentType, geography: string, attrs: string[]): Difficulty {
  let d = 0;
  if (geography === DEFAULT_MARKET.region) d += 1; // broad, crowded answers
  if (intent === "best-of" || intent === "comparison") d += 1;
  if (attrs.length >= 2) d -= 1; // niche asks are easier to win
  return d >= 2 ? "high" : d >= 1 ? "medium" : "low";
}

export function generateQueries(business: Business, target = TARGET_QUERY_COUNT): Query[] {
  const industry: IndustryConfig = getIndustry(business.industry);
  const sub = getSubcategory(industry, business.subcategory);
  const vars = { ...industry.vars, ...(sub.vars ?? {}) };
  const templates = industry.templates.filter((t) => t.groups.includes(sub.group));

  const pools = templates.map((t) => ({
    template: t,
    combos: shuffle(combos(t, vars, locationOptions(business, t.scope)), rng(business.id, t.id)),
  }));

  const seen = new Set<string>();
  const out: Query[] = [];
  for (let pass = 0; out.length < target && pools.some((p) => p.combos.length > pass); pass++) {
    for (const { template, combos: list } of pools) {
      if (out.length >= target) break;
      const combo = list[pass];
      if (!combo) continue;

      let text = template.text.replace("{location}", combo.location);
      for (const [k, v] of Object.entries(combo.picks)) text = text.replace(`{${k}}`, v.value);
      text = text.charAt(0).toUpperCase() + text.slice(1);
      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const varAttrs = Object.values(combo.picks).flatMap((o) => o.attrs ?? []);
      const attributes = Array.from(new Set([...varAttrs, ...(template.attrs ?? [])]));
      const persona = Object.values(combo.picks).find((o) => o.persona)?.persona ?? template.persona;
      const geography = combo.location || business.location;
      const category = varAttrs.map((a) => industry.attrCategory[a]).find(Boolean) ?? template.category;
      const weight = Math.min(100, INTENT_WEIGHT[template.intent] + (attributes.some((a) => HIGH_VALUE_ATTRS.has(a)) ? 8 : 0));

      out.push({
        id: `${template.id}-${pass + 1}`,
        text,
        industry: business.industry,
        geography,
        intent_type: template.intent,
        funnel_stage: template.funnel,
        customer_persona: persona,
        commercial_value: commercialValue(weight),
        commercial_weight: weight,
        difficulty: difficultyFor(template.intent, geography, attributes),
        template_id: template.id,
        category,
        attributes,
      });
    }
  }
  return out;
}
