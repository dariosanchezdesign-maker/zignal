import type { AIRun, Recommendation } from "../model/types";
import type { IndustryConfig } from "../industries/types";
import { REPUTATION_PHRASE, confidenceFor } from "./simulate";

/**
 * Extraction: turns a raw assistant response into structured recommendations.
 * Works on text only, so the same code path applies to live responses.
 * The raw response is never modified.
 */

export interface KnownEntity {
  id: string;
  name: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function matchEntity(name: string, known: KnownEntity[]): { id: string | null; exact: boolean } {
  const n = norm(name);
  const exact = known.find((k) => norm(k.name) === n);
  if (exact) return { id: exact.id, exact: true };
  const partial = known.find((k) => n.includes(norm(k.name)) || norm(k.name).includes(n));
  return { id: partial?.id ?? null, exact: false };
}

export function extractRationale(text: string, industry: IndustryConfig): string[] {
  const out: string[] = [];
  for (const a of industry.attributes) if (text.includes(a.prose)) out.push(a.rationale);
  const loc = text.match(/Its (.+?) location is a plus/);
  if (loc) out.push(`${loc[1]} location`);
  if (text.includes(REPUTATION_PHRASE)) out.push("Positive reputation signals");
  return out;
}

export function extractRecommendations(run: AIRun, known: KnownEntity[], industry: IndustryConfig): Recommendation[] {
  const recs: Recommendation[] = [];
  const source = run.mode === "live" ? "live_response" : "simulated_response";

  for (const line of run.raw_response.split("\n")) {
    const listed = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*\s+—\s+(.*)$/);
    if (listed) {
      const position = Number(listed[1]);
      const match = matchEntity(listed[2], known);
      recs.push({
        id: `${run.id}:r${position}`,
        ai_run_id: run.id,
        business_name: listed[2],
        matched_business_id: match.id,
        mentioned: true,
        recommended: true,
        position,
        rationale: extractRationale(listed[3], industry),
        confidence: Math.round(confidenceFor(position) * (match.exact ? 1 : 0.7) * 100) / 100,
        source_type: source,
      });
      continue;
    }
    const also = line.match(/^You could also look at (.+?), which/);
    if (also) {
      also[1]
        .split(/, | and /)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((name, i) => {
          const match = matchEntity(name, known);
          recs.push({
            id: `${run.id}:m${i + 1}`,
            ai_run_id: run.id,
            business_name: name,
            matched_business_id: match.id,
            mentioned: true,
            recommended: false,
            position: null,
            rationale: [],
            confidence: confidenceFor(null),
            source_type: source,
          });
        });
    }
  }
  return recs;
}
