"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { useStore, type RangeDays } from "@/lib/store";
import { windowed } from "@/lib/engine/history";
import { TrendChart } from "@/components/charts";
import { SimulationControl } from "@/components/simulation-control";
import type { Workspace } from "@/lib/engine/workspace";
import { YOU } from "@/lib/engine/insights";
import { splitAssociations } from "@/lib/engine/perception";
import { AskAI } from "@/components/ask-ai";
import { PerceptionBars, PerceptionSummary } from "@/components/perception";
import { ComponentTable, CoverageList } from "@/components/score";
import { EntityAvatar, PageHeader, Segmented, TrustLabel } from "@/components/ui";

type Tab = "score" | "perception" | "ask";

export default function VisibilityPage() {
  return (
    <Suspense>
      <Visibility />
    </Suspense>
  );
}

function Visibility() {
  const params = useSearchParams();
  const router = useRouter();
  const t = params.get("tab");
  const tab: Tab = t === "ask" || t === "perception" ? t : "score";
  const { ws } = useStore();

  return (
    <div>
      <PageHeader title="Full analysis" description={`The detail behind ${ws.business.name}'s results: how the score is calculated, what AI knows you for, and a place to ask it questions.`} />
      <div className="scrollbar-none mb-6 flex gap-6 overflow-x-auto border-b border-ink-150">
        {(
          [
            { id: "score", label: "Score & history" },
            { id: "perception", label: "What AI knows you for" },
            { id: "ask", label: "Ask AI about my business" },
          ] as { id: Tab; label: string }[]
        ).map((x) => (
          <button
            key={x.id}
            onClick={() => router.replace(x.id === "score" ? "/app/visibility" : `/app/visibility?tab=${x.id}`)}
            className={clsx(
              "-mb-px shrink-0 border-b-2 px-1 pb-3 text-[14px] font-medium transition-colors",
              tab === x.id ? "border-ink-900 text-ink-900" : "border-transparent text-ink-500 hover:text-ink-800",
            )}
          >
            {x.label}
          </button>
        ))}
      </div>
      {tab === "ask" ? <AskAI ws={ws} /> : tab === "perception" ? <Perception ws={ws} /> : <ScoreTab ws={ws} />}
    </div>
  );
}

function ScoreTab({ ws }: { ws: Workspace }) {
  const { range, setRange } = useStore();
  const history = windowed(ws.history, range);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="card p-5 sm:p-6">
          <div className="flex items-baseline gap-2">
            <span className="num text-[44px] font-semibold leading-none tracking-tight">{ws.you.score}</span>
            <span className="text-ink-400">/ 100 visibility score</span>
          </div>
          <p className="mb-5 mt-2 text-[13.5px] text-ink-500">Five measures from {ws.queries.length} simulated AI answers, each scored 0–100 and weighted.</p>
          <ComponentTable m={ws.you} />
        </div>
        <div className="space-y-5">
          <div className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[15px] font-semibold">Score over time</div>
                <div className="mt-0.5 text-[12px] text-ink-400">{ws.business.is_demo ? "Simulated monitoring history" : "Your re-checks"}</div>
              </div>
              <Segmented<RangeDays>
                value={range}
                onChange={setRange}
                options={[
                  { value: 7, label: "7d" },
                  { value: 30, label: "30d" },
                  { value: 90, label: "90d" },
                ]}
              />
            </div>
            <div className="mt-5">
              {history.length > 1 ? (
                <TrendChart points={history.map((h) => ({ date: h.simulation.run_date, score: h.score }))} height={200} />
              ) : (
                <p className="rounded-xl border border-dashed border-ink-200 px-4 py-10 text-center text-[13px] text-ink-500">One check so far. Use “Re-check now” to start building history.</p>
              )}
            </div>
          </div>
          <div className="card p-5 sm:p-6">
            <div className="text-[15px] font-semibold">Topics where AI mentions you</div>
            <p className="mb-4 mt-1 text-[13px] text-ink-500">Share of questions on each topic where AI mentions you at all.</p>
            <CoverageList ws={ws} />
          </div>
          <SimulationControl />
        </div>
      </div>
    </div>
  );
}

function Perception({ ws }: { ws: Workspace }) {
  const [compareId, setCompareId] = useState<string>(ws.competitorMetrics[0]?.entity_id ?? "");
  useEffect(() => setCompareId(ws.competitorMetrics[0]?.entity_id ?? ""), [ws.business.id, ws.competitorMetrics]);
  const comp = ws.competitorMetrics.find((c) => c.entity_id === compareId);
  const mine = ws.perception[YOU];
  const { weak } = splitAssociations(mine);
  const theirStrong = comp ? splitAssociations(ws.perception[comp.entity_id] ?? []).strong : [];

  return (
    <div className="space-y-5">
      <div className="card p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[19px] font-semibold tracking-tight">What AI knows {ws.business.name} for</h2>
            <p className="mt-1 max-w-2xl text-[13.5px] text-ink-500">
              Built from the reasons AI gives when it recommends you. A long bar means AI often mentions that quality when it picks you.
            </p>
          </div>
          <TrustLabel kind="simulated" />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <PerceptionBars list={mine} compare={comp ? ws.perception[comp.entity_id] : undefined} compareName={comp?.name} />
          <div className="space-y-6">
            <PerceptionSummary ws={ws} />
            <div>
              <div className="mb-2 text-[12px] font-semibold">Compare with</div>
              <div className="flex flex-wrap gap-1.5">
                {ws.competitorMetrics.map((c) => (
                  <button
                    key={c.entity_id}
                    onClick={() => setCompareId(c.entity_id)}
                    className={clsx(
                      "focus-ring inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px]",
                      compareId === c.entity_id ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-700 hover:border-ink-300",
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            {comp && (
              <div className="rounded-xl border border-accent-100 bg-accent-50/40 p-4">
                <TrustLabel kind="diagnosis" />
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-800">
                  {theirStrong.length ? (
                    <>
                      AI most often credits <strong>{comp.name}</strong> with {theirStrong.map((a) => a.label.toLowerCase()).join(", ")}.
                    </>
                  ) : (
                    <>AI gives {comp.name} no single standout association.</>
                  )}{" "}
                  {weak.length > 0 && <>Your weakest associations are {weak.map((a) => a.label.toLowerCase()).join(", ")}.</>}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="text-[15px] font-semibold">Reasons AI gives for each business</div>
        <p className="mt-1 text-[13px] text-ink-500">The reasons AI states most often, counted across all answers.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {[{ id: YOU, name: ws.business.name }, ...ws.competitors].map((e) => {
            const counts = new Map<string, number>();
            ws.recommendations
              .filter((r) => r.matched_business_id === e.id && r.recommended)
              .forEach((r) => r.rationale.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1)));
            const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
            return (
              <div key={e.id} className={clsx("rounded-xl border p-4", e.id === YOU ? "border-accent-200 bg-accent-50/30" : "border-ink-150")}>
                <div className="flex items-center gap-2">
                  <EntityAvatar name={e.name} you={e.id === YOU} size={24} />
                  <span className="text-[13.5px] font-semibold">{e.name}</span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {top.map(([reason, n]) => (
                    <li key={reason} className="flex justify-between gap-3 text-[12.5px]">
                      <span className="text-ink-700">{reason}</span>
                      <span className="num text-ink-400">{n}×</span>
                    </li>
                  ))}
                  {!top.length && <li className="text-[12.5px] text-ink-500">Not recommended in these answers.</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
