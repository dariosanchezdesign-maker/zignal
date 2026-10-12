import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ExtractionRecord, RunRecord, Study } from "./types";

// Aggregates extracted records into the index. Every figure is a count over
// stored runs, so each number can be traced back to raw answers.

export interface Observation {
  run: RunRecord;
  extraction: ExtractionRecord;
}

/** Folds spelling variants together: "The Condado Vanderbilt Hotel" ≈ "Condado Vanderbilt". */
export function businessKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(the|el|la|los|las)\b/g, " ")
    .replace(/\b(hotel|resort|and spa|spa|restaurant|restaurante|bar|inn|suites|san juan|puerto rico|pr)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Optional manual merges: { "Canonical Name": ["variant", ...] } in aliases/<study>.json. */
export function loadAliases(toolDir: string, study: Study): Map<string, string> {
  const file = path.join(toolDir, "aliases", `${study.study}.json`);
  const map = new Map<string, string>();
  if (!existsSync(file)) return map;
  const json = JSON.parse(readFileSync(file, "utf8")) as Record<string, string[]>;
  for (const [canonical, variants] of Object.entries(json)) {
    for (const v of [canonical, ...variants]) map.set(businessKey(v), businessKey(canonical));
  }
  return map;
}

interface Tally {
  key: string;
  names: Map<string, number>;
  recommended: number;
  mentioned: number;
  topPick: number;
  positions: number[];
  reasons: Map<string, number>;
  byCategory: Map<string, number>;
  byProvider: Map<string, number>;
  byLanguage: Map<string, number>;
  byQuestion: Map<string, number>;
}

export interface BusinessStats {
  key: string;
  name: string;
  recommended_runs: number;
  recommendation_rate: number;
  mention_rate: number;
  top_pick_rate: number;
  avg_position: number | null;
  share_of_voice: number;
  questions_recommended: number;
  consistency: number; // avg share of a question's runs it appears in, where it appears at all
  by_category: Record<string, number>; // recommendation rate within each category
  by_provider: Record<string, number>;
  by_language: Record<string, number>;
  by_question: Record<string, number>;
  top_reasons: { reason: string; count: number }[];
}

export interface IndexResult {
  study: Study;
  generated_at: string;
  runs_total: number;
  runs_completed: number;
  runs_refused: number;
  runs_failed: number;
  providers: { id: string; models: string[]; runs: number }[];
  extractors: string[];
  first_run: string | null;
  last_run: string | null;
  denominators: {
    category: Record<string, number>;
    provider: Record<string, number>;
    language: Record<string, number>;
    question: Record<string, number>;
  };
  businesses: BusinessStats[];
  top_sources: { domain: string; count: number }[];
}

const inc = (m: Map<string, number>, k: string, n = 1) => m.set(k, (m.get(k) ?? 0) + n);
const toObj = (m: Map<string, number>) => Object.fromEntries(m);

export function buildIndex(study: Study, runs: Map<string, RunRecord>, extractions: Map<string, ExtractionRecord>, aliases: Map<string, string>): IndexResult {
  const all = [...runs.values()].filter((r) => r.study === study.study);
  const qById = new Map(study.questions.map((q) => [q.id, q]));
  const observations: Observation[] = all
    .filter((r) => r.status === "completed" && extractions.has(r.run_id) && qById.has(r.question_id))
    .map((run) => ({ run, extraction: extractions.get(run.run_id)! }));

  const denom = { category: new Map<string, number>(), provider: new Map<string, number>(), language: new Map<string, number>(), question: new Map<string, number>() };
  const tallies = new Map<string, Tally>();
  const sources = new Map<string, number>();
  let slots = 0;

  for (const { run, extraction } of observations) {
    const q = qById.get(run.question_id)!;
    inc(denom.category, q.category);
    inc(denom.provider, run.provider);
    inc(denom.language, q.language);
    inc(denom.question, q.id);
    for (const url of run.citations) {
      try {
        inc(sources, new URL(url).hostname.replace(/^www\./, ""));
      } catch {
        /* not a URL */
      }
    }
    const seenInRun = new Set<string>();
    for (const b of extraction.businesses) {
      const raw = businessKey(b.name);
      if (!raw) continue;
      const key = aliases.get(raw) ?? raw;
      if (seenInRun.has(key)) continue; // count a business once per answer
      seenInRun.add(key);
      const t =
        tallies.get(key) ??
        ({ key, names: new Map(), recommended: 0, mentioned: 0, topPick: 0, positions: [], reasons: new Map(), byCategory: new Map(), byProvider: new Map(), byLanguage: new Map(), byQuestion: new Map() } as Tally);
      tallies.set(key, t);
      inc(t.names, b.name.trim());
      if (b.status === "recommended") {
        slots++;
        t.recommended++;
        if (b.position) t.positions.push(b.position);
        if (b.position === 1) t.topPick++;
        inc(t.byCategory, q.category);
        inc(t.byProvider, run.provider);
        inc(t.byLanguage, q.language);
        inc(t.byQuestion, q.id);
        for (const r of b.reasons) inc(t.reasons, r.toLowerCase().trim());
      } else {
        t.mentioned++;
      }
    }
  }

  const n = observations.length || 1;
  const rate = (m: Map<string, number>, d: Map<string, number>) => {
    const out: Record<string, number> = {};
    for (const [k, total] of d) out[k] = (m.get(k) ?? 0) / total;
    return out;
  };

  const businesses: BusinessStats[] = [...tallies.values()]
    .map((t) => {
      const byQuestion = rate(t.byQuestion, denom.question);
      const appearing = Object.values(byQuestion).filter((v) => v > 0);
      return {
        key: t.key,
        name: [...t.names.entries()].sort((a, b) => b[1] - a[1])[0][0],
        recommended_runs: t.recommended,
        recommendation_rate: t.recommended / n,
        mention_rate: (t.recommended + t.mentioned) / n,
        top_pick_rate: t.topPick / n,
        avg_position: t.positions.length ? t.positions.reduce((a, b) => a + b, 0) / t.positions.length : null,
        share_of_voice: slots ? t.recommended / slots : 0,
        questions_recommended: appearing.length,
        consistency: appearing.length ? appearing.reduce((a, b) => a + b, 0) / appearing.length : 0,
        by_category: rate(t.byCategory, denom.category),
        by_provider: rate(t.byProvider, denom.provider),
        by_language: rate(t.byLanguage, denom.language),
        by_question: Object.fromEntries(Object.entries(byQuestion).filter(([, v]) => v > 0)),
        top_reasons: [...t.reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([reason, count]) => ({ reason, count })),
      };
    })
    .sort((a, b) => b.recommended_runs - a.recommended_runs || a.name.localeCompare(b.name));

  const providerModels = new Map<string, Set<string>>();
  for (const r of all) {
    if (!providerModels.has(r.provider)) providerModels.set(r.provider, new Set());
    providerModels.get(r.provider)!.add(r.model);
  }
  const times = all.map((r) => r.started_at).sort();

  return {
    study,
    generated_at: new Date().toISOString(),
    runs_total: all.length,
    runs_completed: all.filter((r) => r.status === "completed").length,
    runs_refused: all.filter((r) => r.status === "refused").length,
    runs_failed: all.filter((r) => r.status === "failed").length,
    providers: [...providerModels.entries()].map(([id, models]) => ({ id, models: [...models], runs: denom.provider.get(id) ?? 0 })),
    extractors: [...new Set(observations.map((o) => o.extraction.extractor))],
    first_run: times[0] ?? null,
    last_run: times[times.length - 1] ?? null,
    denominators: { category: toObj(denom.category), provider: toObj(denom.provider), language: toObj(denom.language), question: toObj(denom.question) },
    businesses,
    top_sources: [...sources.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([domain, count]) => ({ domain, count })),
  };
}

// ---------------------------------------------------------------------------
// Output

const pct = (v: number | undefined) => `${Math.round((v ?? 0) * 100)}%`;
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "n/a");
const esc = (s: string) => s.replace(/\|/g, "\\|");

