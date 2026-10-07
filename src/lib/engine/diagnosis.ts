import type { Insight, QueryOutcome } from "../model/types";
import { YOU } from "./insights";

/**
 * Per-query interpretation. Built only from the extracted recommendations
 * (who was ranked where, and the reasons the AI stated). Shown in the UI as
 * an AI-generated diagnosis, never as objective fact.
 */
export interface QueryDiagnosis {
  status: "won" | "lost" | "mentioned" | "absent";
  title: string;
  points: string[];
  meaning: string;
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function diagnoseOutcome(o: QueryOutcome, businessName: string, insights: Insight[]): QueryDiagnosis {
  const you = o.you;
  const winner = o.winner;
  const yours = new Set(you?.rationale ?? []);
  const linked = insights.find((i) => i.query_ids.includes(o.query.id) && i.status !== "completed");
  const value = o.query.commercial_value === "very-high" || o.query.commercial_value === "high" ? "high-value" : "lower-value";
  const link = linked ? ` It is evidence for the opportunity “${linked.title}”.` : "";

  if (you?.position === 1) {
    const challenger = o.recommendations.find((r) => r.recommended && r.position === 2);
    const their = (challenger?.rationale ?? []).filter((r) => !yours.has(r));
    return {
      status: "won",
      title: challenger ? `How ${challenger.business_name} could overtake you` : "Why you're the top pick",
      points: their.length
        ? their.map((r) => `${challenger!.business_name} is credited with ${lower(r)}, which AI didn't cite for you`)
        : ["AI cites the same strengths for your closest challenger. Keep your content and reviews current."],
      meaning: `You're AI's first recommendation for this ${value} question.${link}`,
    };
  }

  const advantages = winner.rationale.filter((r) => !yours.has(r));
  const points = advantages.map((r) =>
    r === "Positive reputation signals"
      ? `${winner.business_name} has stronger reputation signals (reviews and press)`
      : r.endsWith(" location")
        ? `${winner.business_name}'s ${r.replace(/ location$/, "")} location matches the question more closely`
        : `${winner.business_name} is credited with ${lower(r)}${you ? "; you aren't" : ""}`,
  );
  if (!points.length) points.push(`AI ranks ${winner.business_name} first despite citing similar strengths, likely on overall authority`);

  if (you?.recommended) {
    return {
      status: "lost",
      title: `Why you lost #1 to ${winner.business_name}`,
      points,
      meaning: `You're recommended at #${you.position} for this ${value} question, behind ${winner.business_name}.${link}`,
    };
  }
  if (you) {
    return {
      status: "mentioned",
      title: "Why AI mentioned you without recommending you",
      points,
      meaning: `AI knows ${businessName} is an option here but didn't recommend it.${link}`,
    };
  }
  return {
    status: "absent",
    title: `Why ${winner.business_name} was recommended instead`,
    points,
    meaning: `${businessName} doesn't appear in this answer at all.${link}`,
  };
}

export { YOU };
