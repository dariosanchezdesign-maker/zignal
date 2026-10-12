import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { CONFIG } from "./config";
import type { ExtractedBusiness, ExtractionRecord, Question, RunRecord } from "./types";

// Turns a raw answer into structured records. The raw answer is never
// changed; extraction output is stored separately so it can be re-run.

const ExtractionSchema = z.object({
  businesses: z.array(
    z.object({
      name: z.string(),
      status: z.enum(["recommended", "mentioned"]),
      position: z.number().int().nullable(),
      reasons: z.array(z.string()),
      area: z.string().nullable(),
    }),
  ),
});

const INSTRUCTIONS = `You are extracting data from an AI assistant's answer to a customer's question, for a research index of which local businesses AI recommends.

List every specific, named business in the answer: hotels, restaurants, bars, tour operators, spas and similar. Do not list neighborhoods, beaches, landmarks, public parks or attractions that are not businesses, chains mentioned only generically, or booking websites.

For each business:
- name: as written in the answer, without added words.
- status: "recommended" if the answer presents it as an option to choose; "mentioned" if it is only named (for example as a comparison, a warning, or background).
- position: the order in which recommended businesses appear, starting at 1. null for "mentioned".
- reasons: the short reasons the answer gives for choosing it, as brief English phrases (at most 4). Empty if none are given. Only include reasons stated in the answer.
- area: the neighborhood or town the answer associates with it, or null.

Return an empty list if the answer names no businesses.`;

export async function extractWithClaude(run: RunRecord, question: Question): Promise<ExtractionRecord> {
  const client = new Anthropic({ timeout: CONFIG.requestTimeoutMs });
  const response = await client.beta.messages.parse({
    model: CONFIG.extractorModel,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: zodOutputFormat(ExtractionSchema) },
    system: INSTRUCTIONS,
    messages: [
      {
        role: "user",
        content: `Customer question:\n${question.text}\n\nAI answer:\n<answer>\n${run.raw_response}\n</answer>`,
      },
    ],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`Extraction failed for ${run.run_id} (stop_reason: ${response.stop_reason})`);
  }
  return {
    run_id: run.run_id,
    extractor: `claude:${response.model}`,
    extracted_at: new Date().toISOString(),
    businesses: response.parsed_output.businesses,
  };
}

/**
 * No-key fallback: reads numbered or bulleted lists with a name at the start
 * of each item. Less accurate than Claude extraction on free-form answers.
 */
export function extractHeuristic(run: RunRecord): ExtractionRecord {
  const businesses: ExtractedBusiness[] = [];
  const seen = new Set<string>();
  let position = 0;
  for (const line of run.raw_response.split("\n")) {
    const m = line.match(/^\s*(?:\d+[.)]|[-*•])\s+(?:\*\*)?([^*\n:–—(]{2,60}?)(?:\*\*)?\s*(?:[:–—(-]|$)/);
    if (!m) continue;
    const name = m[1].trim().replace(/\s+/g, " ");
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const rest = line.slice(line.indexOf(m[1]) + m[1].length);
    const reasons = (rest.match(/(?:known for|for|ideal for|conocido por)\s+([^.]+)/i)?.[1] ?? "")
      .split(/,| and | y /)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
    businesses.push({ name, status: "recommended", position: ++position, reasons, area: null });
  }
  const also = run.raw_response.match(/(?:also consider|could also look at|también podrías considerar)\s+([^.\n]+)/i);
  if (also) {
    // Split on commas and English "and" only: Spanish "y" also appears inside names ("Sal y Humo").
    for (const name of also[1].split(/,\s*|\s+and\s+/).map((s) => s.trim().replace(/\*\*/g, "")).filter(Boolean)) {
      if (!seen.has(name.toLowerCase())) businesses.push({ name, status: "mentioned", position: null, reasons: [], area: null });
    }
  }
  return { run_id: run.run_id, extractor: "heuristic", extracted_at: new Date().toISOString(), businesses };
}
