"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, ChevronLeft, ChevronRight, Info, MessageSquareText } from "lucide-react";
import { useStore, type RangeDays } from "@/lib/store";
import { askExamples } from "@/lib/engine/ask";
import { windowed } from "@/lib/engine/history";
import { YOU, INSIGHT_LABEL } from "@/lib/engine/insights";
import type { QueryOutcome } from "@/lib/model/types";
import { TrendChart } from "@/components/charts";
import { RecommendationView } from "@/components/recommendation-view";
import { RunDrawer } from "@/components/run-detail";
import { ScoreExplainer } from "@/components/score";
import { PerceptionBars, PerceptionSummary } from "@/components/perception";
import { SimulationControl } from "@/components/simulation-control";
import { Badge, Delta, EntityAvatar, ImpactBadge, ScoreRing, SectionHeader, Segmented, StatusBadge, TrustLabel, fmtPos, pct } from "@/components/ui";

export default function Overview() {
  const { ws, range, setRange } = useStore();
  const { business, you, narrative } = ws;
  const [explain, setExplain] = useState(false);
  const [run, setRun] = useState<QueryOutcome | null>(null);
  const [qi, setQi] = useState(0);

  const history = windowed(ws.history, range);
  const delta = history.length > 1 ? history[history.length - 1].score - history[0].score : 0;

  // Most telling questions first: high value, where a competitor beat you.
  const spotlight = useMemo(() => {
    const w = (o: QueryOutcome) => o.query.commercial_weight / 20 + (o.you?.recommended ? (o.you.position ?? 1) - 1 : 3);
    return [...ws.outcomes].sort((a, b) => w(b) - w(a)).slice(0, 8);
  }, [ws]);
  const current = spotlight[qi % spotlight.length];

  const tone = narrative.tone === "leading" ? "positive" : narrative.tone === "contender" ? "caution" : "negative";
  const board = [{ ...you, isYou: true }, ...ws.competitorMetrics.map((c) => ({ ...c, isYou: false }))].sort((a, b) => b.recommendation_rate - a.recommendation_rate);

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* HERO: score + narrative */}
      <section className="card overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="border-b border-ink-150 p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow">How visible is {business.name} to AI?</span>
            </div>
            <button onClick={() => setExplain(true)} className="focus-ring group mt-6 flex w-full flex-col gap-5 rounded-xl text-left sm:flex-row sm:items-center">
              <ScoreRing score={you.score} size={148} />
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-ink-500">AI Visibility Score</div>
                <div className="mt-1 flex items-center gap-2">
                  <Delta value={delta} suffix=" pts" className="text-[13px]" />
                  <span className="text-[12px] text-ink-400">last {range} days</span>
                </div>
                <Badge tone={tone} className="mt-3">
                  {narrative.tone === "leading" ? "Leading" : narrative.tone === "contender" ? "Contender" : "Behind competitors"}
                </Badge>
                <div className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-700 group-hover:underline">
                  <Info className="h-3.5 w-3.5" /> Why {you.score}?
                </div>
              </div>
            </button>
          </div>
          <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
            <div className="flex flex-wrap gap-1.5">
              <TrustLabel kind="simulated" />
              <TrustLabel kind="diagnosis" />
            </div>
            <h1 className="text-[22px] font-semibold leading-snug tracking-tight sm:text-[25px]">{narrative.headline}</h1>
            <p className="text-[15px] leading-relaxed text-ink-600">{narrative.strengths}</p>
            {narrative.highIntentWarning && (
              <p className="rounded-lg border border-caution-100 bg-caution-50/70 px-3.5 py-2.5 text-[13.5px] leading-snug text-ink-800">{narrative.highIntentWarning}</p>
            )}
            <p className="text-[15px] font-medium leading-relaxed text-ink-900">{narrative.opportunity}</p>
          </div>
        </div>
        {/* Score components */}
        <div className="grid grid-cols-2 gap-px border-t border-ink-150 bg-ink-150 sm:grid-cols-5">
          {you.components.map((c, i) => (
            <button
              key={c.key}
              onClick={() => setExplain(true)}
              className={clsx("bg-white px-5 py-4 text-left transition-colors hover:bg-ink-50 sm:px-6", i === 4 && "col-span-2 sm:col-span-1")}
            >
              <div className="text-[12px] font-medium text-ink-500">{c.label}</div>
              <div className="num mt-1 text-[22px] font-semibold tracking-tight">
                {c.key === "recommendation"
                  ? pct(you.recommendation_rate)
                  : c.key === "position"
                    ? fmtPos(you.avg_position)
                    : c.key === "coverage"
                      ? pct(you.coverage)
                      : c.key === "share"
                        ? pct(you.share_of_voice)
                        : pct(you.high_intent_visibility)}
              </div>
              <div className="mt-0.5 text-[11.5px] text-ink-400">
                {Math.round(c.normalized)}/100 · weight {Math.round(c.weight * 100)}%
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* TREND + SIMULATION */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[15px] font-semibold">AI Visibility</div>
              <div className="mt-0.5 text-[12px] text-ink-400">
                {business.is_demo ? "Simulated monitoring history" : "Your simulation history"} · last {range} days
              </div>
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
              <TrendChart points={history.map((h) => ({ date: h.simulation.run_date, score: h.score }))} height={210} />
            ) : (
              <div className="flex h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 text-center">
                <div className="num text-[28px] font-semibold">{you.score}</div>
                <p className="mt-1 max-w-xs text-[13px] text-ink-500">One simulation so far. Run another to start building your history.</p>
              </div>
            )}
          </div>
          <p className="mt-3 text-[11.5px] text-ink-400">
            {history.length} simulation{history.length === 1 ? "" : "s"} in this window. Each point is a full re-run of all {ws.queries.length} queries.
          </p>
        </div>
        <SimulationControl />
      </section>

      {/* HOW AI RECOMMENDS YOU + COMPETITORS */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="card p-5 sm:p-7">
          <SectionHeader
            title="How AI recommends you"
            description="Customer questions, what AI answered, and why."
            action={
              <div className="flex items-center gap-1">
                <span className="num mr-2 text-[12px] text-ink-400">
                  {(qi % spotlight.length) + 1} / {spotlight.length}
                </span>
                <IconBtn label="Previous question" onClick={() => setQi((qi - 1 + spotlight.length) % spotlight.length)}>
                  <ChevronLeft className="h-4 w-4" />
                </IconBtn>
                <IconBtn label="Next question" onClick={() => setQi(qi + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </IconBtn>
              </div>
            }
          />
          <div key={current.query.id} className="mt-6 animate-fade-in">
            <RecommendationView outcome={current} ws={ws} onOpenRun={() => setRun(current)} />
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="card p-5 sm:p-6">
            <SectionHeader title="Who is AI recommending instead?" />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-ink-400">
                    <th className="pb-2 font-medium">Business</th>
                    <th className="pb-2 text-right font-medium">Rec. rate</th>
                    <th className="pb-2 text-right font-medium">Avg pos.</th>
                    <th className="pb-2 text-right font-medium">SoV</th>
                  </tr>
                </thead>
                <tbody>
                  {board.map((e) => (
                    <tr key={e.entity_id} className={clsx(e.isYou && "bg-accent-50")}>
                      <td className="rounded-l-lg py-2 pl-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <EntityAvatar name={e.name} you={e.isYou} size={22} />
                          <span className={clsx("truncate", e.isYou ? "font-semibold text-accent-900" : "font-medium")}>{e.isYou ? `${e.name} (you)` : e.name}</span>
                        </span>
                      </td>
                      <td className="num py-2 text-right font-semibold">{pct(e.recommendation_rate)}</td>
                      <td className="num py-2 text-right">{fmtPos(e.avg_position)}</td>
                      <td className="num rounded-r-lg py-2 pr-2 text-right">{pct(e.share_of_voice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link href="/app/competitors" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-900 hover:underline">
              See what they&apos;re credited with <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <Link href="/app/visibility?tab=ask" className="group card relative overflow-hidden bg-ink-900 p-5 text-white transition-shadow hover:shadow-lift sm:p-6">
            <div className="flex items-center gap-2 text-[12px] font-medium text-ink-300">
              <MessageSquareText className="h-4 w-4" /> Ask AI about my business
            </div>
            <p className="mt-3 text-[16px] font-medium leading-snug">“{askExamples(ws)[0]}”</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-white">
              Ask a question <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </section>

      {/* AI PERCEPTION */}
      <section className="card p-5 sm:p-7">
        <SectionHeader
          eyebrow="AI perception"
          title={`How AI sees ${business.name}`}
          description="What AI credits you with when it recommends you, measured from the reasons it states in its answers."
          action={
            <Link href="/app/visibility?tab=perception" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-900 hover:underline">
              Compare with competitors <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <PerceptionBars list={ws.perception[YOU]} limit={8} />
          <PerceptionSummary ws={ws} />
        </div>
      </section>

      {/* OPPORTUNITIES */}
      <section>
        <SectionHeader
          title="Your biggest opportunities"
          description="Each one is built from query-level evidence."
          action={
            <Link href="/app/opportunities" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-900 hover:underline">
              All {ws.insights.length} opportunities <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {ws.insights
            .filter((i) => i.status !== "completed")
            .slice(0, 3)
            .map((o) => (
              <Link key={o.id} href="/app/opportunities" className="card group flex flex-col p-5 transition-shadow hover:shadow-lift">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11.5px] font-medium text-ink-500">{INSIGHT_LABEL[o.type]}</span>
                  <ImpactBadge level={o.severity} />
                </div>
                <h3 className="mt-3 text-[15.5px] font-semibold leading-snug tracking-tight">{o.title}</h3>
                <p className="mt-2 line-clamp-3 flex-1 text-[13px] leading-relaxed text-ink-500">{o.observation}</p>
                <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
                  <span className="num text-[13px] font-semibold text-positive">+{o.expected_impact.points} pts projected</span>
                  <StatusBadge status={o.status} />
                </div>
              </Link>
            ))}
        </div>
      </section>

      <ScoreExplainer ws={ws} open={explain} onClose={() => setExplain(false)} />
      <RunDrawer outcome={run} ws={ws} onClose={() => setRun(null)} />
    </div>
  );
}

function IconBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg border border-ink-150 bg-white text-ink-600 hover:border-ink-300 hover:text-ink-900"
    >
      {children}
    </button>
  );
}
