"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, ChevronLeft, ChevronRight, MessageSquareText } from "lucide-react";
import { useStore, type RangeDays } from "@/lib/store";
import { periodChange, trendWindow } from "@/lib/engine/period";
import { askExamples } from "@/lib/engine/ask";
import { TrendChart } from "@/components/charts";
import { QueryAnswer } from "@/components/query-answer";
import { InsightList, TopicCoverage } from "@/components/insights";
import { Badge, Delta, EntityAvatar, ImpactBadge, ScoreRing, SectionHeader, Segmented, StatusBadge, fmtPos, pct } from "@/components/ui";

export default function Overview() {
  const { scan, range, setRange } = useStore();
  const { business, you, competitors, story } = scan;
  const change = periodChange(scan, range);
  const [qi, setQi] = useState(0);

  // Questions worth showing first: high intent, where the outcome is most telling.
  const spotlight = useMemo(() => {
    const score = (q: (typeof scan.queries)[number]) =>
      (q.intent === "high-intent" || q.intent === "comparison" ? 2 : 0) + (q.position && q.position > 1 ? 2 : 0) + (q.position === null ? 1.5 : 0);
    return [...scan.queries].sort((a, b) => score(b) - score(a)).slice(0, 6);
  }, [scan]);
  const q = spotlight[qi % spotlight.length];
  const toneBadge = story.tone === "leading" ? "positive" : story.tone === "contender" ? "caution" : "negative";

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* HERO */}
      <section className="card overflow-hidden">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="border-b border-ink-150 p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between">
              <span className="eyebrow">How visible is {business.name} to AI?</span>
            </div>
            <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
              <ScoreRing score={you.score} size={152} />
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-ink-500">AI Visibility Score</div>
                <div className="mt-1 flex items-center gap-2">
                  <Delta value={change.score} suffix=" pts" className="text-[13px]" />
                  <span className="text-[12px] text-ink-400">last {range} days</span>
                </div>
                <Badge tone={toneBadge} className="mt-4">
                  {story.tone === "leading" ? "Leading" : story.tone === "contender" ? "Contender" : "Behind competitors"}
                </Badge>
              </div>
            </div>
            <h1 className="mt-7 text-[21px] font-semibold leading-snug tracking-tight text-ink-900 sm:text-[23px]">{story.headline}</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-500">{story.detail}</p>
          </div>
          <div className="flex flex-col p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[14px] font-semibold">AI Visibility</div>
                <div className="text-[12px] text-ink-400">Last {range} days · re-tested daily</div>
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
            <div className="mt-6 flex-1">
              <TrendChart points={trendWindow(scan, range)} height={220} />
            </div>
          </div>
        </div>
        {/* Supporting metrics */}
        <div className="grid grid-cols-2 gap-px border-t border-ink-150 bg-ink-150 sm:grid-cols-5">
          <Metric label="Mention Rate" value={pct(you.mentionRate)} delta={change.mentionRate} suffix="%" hint="Questions where AI names you" />
          <Metric label="Recommendation Rate" value={pct(you.recommendationRate)} delta={change.recommendationRate} suffix="%" hint="AI puts you in its top 3" />
          <Metric label="Average Position" value={fmtPos(you.avgPosition)} delta={change.avgPosition} invert hint="When you're recommended" />
          <Metric label="Competitive Share" value={pct(you.share)} delta={change.share} suffix="%" hint="Your share of all recommendations" />
          <Metric label="Queries Tested" value={String(scan.queries.length)} delta={change.queries} hint="Customer questions monitored" className="col-span-2 sm:col-span-1" />
        </div>
      </section>

      {/* HOW AI RECOMMENDS YOU + COMPETITORS */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="card p-5 sm:p-7">
          <SectionHeader
            title="How AI recommends you"
            description="Real customer questions and what AI answered."
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
          <div key={q.id} className="mt-6 animate-fade-in">
            <QueryAnswer query={q} businessName={business.name} />
          </div>
          <Link href="/app/visibility" className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-900 hover:underline">
            See all {scan.queries.length} questions <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="flex flex-col gap-5">
          <div className="card p-5 sm:p-6">
            <SectionHeader title="Who AI recommends instead" description="Share of questions where each business is recommended." />
            <div className="mt-5 space-y-1">
              {[{ ...you, isYou: true }, ...competitors.map((c) => ({ ...c, isYou: false }))]
                .sort((a, b) => b.recommendationRate - a.recommendationRate)
                .map((e, i) => (
                  <div key={e.id} className={clsx("flex items-center gap-3 rounded-lg px-2 py-2", e.isYou && "bg-accent-50")}>
                    <span className="num w-4 text-[12px] font-semibold text-ink-400">{i + 1}</span>
                    <EntityAvatar name={e.name} you={e.isYou} size={26} />
                    <div className="min-w-0 flex-1">
                      <div className={clsx("truncate text-[13.5px]", e.isYou ? "font-semibold text-accent-900" : "font-medium")}>{e.name}</div>
                      <div className="mt-1 h-1 rounded-full bg-ink-100">
                        <div className={clsx("h-1 rounded-full", e.isYou ? "bg-accent-600" : "bg-ink-300")} style={{ width: `${e.recommendationRate * 100}%` }} />
                      </div>
                    </div>
                    <span className="num w-10 text-right text-[13px] font-semibold">{pct(e.recommendationRate)}</span>
                  </div>
                ))}
            </div>
            <Link href="/app/competitors" className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-900 hover:underline">
              What they&apos;re doing that you aren&apos;t <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <Link
            href="/app/visibility?tab=ask"
            className="group card relative overflow-hidden bg-ink-900 p-5 text-white transition-shadow hover:shadow-lift sm:p-6"
          >
            <div className="flex items-center gap-2 text-[12px] font-medium text-ink-300">
              <MessageSquareText className="h-4 w-4" /> Ask AI about my business
            </div>
            <p className="mt-3 text-[16px] font-medium leading-snug">“{askExamples(scan)[0]}”</p>
            <p className="mt-2 text-[13px] text-ink-300">See what AI understands about you — strengths, gaps and how likely it is to recommend you.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-white">
              Ask a question <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </section>

      {/* INDUSTRY INSIGHTS */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div>
          <SectionHeader eyebrow={`${scan.industry.label} insights`} title="What AI thinks you're good for" />
          <div className="mt-5">
            <InsightList insights={scan.insights} />
          </div>
        </div>
        <div className="card p-5 sm:p-6">
          <SectionHeader title="Visibility by topic" description={`How often AI recommends you, by what ${scan.industry.audience} ask about.`} />
          <div className="mt-3">
            <TopicCoverage scan={scan} />
          </div>
        </div>
      </section>

      {/* OPPORTUNITIES */}
      <section>
        <SectionHeader
          title="Your biggest opportunities"
          description="What to change to become the business AI recommends."
          action={
            <Link href="/app/opportunities" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-900 hover:underline">
              All opportunities <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {scan.opportunities.slice(0, 3).map((o) => (
            <Link key={o.id} href="/app/opportunities" className="card group flex flex-col p-5 transition-shadow hover:shadow-lift">
              <div className="flex items-center justify-between">
                <span className="num font-mono text-[12px] text-ink-400">Opportunity {String(o.index).padStart(2, "0")}</span>
                <ImpactBadge level={o.impact} />
              </div>
              <h3 className="mt-3 text-[15.5px] font-semibold leading-snug tracking-tight">{o.title}</h3>
              <p className="mt-2 line-clamp-3 flex-1 text-[13px] leading-relaxed text-ink-500">{o.why}</p>
              <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
                <span className="num text-[13px] font-semibold text-positive">+{o.expectedLift} pts</span>
                <StatusBadge status={o.status} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  delta,
  suffix = "",
  hint,
  invert,
  className,
}: {
  label: string;
  value: string;
  delta: number;
  suffix?: string;
  hint: string;
  invert?: boolean;
  className?: string;
}) {
  return (
    <div className={clsx("bg-white px-5 py-4 sm:px-6 sm:py-5", className)}>
      <div className="text-[12px] font-medium text-ink-500">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="num text-[24px] font-semibold tracking-tight">{value}</span>
        <Delta value={delta} suffix={suffix} invert={invert} />
      </div>
      <div className="mt-1 text-[11.5px] text-ink-400">{hint}</div>
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
