"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { FlaskConical, Play, RefreshCw } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, Delta } from "./ui";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * Simulation mode. "Run new simulation" re-runs every query, re-extracts
 * recommendations, recalculates metrics and adds a snapshot to history.
 */
export function SimulationControl({ variant = "card" }: { variant?: "card" | "sidebar" | "button" }) {
  const { ws, runSimulation } = useStore();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastDelta, setLastDelta] = useState<number | null>(null);
  const [prevScore, setPrevScore] = useState<number | null>(null);

  useEffect(() => {
    if (prevScore !== null && !running) {
      setLastDelta(ws.you.score - prevScore);
      setPrevScore(null);
    }
  }, [ws.you.score, prevScore, running]);

  useEffect(() => setLastDelta(null), [ws.business.id]);

  function run() {
    if (running) return;
    setRunning(true);
    setLastDelta(null);
    setPrevScore(ws.you.score);
    const start = performance.now();
    const total = 1600;
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / total);
      setProgress(p);
      if (p < 1) requestAnimationFrame(tick);
      else {
        runSimulation();
        setRunning(false);
      }
    };
    requestAnimationFrame(tick);
  }

  const processed = Math.floor(progress * ws.queries.length);

  if (variant === "button") {
    return (
      <div className="relative">
        <button
          onClick={run}
          disabled={running}
          className="focus-ring inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-ink-150 bg-white px-3 text-[13px] font-medium text-ink-800 shadow-card transition-colors hover:border-ink-300 disabled:opacity-70"
        >
          <RefreshCw className={clsx("h-3.5 w-3.5", running && "animate-spin")} />
          <span className="hidden sm:inline">{running ? `Re-checking ${processed}/${ws.queries.length}` : "Re-check now"}</span>
        </button>
        {lastDelta !== null && !running && (
          <div className="absolute right-0 top-full z-40 mt-2 w-64 animate-fade-up rounded-xl border border-ink-150 bg-white p-3 text-[12.5px] shadow-pop">
            <div className="font-semibold text-ink-900">Re-checked {ws.queries.length} questions</div>
            <div className="mt-0.5 text-ink-600">
              AI now recommends you in {Math.round(ws.you.recommendation_rate * 10)} of 10. Score {ws.you.score} <Delta value={lastDelta} suffix=" pts" />
            </div>
            <button onClick={() => setLastDelta(null)} className="mt-2 text-[12px] font-medium text-ink-500 hover:text-ink-900">
              Dismiss
            </button>
          </div>
        )}
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className="m-3 rounded-xl border border-ink-150 bg-white p-3.5">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-800">
          <FlaskConical className="h-3.5 w-3.5 text-ink-500" /> Simulation mode
        </div>
        <dl className="mt-2 space-y-1 text-[11.5px]">
          <Row label="Provider" value="GPT-style model" />
          <Row label="Query set" value={`${ws.queries.length} queries`} />
          <Row label="Last run" value={fmt(ws.latest.run_date)} />
        </dl>
        <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={run} disabled={running}>
          {running ? `Running ${processed}/${ws.queries.length}…` : (<><Play className="h-3 w-3" /> Run new simulation</>)}
        </Button>
        {running && <Progress value={progress} />}
        {lastDelta !== null && (
          <p className="mt-2 text-[11.5px] text-ink-500">
            Score {ws.you.score} <Delta value={lastDelta} suffix=" pts" />
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold">
        <FlaskConical className="h-4 w-4 text-ink-500" /> Simulation mode
      </div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">
        Results come from a simulated AI model, not live observations. Re-run to measure the effect of completed opportunities.
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
        <Stack label="Provider" value="GPT-style model" />
        <Stack label="Query set" value={`${ws.queries.length} queries`} />
        <Stack label="Runs" value={String(ws.simulations.length)} />
      </dl>
      <Button className="mt-4 w-full" onClick={run} disabled={running}>
        {running ? `Processing ${processed} of ${ws.queries.length} queries…` : (<><Play className="h-3.5 w-3.5" /> Run new simulation</>)}
      </Button>
      {running && <Progress value={progress} />}
      {lastDelta !== null && (
        <p className="mt-3 text-[12.5px] text-ink-600">
          New simulation complete. Score is now <span className="num font-semibold">{ws.you.score}</span> <Delta value={lastDelta} suffix=" pts" />
        </p>
      )}
      <p className="mt-3 text-[11.5px] text-ink-400">Last run {fmt(ws.latest.run_date)}</p>
    </div>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-100">
      <div className={clsx("h-full rounded-full bg-ink-900")} style={{ width: `${value * 100}%` }} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-ink-400">{label}</dt>
      <dd className="truncate font-medium text-ink-700">{value}</dd>
    </div>
  );
}

function Stack({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-ink-50 px-2.5 py-2">
      <dt className="text-[10.5px] text-ink-400">{label}</dt>
      <dd className="truncate font-medium text-ink-800">{value}</dd>
    </div>
  );
}
