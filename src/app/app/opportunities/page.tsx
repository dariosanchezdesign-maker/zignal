"use client";

import { useState } from "react";
import clsx from "clsx";
import { Check, ChevronDown } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Insight, QueryOutcome } from "@/lib/model/types";
import type { Workspace } from "@/lib/engine/workspace";
import { winnableQuestions } from "@/lib/engine/summary";
import { ConversationDrawer, VerdictDot, verdictFor } from "@/components/conversation";
import { SimulationControl } from "@/components/simulation-control";
import { PageHeader, TrustLabel } from "@/components/ui";

export default function NextSteps() {
  const { ws, setInsightStatus } = useStore();
  const [open, setOpen] = useState<QueryOutcome | null>(null);
  const [all, setAll] = useState(false);
  const todo = ws.insights.filter((i) => i.status !== "completed");
  const done = ws.insights.filter((i) => i.status === "completed");

  return (
    <div className="max-w-3xl">
      <PageHeader title="Next steps" description="What to change so AI recommends you more often. Most important first." />

      {done.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-positive-100 bg-positive-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[14px] text-ink-800">
            You&apos;ve finished {done.length} step{done.length === 1 ? "" : "s"}. Re-check to see whether AI recommends you more.
          </p>
          <SimulationControl variant="button" />
        </div>
      )}

      <ol className="space-y-3">
        {todo.slice(0, all ? undefined : 3).map((o, i) => (
          <Step key={o.id} o={o} n={i + 1} ws={ws} first={i === 0} onToggle={() => setInsightStatus(o, "completed")} onStart={() => setInsightStatus(o, "in-progress")} onOpen={setOpen} />
        ))}
      </ol>
      {!all && todo.length > 3 && (
        <button onClick={() => setAll(true)} className="mt-4 w-full rounded-xl border border-dashed border-ink-200 py-3 text-[13.5px] font-medium text-ink-600 hover:border-ink-300 hover:text-ink-900">
          Show {todo.length - 3} more steps
        </button>
      )}

      {done.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-[15px] font-semibold text-ink-500">Done</h2>
          <ul className="space-y-2">
            {done.map((o) => (
              <li key={o.id} className="flex items-center gap-3 rounded-xl border border-ink-150 bg-white px-4 py-3">
                <button
                  aria-label="Mark as not done"
                  onClick={() => setInsightStatus(o, "not-started")}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-positive text-white"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </button>
                <span className="text-[14px] text-ink-500 line-through decoration-ink-300">{o.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConversationDrawer outcome={open} ws={ws} onClose={() => setOpen(null)} />
    </div>
  );
}

function Step({
  o,
  n,
  ws,
  first,
  onToggle,
  onStart,
  onOpen,
}: {
  o: Insight;
  n: number;
  ws: Workspace;
  first: boolean;
  onToggle: () => void;
  onStart: () => void;
  onOpen: (o: QueryOutcome) => void;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const wins = winnableQuestions(ws, o);
  const ids = new Set(o.evidence.flatMap((e) => e.query_ids ?? []));
  const examples = ws.outcomes.filter((x) => ids.has(x.query.id) && !x.you?.recommended).sort((a, b) => b.query.commercial_weight - a.query.commercial_weight);

  return (
    <li className={clsx("card overflow-hidden", first && "ring-1 ring-ink-900")}>
      <div className="flex gap-4 p-5 sm:p-6">
        <button
          aria-label="Mark as done"
          onClick={onToggle}
          className="focus-ring mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-ink-300 text-transparent transition-colors hover:border-positive hover:text-positive"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-400">
            <span className="num font-mono">Step {n}</span>
            {o.status === "in-progress" && <span className="rounded-md bg-accent-50 px-1.5 py-0.5 font-medium text-accent-700">In progress</span>}
          </div>
          <h3 className="mt-1 text-[17px] font-semibold leading-snug tracking-tight">{o.title}</h3>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-800">{o.recommendation}</p>
          <p className="mt-2.5 text-[13.5px] text-ink-500">
            Why: {o.observation} Could win about <span className="font-semibold text-ink-900">{wins} more question{wins === 1 ? "" : "s"}</span>.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {o.status === "not-started" && (
              <button onClick={onStart} className="focus-ring h-8 rounded-lg border border-ink-200 px-3 text-[13px] font-medium text-ink-700 hover:border-ink-300">
                I&apos;m on it
              </button>
            )}
            <button onClick={() => setShowWhy(!showWhy)} className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-500 hover:text-ink-900">
              Show evidence <ChevronDown className={clsx("h-4 w-4 transition-transform", showWhy && "rotate-180")} />
            </button>
          </div>
        </div>
      </div>

      {showWhy && (
        <div className="space-y-5 border-t border-ink-100 bg-ink-50/50 p-5 sm:px-6 sm:pl-[60px]">
          <div>
            <div className="eyebrow mb-2">What we measured</div>
            <dl className="grid gap-1.5 text-[13px]">
              {o.evidence.map((e) => (
                <div key={e.label} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 rounded-lg bg-white px-3 py-2 ring-1 ring-inset ring-ink-150">
                  <dt className="text-ink-600">{e.label}</dt>
                  <dd className="num font-medium text-ink-900">{e.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="eyebrow">Why it's happening</span>
              <TrustLabel kind="diagnosis" />
            </div>
            <p className="text-[13.5px] leading-relaxed text-ink-700">{o.diagnosis}</p>
          </div>
          {examples.length > 0 && (
            <div>
              <div className="eyebrow mb-2">Questions where AI picked someone else</div>
              <ul className="divide-y divide-ink-100 overflow-hidden rounded-xl bg-white ring-1 ring-inset ring-ink-150">
                {examples.slice(0, 5).map((x) => {
                  const v = verdictFor(x);
                  return (
                    <li key={x.query.id}>
                      <button onClick={() => onOpen(x)} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-ink-50">
                        <VerdictDot tone={v.tone} />
                        <span className="min-w-0 flex-1 truncate text-[13px] text-ink-800">{x.query.text}</span>
                        <span className="hidden max-w-[180px] truncate text-[12px] text-ink-400 sm:inline">{x.winner.business_name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
