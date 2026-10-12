import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ExtractionRecord, RunRecord, Study } from "./types";

// Append-only JSONL files per study. Each record is written as soon as it
// exists, so an interrupted run loses nothing and can be resumed.

export function studyDir(baseDir: string, study: Study) {
  const dir = path.join(baseDir, study.study);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function readJsonl<T>(file: string): T[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as T);
}

export const runsFile = (dir: string) => path.join(dir, "runs.jsonl");
export const extractionsFile = (dir: string) => path.join(dir, "extractions.jsonl");

/** Latest record per run_id (a retried run supersedes a failed one). */
export function loadRuns(dir: string): Map<string, RunRecord> {
  const map = new Map<string, RunRecord>();
  for (const r of readJsonl<RunRecord>(runsFile(dir))) map.set(r.run_id, r);
  return map;
}

export function loadExtractions(dir: string): Map<string, ExtractionRecord> {
  const map = new Map<string, ExtractionRecord>();
  for (const r of readJsonl<ExtractionRecord>(extractionsFile(dir))) map.set(r.run_id, r);
  return map;
}

export function appendRecord(file: string, record: unknown) {
  appendFileSync(file, JSON.stringify(record) + "\n");
}

export function writeText(file: string, content: string) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}
