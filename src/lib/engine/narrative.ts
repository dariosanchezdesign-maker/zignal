import type { Association, Business, EntityMetrics, Insight, QueryOutcome } from "../model/types";
import type { IndustryConfig } from "../industries/types";
import { getCategoryLabel } from "../industries";
import { HIGH_INTENT_MIN_WEIGHT } from "./metrics";
import { YOU } from "./insights";

export interface Narrative {
  tone: "leading" | "contender" | "behind";
  headline: string;
  strengths: string;
  opportunity: string;
  highIntentWarning: string | null;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** Plain-language summary generated from metrics, perception and insights. */
export function buildNarrative(args: {
  business: Business;
  industry: IndustryConfig;
  you: EntityMetrics;
  competitors: EntityMetrics[];
  perception: Record<string, Association[]>;
  insights: Insight[];
  outcomes: QueryOutcome[];
}): Narrative {
  const { business, industry, you, competitors, perception, insights, outcomes } = args;
  const top = competitors[0];
  const tone: Narrative["tone"] = !top || you.score >= top.score ? "leading" : you.score >= top.score - 18 ? "contender" : "behind";

  const strong = (perception[YOU] ?? []).filter((a) => a.strength >= 40).slice(0, 2).map((a) => a.label.toLowerCase());

  // Category where competitors most outperform you on high-value queries.
  const hi = outcomes.filter((o) => o.query.commercial_weight >= HIGH_INTENT_MIN_WEIGHT);
  const byCat = new Map<string, { n: number; you: number; best: Map<string, number> }>();
  for (const o of hi) {
    const c = byCat.get(o.query.category) ?? { n: 0, you: 0, best: new Map() };
    c.n++;
    if (o.you?.recommended) c.you++;
    if (o.winner?.matched_business_id && o.winner.matched_business_id !== YOU) {
      c.best.set(o.winner.business_name, (c.best.get(o.winner.business_name) ?? 0) + 1);
    }
    byCat.set(o.query.category, c);
  }
  const weakest = [...byCat.entries()].filter(([, c]) => c.n >= 2).sort((a, b) => a[1].you / a[1].n - b[1].you / b[1].n)[0];
  const weakestLeader = weakest ? [...weakest[1].best.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] : undefined;

  let strengths = strong.length ? `You're most strongly associated with ${list(strong)}` : "AI doesn't strongly associate you with any one theme yet";
  if (weakest) {
    const label = getCategoryLabel(industry, weakest[0]).toLowerCase();
    strengths += `, but ${weakestLeader ?? "competitors"} ${weakestLeader ? "outperforms" : "outperform"} you on high-intent ${label} queries.`;
  } else strengths += ".";

  const first = insights.find((i) => i.status !== "completed");
  return {
    tone,
    headline: `AI currently recommends ${business.name} in ${pct(you.recommendation_rate)} of relevant queries.`,
    strengths,
    opportunity: first ? `Your biggest opportunity: ${lowerFirst(first.title)}.` : "You've completed every open opportunity. Run a new simulation to measure the change.",
    highIntentWarning:
      you.high_intent_visibility < you.recommendation_rate - 0.06
        ? you.recommendation_rate >= 0.45
          ? "Your visibility is solid overall, but you're underperforming on the queries closest to a purchase decision."
          : "Your visibility is limited overall, and weakest on the queries closest to a purchase decision."
        : null,
  };
}