function methodology(ix: IndexResult): string {
  const langs = ix.denominators.language;
  const en = ix.study.questions.filter((q) => q.language === "en").length;
  const es = ix.study.questions.filter((q) => q.language === "es").length;
  return [
    "## Methodology",
    "",
    `- **Questions:** ${ix.study.questions.length} (${en} in English, ${es} in Spanish), asked exactly as a customer would type them, with no extra instructions.`,
    `- **AI models:** ${ix.providers.map((p) => `${p.id} (${p.models.join(", ")})`).join("; ")}. Web search on where the model supports it, located in ${ix.study.location.city}.`,
    `- **Runs:** ${ix.runs_completed} answers analyzed (${ix.runs_total} attempted, ${ix.runs_refused} declined by the model, ${ix.runs_failed} failed). Each question was asked several times per model because answers vary between runs.`,
    `- **Dates:** ${day(ix.first_run)} to ${day(ix.last_run)}.`,
    `- **Extraction:** businesses and the reasons given were extracted from each stored answer (${ix.extractors.join(", ")}). Raw answers are kept unchanged.`,
    `- **Answers by language:** English ${langs.en ?? 0}, Spanish ${langs.es ?? 0}.`,
    "",
    "Rates describe how often AI named a business in these tests. They are not a measure of quality, popularity or customer satisfaction, and results can change as AI models and their sources change.",
  ].join("\n");
}

