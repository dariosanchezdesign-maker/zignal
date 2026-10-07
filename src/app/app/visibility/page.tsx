"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { useStore } from "@/lib/store";
import type { IntentType, QueryOutcome } from "@/lib/model/types";
import type { Workspace } from "@/lib/engine/workspace";
import { YOU } from "@/lib/engine/insights";
import { splitAssociations } from "@/lib/engine/perception";
import { AskAI } from "@/components/ask-ai";
import { Drawer } from "@/components/drawer";
import { RunDrawer } from "@/components/run-detail";
import { PositionPill, RecommendationView } from "@/components/recommendation-view";
import { PerceptionBars, PerceptionSummary } from "@/components/perception";
import { CoverageList } from "@/components/score";
import { EntityAvatar, INTENT_HINT, INTENT_LABEL, PageHeader, Segmented, TrustLabel, pct } from "@/components/ui";

const INTENTS: IntentType[] = ["discovery", "best-of", "comparison", "local", "problem", "high-intent", "transactional"];
type Outcome = "all" | "recommended" | "missed";
type Tab = "questions" | "perception" | "ask";

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
  const tab: Tab = t === "ask" || t === "perception" ? t : "questions";
  const { ws } = useStore();

  return (
    <div>
      <PageHeader
        title="AI Visibility"
        description={`What AI tells ${ws.industry.audience} when they ask for a recommendation, and where ${ws.business.name} fits in.`}
      />
      <div className="scrollbar-none mb-6 flex gap-6 overflow-x-auto border-b border-ink-150">
        {(
          [
            { id: "questions", label: "How AI recommends you" },
            { id: "perception", label: "AI perception" },
            { id: "ask", label: "Ask AI about my business" },
          ] as { id: Tab; label: string }[]
        ).map((x) => (
          <button
            key={x.id}
            onClick={() => router.replace(x.id === "questions" ? "/app/visibility" : `/app/visibility?tab=${x.id}`)}
            className={clsx(
              "-mb-px shrink-0 border-b-2 px-1 pb-3 text-[14px] font-medium transition-colors",
              tab === x.id ? "border-ink-900 text-ink-900" : "border-transparent text-ink-500 hover:text-ink-800",
            )}
          >
            {x.label}
          </button>
        ))}
      </div>
      {tab === "ask" ? <AskAI ws={ws} /> : tab === "perception" ? <Perception ws={ws} /> : <Questions ws={ws} />}
    </div>
  );
}

function Questions({ ws }: { ws: Workspace }) {
  const [intent, setIntent] = useState<IntentType | "all">("all");
  const [outcome, setOutcome] = useState<Outcome>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [run, setRun] = useState<QueryOutcome | null>(null);

  const list = useMemo(
    () =>
      ws.outcomes.filter(
        (o) =>
          (intent === "all" || o.query.intent_type === intent) &&
          (outcome === "all" || (outcome === "recommended" ? o.you?.recommended : !o.you?.recommended)),
      ),
    [ws, intent, outcome],
  );

  useEffect(() => setSelectedId(null), [ws.business.id]);
  const selected = list.find((o) => o.query.id === selectedId) ?? list[0];

  const intentStats = INTENTS.map((i) => {
    const qs = ws.outcomes.filter((o) => o.query.intent_type === i);
    return { i, n: qs.length, rate: qs.length ? qs.filter((o) => o.you?.recommended).length / qs.length : 0 };
  }).filter((x) => x.n > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {intentStats.map((s) => (
          <button
            key={s.i}
            onClick={() => setIntent(intent === s.i ? "all" : s.i)}
            className={clsx(
              "focus-ring rounded-xl border p-3 text-left transition-all",
              intent === s.i ? "border-ink-900 bg-white ring-1 ring-ink-900" : "border-ink-150 bg-white hover:border-ink-300",
            )}
          >
            <div className="text-[12.5px] font-semibold">{INTENT_LABEL[s.i]}</div>
            <div className="truncate text-[11px] text-ink-400">{INTENT_HINT[s.i]}</div>
            <div className="mt-2.5 flex items-baseline justify-between">
              <span className="num text-[18px] font-semibold">{pct(s.rate)}</span>
              <span className="num text-[11px] text-ink-400">{s.n} q</span>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]">
        <div className="card flex flex-col overflow-hidden lg:sticky lg:top-[88px] lg:max-h-[calc(100vh-140px)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-150 px-4 py-3">
            <span className="text-[13px] font-semibold">
              {list.length} quer{list.length === 1 ? "y" : "ies"}
              {intent !== "all" && <span className="font-normal text-ink-400"> · {INTENT_LABEL[intent]}</span>}
            </span>
            <Segmented<Outcome>
              value={outcome}
              onChange={setOutcome}
              options={[
                { value: "all", label: "All" },
                { value: "recommended", label: "Recommended" },
                { value: "missed", label: "Missed" },
              ]}
            />
          </div>
          <ul className="flex-1 divide-y divide-ink-100 overflow-y-auto">
            {list.map((o) => (
              <li key={o.query.id}>
                <button
                  onClick={() => {
                    setSelectedId(o.query.id);
                    setMobileOpen(true);
                  }}
                  className={clsx(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                    selected?.query.id === o.query.id ? "bg-ink-50 lg:shadow-[inset_2px_0_0_#0E1116]" : "hover:bg-ink-50/60",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] leading-snug text-ink-800">{o.query.text}</div>
                    <div className="mt-1 text-[11.5px] text-ink-400">
                      {INTENT_LABEL[o.query.intent_type]} · {o.winner.matched_business_id === YOU ? "You're the top pick" : `Top pick: ${o.winner.business_name}`}
                    </div>
                  </div>
                  <PositionPill outcome={o} />
                </button>
              </li>
            ))}
            {!list.length && <li className="p-6 text-center text-[13px] text-ink-500">No queries match these filters.</li>}
          </ul>
        </div>

        <div className="hidden lg:block">
          {selected && (
            <div key={selected.query.id} className="card animate-fade-in p-7">
              <RecommendationView outcome={selected} ws={ws} onOpenRun={() => setRun(selected)} />
            </div>
          )}
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="text-[15px] font-semibold">Query coverage</div>
        <p className="mb-4 mt-1 text-[13px] text-ink-500">Share of queries in each category where AI mentions you.</p>
        <CoverageList ws={ws} />
      </div>

      <div className="lg:hidden">
        <Drawer open={mobileOpen && !!selected} onClose={() => setMobileOpen(false)} title="How AI answered">
          {selected && (
            <RecommendationView
              outcome={selected}
              ws={ws}
              compact
              onOpenRun={() => {
                setMobileOpen(false);
                setRun(selected);
              }}
            />
          )}
        </Drawer>
      </div>
      <RunDrawer outcome={run} ws={ws} onClose={() => setRun(null)} />
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
            <h2 className="text-[19px] font-semibold tracking-tight">How AI sees {ws.business.name}</h2>
            <p className="mt-1 max-w-2xl text-[13.5px] text-ink-500">
              Each bar is the share of relevant queries where AI recommended you and gave that reason, blended with how often the reason appears across all your recommendations.
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
        <p className="mt-1 text-[13px] text-ink-500">Most frequent AI-stated reasons across this simulation.</p>
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
                  {!top.length && <li className="text-[12.5px] text-ink-500">Not recommended in this simulation.</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
