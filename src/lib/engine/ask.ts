import type { Severity as Level } from "../model/types";
import type { AttributeDef } from "../industries/types";
import { getSubcategory } from "../industries";
import type { Workspace } from "./workspace";
import { YOU } from "./insights";
import { pickN, rng, clamp } from "./random";

export interface PerceptionAnswer {
  question: string;
  understanding: string;
  verdict: string;
  likelihood: number; // 0–100
  likelihoodLabel: Level;
  attributes: AttributeDef[];
  basedOn: { queries: number; recommended: number };
  strengths: string[];
  weaknesses: string[];
  missing: string[];
  competitors: { name: string; reason: string; rate: number }[];
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

/**
 * "Ask AI about my business": maps a free-form question onto the attributes
 * it asks about, then answers from the simulated recommendation records for
 * matching queries (never from invented facts).
 */
export function askAboutBusiness(ws: Workspace, question: string): PerceptionAnswer {
  const { business, industry, outcomes, perception } = ws;
  const q = question.toLowerCase();
  const sub = getSubcategory(industry, business.subcategory);

  let attrs = industry.attributes.filter((a) => a.keywords.some((k) => q.includes(k)));
  if (!attrs.length) {
    // Generic question: use what AI associates with the business most.
    attrs = (perception[YOU] ?? []).slice(0, 2).map((a) => industry.attributes.find((x) => x.id === a.attribute)!);
  }
  attrs = attrs.slice(0, 3);

  const relevant = outcomes.filter((o) => o.query.attributes.some((a) => attrs.some((x) => x.id === a)));
  const base = relevant.length ? relevant : outcomes;
  const recommended = base.filter((o) => o.you?.recommended).length;
  const rate = recommended / base.length;
  const mine = perception[YOU] ?? [];
  const assoc = attrs.reduce((a, x) => a + (mine.find((m) => m.attribute === x.id)?.strength ?? 0), 0) / (attrs.length || 1) / 100;
  const likelihood = Math.round(clamp(0.65 * rate + 0.35 * assoc, 0.03, 0.97) * 100);
  const likelihoodLabel: Level = likelihood >= 60 ? "high" : likelihood >= 35 ? "medium" : "low";

  const strong = mine.filter((a) => a.strength >= 40).slice(0, 2).map((a) => a.label.toLowerCase());
  const weak = mine.filter((a) => a.relevantQueries >= 3 && a.strength < 25).slice(0, 2).map((a) => a.label.toLowerCase());
  const topic = attrs.map((a) => a.label.toLowerCase()).join(" and ");

  const understanding = `${business.name} is a ${sub.noun} in ${business.location}${business.services[0] ? ` offering ${business.services[0].toLowerCase()}` : ""}. In its answers, AI most often credits it with ${
    strong.length ? strong.join(" and ") : "its location"
  }${weak.length ? `, and rarely with ${weak.join(" or ")}` : ""}.`;

  const verdict =
    likelihoodLabel === "high"
      ? `Likely. AI recommended ${business.name} in ${recommended} of ${base.length} similar questions, usually near the top.`
      : likelihoodLabel === "medium"
        ? `Sometimes. AI recommended ${business.name} in ${recommended} of ${base.length} similar questions, often behind a competitor.`
        : `Unlikely. AI recommended ${business.name} in only ${recommended} of ${base.length} similar questions about ${topic}.`;

  const yourRationale = new Map<string, number>();
  base.forEach((o) => o.you?.rationale.forEach((r) => yourRationale.set(r, (yourRationale.get(r) ?? 0) + 1)));
  const strengths = [...yourRationale.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([r, n]) => `${r} (cited ${n}×)`);

  const weaknesses = attrs
    .filter((a) => (mine.find((m) => m.attribute === a.id)?.strength ?? 0) < 40)
    .map((a) => `Rarely credited with ${a.diagnosis}`);
  if (rate < 0.5) weaknesses.push(`Not recommended in ${base.length - recommended} of ${base.length} similar questions`);

  const competitors = ws.competitors
    .map((c) => {
      const n = base.filter((o) => o.recommendations.some((r) => r.matched_business_id === c.id && r.recommended)).length;
      const theirs = (perception[c.id] ?? []).find((a) => attrs.some((x) => x.id === a.attribute));
      return { name: c.name, rate: n / base.length, reason: theirs ? `${theirs.label} association ${theirs.strength}/100` : "Recommended for similar questions" };
    })
    .filter((c) => c.rate > 0)
    .sort((a, b) => b.rate - a.rate);
  if (!weaknesses.length && competitors[0]) {
    weaknesses.push(`${competitors[0].name} is also recommended in ${Math.round(competitors[0].rate * base.length)} of these ${base.length} questions`);
  }
  if (!weaknesses.length) weaknesses.push("No clear weakness for this kind of question");
  const named = competitors.find((c) => q.includes(c.name.toLowerCase().split(" ")[0]));
  const orderedComps = [...(named ? [named] : []), ...competitors.filter((c) => c !== named)].slice(0, 3);

  return {
    question,
    understanding,
    verdict,
    likelihood,
    likelihoodLabel,
    attributes: attrs,
    basedOn: { queries: base.length, recommended },
    strengths: strengths.length ? strengths : ["No recurring reasons yet. AI rarely recommends you for this."],
    weaknesses: weaknesses.slice(0, 3),
    missing: pickN(industry.missingInfo, 3, rng(business.id, q)),
    competitors: orderedComps,
  };
}

export function askExamples(ws: Workspace): string[] {
  const sub = getSubcategory(ws.industry, ws.business.subcategory);
  const competitor = ws.competitorMetrics[0]?.name ?? "a competitor";
  return ws.industry.askExamples.map((e) =>
    e.replace(/\{name\}/g, ws.business.name).replace(/\{competitor\}/g, competitor).replace(/\{noun\}/g, sub.noun).replace(/\{city\}/g, ws.business.location),
  );
}

export { pct };
