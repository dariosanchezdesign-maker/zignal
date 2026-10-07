import type { Level, ScanResult, Topic } from "../types";
import { getCategory } from "../industries";
import { clamp, pickN, rng } from "./random";
import { YOU } from "./scan";

export interface PerceptionAnswer {
  question: string;
  understanding: string;
  verdict: string;
  likelihood: number; // 0..100
  likelihoodLabel: Level;
  topics: Topic[];
  strengths: string[];
  weaknesses: string[];
  missing: string[];
  competitors: { name: string; reason: string; rate: number }[];
}

const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

/**
 * Reveals how AI perceives the business for a free-form question.
 * Matches the question onto industry topics, then explains the evidence AI has
 * (and lacks) using the scan results.
 */
export function askAboutBusiness(scan: ScanResult, question: string): PerceptionAnswer {
  const { business, industry } = scan;
  const q = question.toLowerCase();
  const category = getCategory(industry, business.category);

  let matched = industry.topics.filter((t) => t.keywords.some((k) => q.includes(k)));
  if (!matched.length) matched = [industry.topics[0]];
  matched = matched.slice(0, 3);

  const stats = scan.topics.filter((t) => matched.some((m) => m.id === t.topic.id));
  const rate = stats.length ? stats.reduce((a, s) => a + s.recommendationRate, 0) / stats.length : scan.you.recommendationRate;
  const strength =
    matched.reduce((a, t) => a + (business.topicStrength[t.id] ?? 0.4), 0) / matched.length;
  const likelihood = Math.round(clamp(0.08 + 0.5 * rate + 0.45 * strength, 0.04, 0.96) * 100);
  const likelihoodLabel: Level = likelihood >= 65 ? "high" : likelihood >= 40 ? "medium" : "low";

  const r = rng(business.id, q);
  const sortedTopics = [...scan.topics].sort((a, b) => b.recommendationRate - a.recommendationRate);
  const knownFor = sortedTopics.slice(0, 2).map((t) => t.topic.phrase);
  const unclear = sortedTopics.slice(-2).map((t) => t.topic.phrase);
  const topicPhrase = matched.map((t) => t.phrase).join(" and ");

  const understanding = `${business.name} is a ${category.noun} in ${business.location}, ${
    business.primaryService ? `focused on ${business.primaryService.toLowerCase()}` : "serving local customers"
  }. AI associates it most with ${knownFor.join(" and ")}. It has a less clear picture of the business when it comes to ${unclear.join(
    " and ",
  )}.`;

  const verdict =
    likelihoodLabel === "high"
      ? `Likely. AI has enough evidence to recommend ${business.name} for ${topicPhrase}, usually among its top options.`
      : likelihoodLabel === "medium"
        ? `Sometimes. AI may mention ${business.name} for ${topicPhrase}, but it usually recommends a competitor first.`
        : `Unlikely. When asked about ${topicPhrase}, AI rarely brings up ${business.name} — it doesn't have enough evidence to.`;

  const vars = { city: business.location, region: "Puerto Rico" };
  const strengths = [
    ...matched.filter((t) => (business.topicStrength[t.id] ?? 0) >= 0.55).map((t) => t.winSignals[0]),
    ...pickN(industry.strengths.map((s) => fill(s, vars)), 3, r),
  ].slice(0, 3);

  const weakTopics = matched.filter((t) => (business.topicStrength[t.id] ?? 0) < 0.55);
  const weaknesses = [
    ...weakTopics.map((t) => `Not clearly associated with ${t.phrase}`),
    ...weakTopics.map((t) => `Lacks ${t.winSignals[0].charAt(0).toLowerCase()}${t.winSignals[0].slice(1)}`),
    ...(likelihoodLabel === "high" ? [] : ["Fewer third-party mentions than the businesses it recommends"]),
    ...(rate < 0.5 ? ["Competitors have more specific content on this topic"] : []),
  ].slice(0, 3);
  if (!weaknesses.length) weaknesses.push("Recent press coverage is thinner than your main competitor's");

  const missing = pickN(industry.missingInfo, 3, r);

  const competitorRates = business.competitors
    .map((c) => {
      const qs = scan.queries.filter((qq) => matched.some((m) => m.id === qq.topic));
      const cr = qs.length ? qs.filter((qq) => qq.ranking.some((x) => x.id === c.id && x.position <= 3)).length / qs.length : 0;
      const sig = matched[0].winSignals[Math.floor(r() * matched[0].winSignals.length)];
      return { name: c.name, rate: cr, reason: sig };
    })
    .filter((c) => c.rate > 0)
    .sort((a, b) => b.rate - a.rate);

  // Mentioned competitor in the question gets surfaced first.
  const named = competitorRates.find((c) => q.includes(c.name.toLowerCase().split(" ")[0]));
  const competitors = [
    ...(named ? [named] : []),
    ...competitorRates.filter((c) => c !== named),
  ].slice(0, 3);

  return {
    question,
    understanding,
    verdict,
    likelihood,
    likelihoodLabel,
    topics: matched,
    strengths,
    weaknesses,
    missing,
    competitors,
  };
}

export function askExamples(scan: ScanResult): string[] {
  const category = getCategory(scan.industry, scan.business.category);
  const competitor = scan.competitors[0]?.name ?? "a competitor";
  return scan.industry.askExamples.map((e) =>
    fill(e, { name: scan.business.name, city: scan.business.location, noun: category.noun, competitor }),
  );
}

export { YOU };
