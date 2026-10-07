import type { Association, QueryOutcome } from "../model/types";
import type { IndustryConfig } from "../industries/types";

/**
 * AI perception: which attributes the AI credits a business with, measured
 * from the rationale it gave when recommending it.
 *
 * strength = share of relevant queries (queries asking for the attribute)
 * where AI recommended the business and cited the attribute (75%), blended
 * with the share of all its recommendations that cite it (25%). Attributes
 * with fewer than 3 relevant queries use only the second measure.
 */
export function associations(entityId: string, outcomes: QueryOutcome[], industry: IndustryConfig): Association[] {
  const recFor = (o: QueryOutcome) => o.recommendations.find((r) => r.matched_business_id === entityId && r.recommended);
  const recommendedCount = outcomes.filter(recFor).length;

  return industry.attributes
    .map((attr) => {
      const relevant = outcomes.filter((o) => o.query.attributes.includes(attr.id));
      const cites = (o: QueryOutcome) => !!recFor(o)?.rationale.includes(attr.rationale);
      const citedRelevant = relevant.filter(cites).length;
      const citations = outcomes.filter(cites).length;
      const overall = recommendedCount ? citations / recommendedCount : 0;
      const strength = relevant.length >= 3 ? 0.75 * (citedRelevant / relevant.length) + 0.25 * overall : overall;
      return {
        attribute: attr.id,
        label: attr.label,
        strength: Math.round(strength * 100),
        citations,
        relevantQueries: relevant.length,
      };
    })
    .sort((a, b) => b.strength - a.strength);
}

export function splitAssociations(list: Association[]) {
  const strong = list.filter((a) => a.strength >= 45).slice(0, 4);
  const weak = list
    .filter((a) => a.relevantQueries >= 2 && a.strength < 25)
    .sort((a, b) => b.relevantQueries - a.relevantQueries)
    .slice(0, 4);
  return { strong, weak };
}
