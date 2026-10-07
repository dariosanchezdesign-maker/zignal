"use client";

import { useState } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Insight, InsightStatus, QueryOutcome } from "@/lib/model/types";
import type { Workspace } from "@/lib/engine/workspace";
import { INSIGHT_LABEL } from "@/lib/engine/insights";
import { RunDrawer } from "@/components/run-detail";
import { PositionPill } from "@/components/recommendation-view";
import { Badge, ImpactBadge, PageHeader, STATUS_LABEL, Segmented, StatusBadge, TrustLabel } from "@/components/ui";

const STATUSES: InsightStatus[] = ["not-started", "in-progress", "completed"];

export default function Opportunities() {
  const { ws, setInsightStatus } = useStore();
  const [filter, setFilter] = useState<InsightStatus | "all">("all");
  const [run, setRun] = useState<QueryOutcome | null>(null);
  const list = ws.insights.filter((o) => filter === "all" || o.status === filter);
  const open = ws.insights.filter((o) => o.status !== "completed");
  const done = ws.insights.length - open.length;

  return (
    <div>
      <PageHeader
        title="Your biggest opportunities"
        description="Generated from query-level evidence in the latest simulation. Mark work as completed, then run a new simulation to measure the effect."
      />

      <div className="mb-6 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-ink-150 bg-ink-150">
        <Summary label="Open opportunities" value={String(open.length)} hint="From the latest simulation" />
        <Summary label="Largest projected lift" value={`+${Math.max(0, ...open.map((o) => o.expected_impact.points))}`} unit="pts" hint="If you win half of its queries" />
        <Summary label="Completed" value={String(done)} hint="Re-measured on the next simulation" />
      </div>

      <div className="mb-4 overflow-x-auto">
        <Segmented<InsightStatus | "all">
          value={filter}
          onChange={setFilter}
          options={[{ value: "all", label: "All" }, ...STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
        />
      </div>

      <div className="space-y-4">
        {list.map((o, i) => (
          <OpportunityCard key={o.id} index={ws.insights.indexOf(o) + 1} o={o} ws={ws} onStatus={(s) => setInsightStatus(o, s)} onOpenRun={setRun} first={i === 0} />
        ))}
        {!list.length && <div className="card p-10 text-center text-[14px] text-ink-500">Nothing here yet.</div>}
      </div>
      <RunDrawer outcome={run} ws={ws} onClose={() => setRun(null)} />
    </div>
  );
}

function Summary({ label, value, unit, hint }: { label: string; value: string; unit?: string; hint: string }) {
  return (
    <div className="bg-white px-4 py-4 sm:px-6 sm:py-5">
      <div className="text-[12px] font-medium text-ink-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="num text-[24px] font-semibold tracking-tight sm:text-[28px]">{value}</span>
        {unit && <span className="text-[13px] text-ink-400">{unit}</span>}
      </div>
      <div className="mt-0.5 hidden text-[11.5px] text-ink-400 sm:block">{hint}</div>
    </div>
  );
}

function OpportunityCard({
  o,
  index,
  ws,
  onStatus,
  onOpenRun,
  first,
}: {
  o: Insight;
  index: number;
  ws: Workspace;
  onStatus: (s: InsightStatus) => void;
  onOpenRun: (o: QueryOutcome) => void;
  first: boolean;
}) {
  const [expanded, setExpanded] = useState(first);
  const evidenceIds = Array.from(new Set(o.evidence.flatMap((e) => e.query_ids ?? [])));
  const evidenceOutcomes = ws.outcomes.filter((x) => evidenceIds.includes(x.query.id)).sort((a, b) => b.query.commercial_weight - a.query.commercial_weight);

  return (
    <div className={clsx("card overflow-hidden", o.status === "completed" && "opacity-85")}>
      <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="num font-mono text-[12px] text-ink-400">Opportunity {String(index).padStart(2, "0")}</span>
            <Badge tone="neutral">{INSIGHT_LABEL[o.type]}</Badge>
            <ImpactBadge level={o.severity} prefix="Impact: " />
          </div>
          <h3 className={clsx("mt-2.5 text-[17px] font-semibold leading-snug tracking-tight sm:text-[18px]", o.status === "completed" && "line-through decoration-ink-300")}>{o.title}</h3>

          <ol className="mt-5 space-y-4 border-l border-ink-150 pl-5">
            <Step label="Observation">
              <p className="text-[13.5px] leading-relaxed text-ink-800">{o.observation}</p>
            </Step>
            <Step label="Evidence">
              <dl className="grid gap-1.5 text-[13px]">
                {o.evidence.map((e) => (
                  <div key={e.label} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 rounded-lg bg-ink-50 px-3 py-2">
                    <dt className="text-ink-600">{e.label}</dt>
                    <dd className="num font-medium text-ink-900">{e.value}</dd>
                  </div>
                ))}
              </dl>
            </Step>
            <Step label="Diagnosis" badge={<TrustLabel kind="diagnosis" />}>
              <p className="text-[13.5px] leading-relaxed text-ink-700">{o.diagnosis}</p>
            </Step>
            <Step label="Action">
              <p className="text-[13.5px] font-medium leading-relaxed text-ink-900">{o.recommendation}</p>
            </Step>
          </ol>
        </div>

        <div className="flex flex-row items-end justify-between gap-4 border-t border-ink-100 pt-4 lg:flex-col lg:items-stretch lg:justify-start lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div>
            <div className="eyebrow">Expected impact</div>
            <div className="num mt-1 text-[28px] font-semibold tracking-tight text-positive">+{o.expected_impact.points}</div>
            <div className="text-[11.5px] leading-snug text-ink-400">visibility pts, projected if you win half of the evidence queries</div>
          </div>
          <div className="lg:mt-5">
            <div className="eyebrow mb-1.5 hidden lg:block">Status</div>
            <label className="relative inline-flex">
              <span className="sr-only">Status</span>
              <select
                id={`status-${o.id}`}
                value={o.status}
                onChange={(e) => onStatus(e.target.value as InsightStatus)}
                className="focus-ring absolute inset-0 cursor-pointer opacity-0"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none inline-flex items-center gap-1 rounded-lg border border-ink-150 bg-white py-1 pl-1 pr-2">
                <StatusBadge status={o.status} />
                <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
              </span>
            </label>
            {o.status === "completed" && <p className="mt-2 text-[11.5px] leading-snug text-ink-500">Run a new simulation to measure the change.</p>}
          </div>
        </div>
      </div>
      {evidenceOutcomes.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between border-t border-ink-100 bg-ink-50/60 px-5 py-2.5 text-[12.5px] font-medium text-ink-600 hover:text-ink-900 sm:px-6"
          >
            {evidenceOutcomes.length} evidence quer{evidenceOutcomes.length === 1 ? "y" : "ies"}
            <ChevronDown className={clsx("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          </button>
          {expanded && (
            <ul className="divide-y divide-ink-100 border-t border-ink-100">
              {evidenceOutcomes.slice(0, 8).map((x) => (
                <li key={x.query.id}>
                  <button onClick={() => onOpenRun(x)} className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-ink-50 sm:px-6">
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink-700">{x.query.text}</span>
                    <span className="hidden max-w-[160px] truncate text-[12px] text-ink-400 sm:inline">Winner: {x.winner.business_name}</span>
                    <PositionPill outcome={x} />
                  </button>
                </li>
              ))}
              {evidenceOutcomes.length > 8 && <li className="px-6 py-2.5 text-[12px] text-ink-400">+ {evidenceOutcomes.length - 8} more in the Query Explorer</li>}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function Step({ label, badge, children }: { label: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="relative">
      <span className="absolute -left-[25px] top-1 h-2 w-2 rounded-full border-2 border-white bg-ink-900 ring-1 ring-ink-200" />
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="eyebrow">{label}</span>
        {badge}
      </div>
      {children}
    </li>
  );
}
