"use client";

import clsx from "clsx";
import type { EntityMetrics } from "@/lib/model/types";
import type { Workspace } from "@/lib/engine/workspace";
import { getCategoryLabel } from "@/lib/industries";
import { Drawer } from "./drawer";
import { Meter, TrustLabel, pct } from "./ui";

/** "Why 68?": the score broken into its five weighted components. */
export function ScoreExplainer({ ws, open, onClose }: { ws: Workspace; open: boolean; onClose: () => void }) {
  const m = ws.you;
  return (
    <Drawer open={open} onClose={onClose} title={`Why ${m.score}?`}>
      <div className="space-y-7">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="num text-[44px] font-semibold leading-none tracking-tight">{m.score}</span>
            <span className="text-ink-400">/ 100 AI Visibility Score</span>
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-600">
            Computed from {m.queries} simulated AI runs in the latest test ({ws.queries.length} queries). Each component is normalized to 0–100, then weighted.
          </p>
          <div className="mt-3">
            <TrustLabel kind="simulated" />
          </div>
        </div>

        <ComponentTable m={m} />

        <div>
          <div className="mb-1 text-[13.5px] font-semibold">Query coverage by category</div>
          <p className="mb-3 text-[12.5px] text-ink-500">Share of queries in each category where AI mentions you at all.</p>
          <CoverageList ws={ws} />
        </div>

        <div className="rounded-xl border border-ink-150 bg-ink-50/60 p-4 font-mono text-[11.5px] leading-relaxed text-ink-600">
          score = 0.35 × recommendation + 0.25 × position + 0.20 × coverage + 0.10 × share of voice + 0.10 × high-intent
          <br />
          high-intent weights: discovery 20 · best-of 45 · comparison 45 · problem 55 · local 65 · high intent 85 · transactional 100
        </div>
      </div>
    </Drawer>
  );
}

export function ComponentTable({ m }: { m: EntityMetrics }) {
  return (
    <div className="divide-y divide-ink-100 rounded-xl border border-ink-150">
      {m.components.map((c) => (
        <div key={c.key} className="px-4 py-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-[13.5px] font-semibold">{c.label}</div>
            <div className="num text-[20px] font-semibold tracking-tight">{Math.round(c.normalized)}</div>
          </div>
          <div className="mt-2">
            <Meter value={c.normalized / 100} tone="accent" size="sm" />
          </div>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-[12px] text-ink-500">
            <span>{c.raw}</span>
            <span className="num">
              × {Math.round(c.weight * 100)}% = <span className="font-semibold text-ink-800">{c.contribution.toFixed(1)} pts</span>
            </span>
          </div>
          <p className="mt-1 text-[11.5px] text-ink-400">{c.explanation}</p>
        </div>
      ))}
    </div>
  );
}

export function CoverageList({ ws }: { ws: Workspace }) {
  const leaderFor = (cat: string) =>
    ws.competitorMetrics.map((c) => ({ name: c.name, v: c.coverage_by_category[cat] ?? 0 })).sort((a, b) => b.v - a.v)[0];
  return (
    <div className="space-y-2.5">
      {Object.entries(ws.you.coverage_by_category)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, v]) => {
          const n = ws.queries.filter((q) => q.category === cat).length;
          const leader = leaderFor(cat);
          return (
            <div key={cat} className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-3 sm:grid-cols-[minmax(0,11rem)_1fr_2.5rem]">
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium">{getCategoryLabel(ws.industry, cat)}</div>
                <div className="truncate text-[11px] text-ink-400">
                  {n} queries{leader && leader.v > v ? ` · ${leader.name} ${pct(leader.v)}` : ""}
                </div>
              </div>
              <Meter value={v} tone={v < 0.4 ? "muted" : "accent"} />
              <span className={clsx("num text-right text-[13px] font-semibold", v < 0.4 && "text-ink-500")}>{pct(v)}</span>
            </div>
          );
        })}
    </div>
  );
}
