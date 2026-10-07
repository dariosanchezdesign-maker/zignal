"use client";

import { useState } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Opportunity, OpportunityStatus, QueryResult } from "@/lib/types";
import { PositionPill } from "@/components/query-answer";
import { ImpactBadge, PageHeader, STATUS_LABEL, Segmented, StatusBadge } from "@/components/ui";

const STATUSES: OpportunityStatus[] = ["not-started", "in-progress", "completed"];

export default function Opportunities() {
  const { scan, setStatus } = useStore();
  const [filter, setFilter] = useState<OpportunityStatus | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const ops = scan.opportunities.filter((o) => filter === "all" || o.status === filter);
  const potential = scan.opportunities.filter((o) => o.status !== "completed").reduce((a, o) => a + o.expectedLift, 0);
  const done = scan.opportunities.filter((o) => o.status === "completed").length;

  return (
    <div>
      <PageHeader title="Your biggest opportunities" description="Each one translates what AI is doing into a concrete change you can make." />

      <div className="mb-6 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-ink-150 bg-ink-150">
        <Summary label="Potential lift" value={`+${potential}`} unit="pts" hint={`From ${scan.you.score} toward ${Math.min(100, scan.you.score + potential)}`} />
        <Summary label="Open" value={String(scan.opportunities.length - done)} hint="Not started or in progress" />
        <Summary label="Completed" value={String(done)} hint="Re-measured on the next scan" />
      </div>

      <div className="mb-4 overflow-x-auto">
        <Segmented<OpportunityStatus | "all">
          value={filter}
          onChange={setFilter}
          options={[{ value: "all", label: "All" }, ...STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
        />
      </div>

      <div className="space-y-3">
        {ops.map((o) => (
          <OpportunityCard
            key={o.id}
            o={o}
            open={openId === o.id}
            onToggle={() => setOpenId(openId === o.id ? null : o.id)}
            onStatus={(s) => setStatus(o.id, s)}
            queries={scan.queries.filter((q) => q.topic === o.topicId)}
          />
        ))}
        {!ops.length && <div className="card p-10 text-center text-[14px] text-ink-500">Nothing here yet.</div>}
      </div>
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
  open,
  onToggle,
  onStatus,
  queries,
}: {
  o: Opportunity;
  open: boolean;
  onToggle: () => void;
  onStatus: (s: OpportunityStatus) => void;
  queries: QueryResult[];
}) {
  const lost = queries.filter((q) => !q.recommended);
  return (
    <div className={clsx("card overflow-hidden transition-shadow", open && "shadow-lift", o.status === "completed" && "opacity-80")}>
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="num font-mono text-[12px] text-ink-400">Opportunity {String(o.index).padStart(2, "0")}</span>
            <ImpactBadge level={o.impact} prefix="Impact: " />
          </div>
          <h3 className={clsx("mt-2.5 text-[17px] font-semibold leading-snug tracking-tight sm:text-[18px]", o.status === "completed" && "line-through decoration-ink-300")}>
            {o.title}
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <div className="eyebrow mb-1.5">Why</div>
              <p className="text-[13.5px] leading-relaxed text-ink-600">{o.why}</p>
            </div>
            <div>
              <div className="eyebrow mb-1.5">Recommended action</div>
              <p className="text-[13.5px] leading-relaxed text-ink-800">{o.action}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-row items-end justify-between gap-4 border-t border-ink-100 pt-4 lg:flex-col lg:items-stretch lg:justify-start lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div>
            <div className="eyebrow">Expected improvement</div>
            <div className="num mt-1 text-[26px] font-semibold tracking-tight text-positive">+{o.expectedLift}</div>
            <div className="text-[11.5px] text-ink-400">visibility pts · {o.affectedQueries} questions</div>
          </div>
          <div className="lg:mt-4">
            <div className="eyebrow mb-1.5 hidden lg:block">Status</div>
            <label className="relative inline-flex">
              <span className="sr-only">Status</span>
              <select
                value={o.status}
                onChange={(e) => onStatus(e.target.value as OpportunityStatus)}
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
          </div>
        </div>
      </div>
      <button onClick={onToggle} className="flex w-full items-center justify-between border-t border-ink-100 bg-ink-50/60 px-5 py-2.5 text-[12.5px] font-medium text-ink-600 hover:text-ink-900 sm:px-6">
        {lost.length} affected question{lost.length === 1 ? "" : "s"} where AI recommends someone else
        <ChevronDown className={clsx("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="divide-y divide-ink-100 border-t border-ink-100">
          {lost.slice(0, 8).map((q) => (
            <li key={q.id} className="flex items-center gap-3 px-5 py-2.5 sm:px-6">
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink-700">{q.text}</span>
              <span className="hidden text-[12px] text-ink-400 sm:inline">Winner: {q.winnerName}</span>
              <PositionPill position={q.position} mentioned={q.mentioned} size="sm" />
            </li>
          ))}
          {!lost.length && <li className="px-6 py-3 text-[13px] text-ink-500">AI already recommends you on every question in this topic.</li>}
        </ul>
      )}
    </div>
  );
}