export function renderReport(ix: IndexResult): string {
  const out: string[] = [];
  out.push(`# ${ix.study.title}`, "", ix.study.description, "", `_Generated ${day(ix.generated_at)}._`, "");

  out.push("## Most recommended businesses", "", "| # | Business | Recommended in | Top pick in | Avg. position | Questions |", "|---|---|---|---|---|---|");
  ix.businesses.slice(0, 20).forEach((b, i) =>
    out.push(`| ${i + 1} | ${esc(b.name)} | ${pct(b.recommendation_rate)} | ${pct(b.top_pick_rate)} | ${b.avg_position?.toFixed(1) ?? "—"} | ${b.questions_recommended} |`),
  );
  out.push("", "_“Recommended in” is the share of all analyzed answers that recommended the business._", "");

  for (const [cat, total] of Object.entries(ix.denominators.category)) {
    const top = ix.businesses.filter((b) => (b.by_category[cat] ?? 0) > 0).sort((a, b) => (b.by_category[cat] ?? 0) - (a.by_category[cat] ?? 0)).slice(0, 10);
    out.push(`## ${cat.charAt(0).toUpperCase() + cat.slice(1)}`, "", `${total} answers.`, "", "| # | Business | Recommended in |", "|---|---|---|");
    top.forEach((b, i) => out.push(`| ${i + 1} | ${esc(b.name)} | ${pct(b.by_category[cat])} |`));
    out.push("");
  }

  if (ix.providers.length > 1) {
    out.push("## Do the AI models agree?", "", "Top 5 businesses per AI model:", "");
    for (const p of ix.providers) {
      const top = [...ix.businesses].sort((a, b) => (b.by_provider[p.id] ?? 0) - (a.by_provider[p.id] ?? 0)).slice(0, 5);
      out.push(`- **${p.id}:** ${top.map((b) => `${b.name} (${pct(b.by_provider[p.id])})`).join(", ")}`);
    }
    out.push("");
  }

  const gaps = ix.businesses
    .filter((b) => Math.max(b.by_language.en ?? 0, b.by_language.es ?? 0) >= 0.05)
    .map((b) => ({ b, gap: (b.by_language.en ?? 0) - (b.by_language.es ?? 0) }))
    .filter((x) => Math.abs(x.gap) >= 0.1)
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
    .slice(0, 10);
  if (gaps.length) {
    out.push("## English vs. Spanish", "", "Businesses AI recommends much more in one language than the other:", "", "| Business | English | Spanish |", "|---|---|---|");
    gaps.forEach(({ b }) => out.push(`| ${esc(b.name)} | ${pct(b.by_language.en)} | ${pct(b.by_language.es)} |`));
    out.push("");
  }

  if (ix.top_sources.length) {
    out.push("## Sources AI cited most", "", ...ix.top_sources.map((s) => `- ${s.domain} (${s.count})`), "");
  }

  out.push("## Question by question", "", "| Question | Most recommended (share of answers) |", "|---|---|");
  for (const q of ix.study.questions) {
    const top = ix.businesses
      .filter((b) => b.by_question[q.id])
      .sort((a, b) => b.by_question[q.id] - a.by_question[q.id])
      .slice(0, 3)
      .map((b) => `${b.name} (${pct(b.by_question[q.id])})`);
    out.push(`| ${esc(q.text)} | ${top.length ? esc(top.join(", ")) : "—"} |`);
  }
  out.push("", methodology(ix), "");
  return out.join("\n");
}

