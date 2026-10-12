import type { Provider, RunRecord, Study } from "./types";
import { appendRecord, loadRuns, runsFile } from "./store";

/** Runs `tasks` with at most `limit` in flight. */
export async function pool<T>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>) {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
}

export interface RunPlan {
  provider: Provider;
  questionId: string;
  repeat: number;
  runId: string;
}

export function planRuns(study: Study, providers: Provider[], repeats: number, dir: string, questionLimit?: number): { todo: RunPlan[]; done: number } {
  const existing = loadRuns(dir);
  const questions = study.questions.slice(0, questionLimit ?? study.questions.length);
  const todo: RunPlan[] = [];
  let done = 0;
  for (const provider of providers) {
    for (const q of questions) {
      for (let repeat = 1; repeat <= repeats; repeat++) {
        const runId = `${provider.id}:${q.id}:${repeat}`;
        const prev = existing.get(runId);
        if (prev && prev.status !== "failed") done++;
        else todo.push({ provider, questionId: q.id, repeat, runId });
      }
    }
  }
  return { todo, done };
}

export async function executeRuns(study: Study, plan: RunPlan[], dir: string, concurrency: number, log: (s: string) => void) {
  const file = runsFile(dir);
  let finished = 0;
  let failed = 0;
  await pool(plan, concurrency, async (p) => {
    const question = study.questions.find((q) => q.id === p.questionId)!;
    const started = new Date().toISOString();
    const base = {
      run_id: p.runId,
      study: study.study,
      question_id: question.id,
      provider: p.provider.id,
      repeat: p.repeat,
      prompt: question.text,
      web_search: p.provider.webSearch,
      started_at: started,
    };
    let record: RunRecord;
    try {
      const answer = await p.provider.ask(question, study);
      record = {
        ...base,
        model: answer.model,
        finished_at: new Date().toISOString(),
        status: answer.refused ? "refused" : "completed",
        raw_response: answer.text,
        citations: answer.citations,
        usage: answer.usage,
      };
    } catch (e) {
      failed++;
      record = {
        ...base,
        model: p.provider.model,
        finished_at: new Date().toISOString(),
        status: "failed",
        raw_response: "",
        citations: [],
        error: e instanceof Error ? e.message : String(e),
      };
    }
    appendRecord(file, record);
    finished++;
    if (record.status === "failed") log(`  ✗ ${p.runId}: ${record.error?.slice(0, 160)}`);
    if (finished % 10 === 0 || finished === plan.length) log(`  ${finished}/${plan.length} runs (${failed} failed)`);
  });
  return { finished, failed };
}
