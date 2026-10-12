import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CONFIG } from "./config";
import type { Provider, Study } from "./types";
import { anthropicProvider } from "./providers/anthropic";
import { geminiProvider, openaiProvider, perplexityProvider } from "./providers/http-providers";
import { mockProvider } from "./providers/mock";
import { executeRuns, planRuns, pool } from "./run";
import { extractHeuristic, extractWithClaude } from "./extract";
import { appendRecord, extractionsFile, loadExtractions, loadRuns, studyDir, writeText } from "./store";
import { buildIndex, loadAliases, renderCsv, renderReport, renderSnapshot } from "./report";

const TOOL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const HELP = `AI Index: ask AI assistants real customer questions and measure who they recommend.

Usage: npm run ai-index -- <command> [options]

Commands:
  run        Ask every question to every provider (resumable; skips finished runs)
  extract    Turn stored answers into structured records
  report     Build the index (report.md, index.json, businesses.csv)
  snapshot   One-page snapshot for one business:  snapshot "Business Name"
  all        run + extract + report

Options:
  --study <file>       Question set (default: questions/san-juan-hospitality.json)
  --providers <list>   claude,chatgpt,gemini,perplexity (default: every provider with a key)
  --repeats <n>        Times each question is asked per provider (default ${CONFIG.repeats})
  --limit <n>          Only the first n questions (for a quick trial)
  --concurrency <n>    Parallel requests (default ${CONFIG.concurrency})
  --extractor <name>   claude | heuristic (default: claude when ANTHROPIC_API_KEY is set)
  --mock               Use the offline mock provider (fictional data, for testing only)
  --data <dir>         Where results are stored (default: tools/ai-index/data)
  --dry-run            Show what would run, then stop
`;

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else args[key] = true;
    } else positional.push(a);
  }
  return { args, positional };
}

const log = (s: string) => console.log(s);

function selectProviders(args: Record<string, string | boolean>): Provider[] {
  if (args.mock) return [mockProvider("mock-a", "Mock A"), mockProvider("mock-b", "Mock B")];
  const all = [anthropicProvider(), openaiProvider(), geminiProvider(), perplexityProvider()];
  const wanted = typeof args.providers === "string" ? args.providers.split(",").map((s) => s.trim()) : null;
  const chosen = wanted ? all.filter((p) => wanted.includes(p.id)) : all;
  const ready = chosen.filter((p) => {
    const reason = p.unavailableReason();
    if (reason) log(`  skipping ${p.label}: ${reason}`);
    return !reason;
  });
  return ready;
}

async function cmdRun(study: Study, dir: string, args: Record<string, string | boolean>) {
  const providers = selectProviders(args);
  if (!providers.length) {
    log("No providers available. Set at least one API key (see tools/ai-index/README.md), or use --mock to test.");
    process.exitCode = 1;
    return;
  }
  const repeats = Number(args.repeats ?? CONFIG.repeats);
  const limit = args.limit ? Number(args.limit) : undefined;
  const { todo, done } = planRuns(study, providers, repeats, dir, limit);
  log(`Providers: ${providers.map((p) => `${p.label} (${p.model}${p.webSearch ? ", web search" : ""})`).join(", ")}`);
  log(`Runs: ${todo.length} to do, ${done} already done (${limit ?? study.questions.length} questions × ${repeats} repeats × ${providers.length} providers)`);
  if (args["dry-run"] || !todo.length) return;
  const { failed } = await executeRuns(study, todo, dir, Number(args.concurrency ?? CONFIG.concurrency), log);
  if (failed) log(`${failed} runs failed. Run the same command again to retry only those.`);
}

async function cmdExtract(study: Study, dir: string, args: Record<string, string | boolean>) {
  const useClaude = args.extractor ? args.extractor === "claude" : !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  const runs = [...loadRuns(dir).values()].filter((r) => r.status === "completed");
  const done = loadExtractions(dir);
  const todo = runs.filter((r) => !done.has(r.run_id));
  const qById = new Map(study.questions.map((q) => [q.id, q]));
  log(`Extracting ${todo.length} answers (${done.size} already extracted) with ${useClaude ? `Claude (${CONFIG.extractorModel})` : "the heuristic parser"}`);
  if (args["dry-run"]) return;
  let failed = 0;
  await pool(todo, Number(args.concurrency ?? CONFIG.concurrency), async (run) => {
    try {
      const record = useClaude ? await extractWithClaude(run, qById.get(run.question_id)!) : extractHeuristic(run);
      appendRecord(extractionsFile(dir), record);
    } catch (e) {
      failed++;
      log(`  ✗ ${run.run_id}: ${e instanceof Error ? e.message : e}`);
    }
  });
  if (failed) log(`${failed} extractions failed. Run extract again to retry them.`);
}

function cmdReport(study: Study, dir: string) {
  const ix = buildIndex(study, loadRuns(dir), loadExtractions(dir), loadAliases(TOOL_DIR, study));
  const reportDir = path.join(dir, "report");
  writeText(path.join(reportDir, "report.md"), renderReport(ix));
  writeText(path.join(reportDir, "index.json"), JSON.stringify(ix, null, 2));
  writeText(path.join(reportDir, "businesses.csv"), renderCsv(ix));
  log(`Index built from ${ix.runs_completed} answers: ${ix.businesses.length} businesses found.`);
  log(`  ${path.relative(process.cwd(), reportDir)}/report.md, index.json, businesses.csv`);
  return ix;
}

function cmdSnapshot(study: Study, dir: string, name: string | undefined) {
  if (!name) {
    log('Name the business: npm run ai-index -- snapshot "Business Name"');
    process.exitCode = 1;
    return;
  }
  const runs = loadRuns(dir);
  const extractions = loadExtractions(dir);
  const ix = buildIndex(study, runs, extractions, loadAliases(TOOL_DIR, study));
  const md = renderSnapshot(ix, name, runs, extractions);
  if (!md) {
    const close = ix.businesses.slice(0, 15).map((b) => b.name).join(", ");
    log(`No business matching "${name}" in this study. Most recommended: ${close}`);
    process.exitCode = 1;
    return;
  }
  const file = path.join(dir, "snapshots", `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`);
  writeText(file, md);
  log(`Snapshot written to ${path.relative(process.cwd(), file)}`);
}

async function main() {
  const { args, positional } = parseArgs(process.argv.slice(2));
  const command = positional[0];
  if (!command || args.help) {
    log(HELP);
    return;
  }
  const studyFile = path.resolve(typeof args.study === "string" ? args.study : path.join(TOOL_DIR, "questions", "san-juan-hospitality.json"));
  const study = JSON.parse(readFileSync(studyFile, "utf8")) as Study;
  const baseDir = path.resolve(typeof args.data === "string" ? args.data : path.join(TOOL_DIR, "data"));
  const dir = studyDir(baseDir, args.mock ? { ...study, study: `${study.study}-mock` } : study);
  const scoped = args.mock ? { ...study, study: `${study.study}-mock`, title: `${study.title} (MOCK DATA, NOT REAL)` } : study;

  switch (command) {
    case "run":
      return cmdRun(scoped, dir, args);
    case "extract":
      return cmdExtract(scoped, dir, args);
    case "report":
      cmdReport(scoped, dir);
      return;
    case "snapshot":
      return cmdSnapshot(scoped, dir, positional[1]);
    case "all":
      await cmdRun(scoped, dir, args);
      if (args["dry-run"] || process.exitCode) return;
      await cmdExtract(scoped, dir, args);
      cmdReport(scoped, dir);
      return;
    default:
      log(`Unknown command "${command}".\n`);
      log(HELP);
      process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