export function renderCsv(ix: IndexResult): string {
  const cats = Object.keys(ix.denominators.category);
  const provs = ix.providers.map((p) => p.id);
  const header = ["business", "recommendation_rate", "mention_rate", "top_pick_rate", "avg_position", "share_of_voice", "questions_recommended", "consistency", ...cats.map((c) => `rate_${c}`), ...provs.map((p) => `rate_${p}`), "rate_en", "rate_es", "top_reasons"];
  const rows = ix.businesses.map((b) =>
    [
      b.name,
      b.recommendation_rate.toFixed(4),
      b.mention_rate.toFixed(4),
      b.top_pick_rate.toFixed(4),
      b.avg_position?.toFixed(2) ?? "",
      b.share_of_voice.toFixed(4),
      b.questions_recommended,
      b.consistency.toFixed(4),
      ...cats.map((c) => (b.by_category[c] ?? 0).toFixed(4)),
      ...provs.map((p) => (b.by_provider[p] ?? 0).toFixed(4)),
      (b.by_language.en ?? 0).toFixed(4),
      (b.by_language.es ?? 0).toFixed(4),
      b.top_reasons.map((r) => r.reason).join("; "),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

/** One-page snapshot for a single business, for sharing with its owner. */
export function renderSnapshot(ix: IndexResult, query: string, runs: Map<string, RunRecord>, extractions: Map<string, ExtractionRecord>): string | null {
  const key = businessKey(query);
  const b = ix.businesses.find((x) => x.key === key) ?? ix.businesses.find((x) => x.key.includes(key) || key.includes(x.key));
  if (!b) return null;
  const qById = new Map(ix.study.questions.map((q) => [q.id, q]));
  const mainCat = Object.entries(b.by_category).sort((a, c) => c[1] - a[1])[0]?.[0];
  const catRank = mainCat
    ? [...ix.businesses].sort((x, y) => (y.by_category[mainCat] ?? 0) - (x.by_category[mainCat] ?? 0)).findIndex((x) => x.key === b.key) + 1
    : null;

  // Questions in its main category where it never appears, and who AI recommends there.
  const missing = ix.study.questions
    .filter((q) => q.category === mainCat && !b.by_question[q.id])
    .map((q) => {
      const winner = [...ix.businesses].filter((x) => x.by_question[q.id]).sort((x, y) => y.by_question[q.id] - x.by_question[q.id])[0];
      return { q, winner };
    });

  // One verbatim example where it was recommended.
  const exampleRun = [...runs.values()].find((r) => extractions.get(r.run_id)?.businesses.some((x) => businessKey(x.name) === b.key && x.status === "recommended"));

  const out: string[] = [];
  out.push(`# ${b.name}: AI visibility snapshot`, "", `_${ix.study.title} · tests run ${day(ix.first_run)} to ${day(ix.last_run)} · ${ix.runs_completed} AI answers analyzed_`, "");
  out.push("## Summary", "");
  out.push(`- AI recommended ${b.name} in **${pct(b.recommendation_rate)}** of all answers in this study${mainCat ? `, and in **${pct(b.by_category[mainCat])}** of ${mainCat} answers (#${catRank} in ${mainCat})` : ""}.`);
  out.push(`- It was the first recommendation in ${pct(b.top_pick_rate)} of answers; when recommended, its average position was ${b.avg_position?.toFixed(1) ?? "—"}.`);
  out.push(`- By AI model: ${Object.entries(b.by_provider).map(([p, v]) => `${p} ${pct(v)}`).join(" · ") || "—"}.`);
  out.push(`- By language: English ${pct(b.by_language.en)} · Spanish ${pct(b.by_language.es)}.`, "");
  if (b.top_reasons.length) out.push("## Reasons AI gives for recommending it", "", ...b.top_reasons.map((r) => `- ${r.reason} (${r.count}×)`), "");
  out.push("## Questions where AI recommends it", "", "| Question | Share of answers |", "|---|---|");
  for (const [qid, v] of Object.entries(b.by_question).sort((a, c) => c[1] - a[1])) out.push(`| ${esc(qById.get(qid)?.text ?? qid)} | ${pct(v)} |`);
  out.push("");
  if (missing.length) {
    out.push(`## ${mainCat ? mainCat.charAt(0).toUpperCase() + mainCat.slice(1) : "Related"} questions where it never appeared`, "", "| Question | Most recommended instead |", "|---|---|");
    missing.forEach(({ q, winner }) => out.push(`| ${esc(q.text)} | ${winner ? `${esc(winner.name)} (${pct(winner.by_question[q.id])})` : "—"} |`));
    out.push("");
  }
  if (exampleRun) {
    out.push("## Example answer", "", `> **Question (${exampleRun.provider}):** ${exampleRun.prompt}`, ">", ...exampleRun.raw_response.split("\n").map((l) => `> ${l}`), "");
  }
  out.push(methodology(ix), "");
  return out.join("\n");
}
