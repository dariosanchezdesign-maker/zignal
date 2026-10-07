"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowRight, Check, CircleSlash } from "lucide-react";
import { Button, EntityAvatar, INTENT_LABEL, Logo, ScoreRing, pct } from "@/components/ui";
import { QueryAnswer } from "@/components/query-answer";
import { useStore } from "@/lib/store";
import { getCategory } from "@/lib/industries";
import type { ScanResult } from "@/lib/types";

const STAGES = [
  { t: "Understanding your business", ms: 1500 },
  { t: "Identifying your customers", ms: 1400 },
  { t: "Generating commercial questions", ms: 2600 },
  { t: "Testing AI recommendations", ms: 4200 },
  { t: "Analyzing competitors", ms: 2000 },
  { t: "Measuring your visibility", ms: 1600 },
  { t: "Finding opportunities", ms: 1300 },
];
const TOTAL = STAGES.reduce((a, s) => a + s.ms, 0);

export default function ScanPage() {
  const { hydrated, pendingScanId, activeId, scanFor, setActive, setPendingScan } = useStore();
  const id = pendingScanId ?? activeId;
  const scan = useMemo(() => (hydrated ? scanFor(id) : null), [hydrated, id, scanFor]);
  const [elapsed, setElapsed] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!scan || revealed) return;
    const start = performance.now() - elapsed;
    let raf = 0;
    const tick = (now: number) => {
      const e = now - start;
      setElapsed(e);
      if (e >= TOTAL + 500) setRevealed(true);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scan, revealed]);

  useEffect(() => {
    if (revealed && scan) {
      setActive(scan.business.id);
      setPendingScan(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  if (!scan) return <div className="min-h-screen bg-canvas" />;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo />
        {!revealed && (
          <button onClick={() => setRevealed(true)} className="focus-ring rounded-md px-2 py-1 text-[12.5px] text-ink-400 hover:text-ink-800">
            Skip to results
          </button>
        )}
      </header>
      {revealed ? <Reveal scan={scan} /> : <Scanning scan={scan} elapsed={elapsed} />}
    </div>
  );
}

function stageState(elapsed: number) {
  let acc = 0;
  for (let i = 0; i < STAGES.length; i++) {
    if (elapsed < acc + STAGES[i].ms) return { index: i, progress: (elapsed - acc) / STAGES[i].ms };
    acc += STAGES[i].ms;
  }
  return { index: STAGES.length, progress: 1 };
}

function Scanning({ scan, elapsed }: { scan: ScanResult; elapsed: number }) {
  const { index, progress } = stageState(elapsed);
  const { business, industry, queries } = scan;
  const cat = getCategory(industry, business.category);
  const overall = Math.min(1, elapsed / TOTAL);

  // Live feed contents per stage.
  const shownQueries = index < 2 ? 0 : index === 2 ? Math.ceil(progress * Math.min(queries.length, 14)) : Math.min(queries.length, 14);
  const tested = index < 3 ? 0 : index === 3 ? Math.floor(progress * queries.length) : queries.length;
  const compsShown = index < 4 ? 0 : index === 4 ? Math.ceil(progress * scan.competitors.length) : scan.competitors.length;

  return (
    <main className="mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8 sm:pt-12">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
        <div>
          <div className="eyebrow mb-3">AI Visibility Scan · {business.name}</div>
          <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.025em] sm:text-[38px]">Scanning how AI sees your business…</h1>
          <div className="mt-7 h-1 w-full overflow-hidden rounded-full bg-ink-150">
            <div className="h-full rounded-full bg-ink-900 transition-[width] duration-200" style={{ width: `${overall * 100}%` }} />
          </div>
          <ol className="mt-8 space-y-1">
            {STAGES.map((s, i) => {
              const done = i < index;
              const active = i === index;
              return (
                <li
                  key={s.t}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-300",
                    active ? "bg-white shadow-card ring-1 ring-ink-150" : "",
                  )}
                >
                  <span
                    className={clsx(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors",
                      done ? "bg-ink-900 text-white" : active ? "ring-1 ring-ink-900" : "ring-1 ring-ink-200",
                    )}
                  >
                    {done ? <Check className="h-3 w-3" strokeWidth={3} /> : active ? <span className="h-1.5 w-1.5 animate-pulsedot rounded-full bg-ink-900" /> : null}
                  </span>
                  <span className={clsx("text-[14.5px]", done ? "text-ink-500" : active ? "font-medium text-ink-900" : "text-ink-400")}>{s.t}</span>
                  <span className="ml-auto font-mono text-[11px] text-ink-400">
                    {done ? stageSummary(i, scan) : active ? "…" : ""}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="card min-h-[420px] overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-150 px-5 py-3">
            <span className="eyebrow">Live analysis</span>
            <span className="num font-mono text-[11px] text-ink-400">
              {tested > 0 ? `${tested}/${queries.length} questions tested` : `${Math.round(overall * 100)}%`}
            </span>
          </div>
          <div className="space-y-5 p-5">
            {index <= 1 && (
              <div className="animate-fade-in space-y-3">
                <FeedLine label="Business" value={business.name} />
                <FeedLine label="Category" value={cat.label} />
                <FeedLine label="Market" value={`${business.location}, Puerto Rico`} />
                {index >= 1 && (
                  <>
                    <FeedLine label="Customers" value={industry.audience} />
                    <FeedLine label="Looking for" value={business.primaryService || cat.services[0]} />
                  </>
                )}
              </div>
            )}

            {index >= 2 && index <= 3 && (
              <div className="space-y-1.5">
                {queries.slice(0, Math.max(shownQueries, 1)).map((q, i) => {
                  const result = i < tested ? q : null;
                  return (
                    <div key={q.id} className="flex animate-fade-up items-center gap-3 rounded-lg px-2 py-1.5 text-[13px]">
                      <span className="w-[86px] shrink-0 font-mono text-[10.5px] uppercase tracking-wide text-ink-400">{INTENT_LABEL[q.intent]}</span>
                      <span className="min-w-0 flex-1 truncate text-ink-700">{q.text}</span>
                      {result ? (
                        result.position ? (
                          <span className={clsx("num shrink-0 rounded px-1.5 text-[11.5px] font-semibold", result.position <= 3 ? "bg-accent-50 text-accent-700" : "bg-caution-50 text-caution")}>
                            #{result.position}
                          </span>
                        ) : (
                          <CircleSlash className="h-3.5 w-3.5 shrink-0 text-negative" />
                        )
                      ) : index === 3 ? (
                        <span className="h-1.5 w-1.5 shrink-0 animate-pulsedot rounded-full bg-ink-300" />
                      ) : null}
                    </div>
                  );
                })}
                {index === 3 && queries.length > 14 && (
                  <div className="px-2 pt-1 font-mono text-[11px] text-ink-400">+ {queries.length - 14} more questions in progress</div>
                )}
              </div>
            )}

            {index >= 4 && (
              <div className="space-y-2">
                <div className="mb-3 text-[13px] text-ink-500">Businesses AI recommends for these questions</div>
                {[{ id: "you", name: business.name, rate: scan.you.recommendationRate, you: true }, ...scan.competitors.slice(0, compsShown).map((c) => ({ id: c.id, name: c.name, rate: c.recommendationRate, you: false }))]
                  .sort((a, b) => b.rate - a.rate)
                  .map((e) => (
                    <div key={e.id} className="flex animate-fade-up items-center gap-3">
                      <EntityAvatar name={e.name} you={e.you} size={26} />
                      <span className={clsx("w-40 truncate text-[13px] sm:w-48", e.you ? "font-semibold" : "text-ink-700")}>{e.name}</span>
                      <div className="h-1.5 flex-1 rounded-full bg-ink-100">
                        <div
                          className={clsx("h-full rounded-full transition-[width] duration-700", e.you ? "bg-accent-600" : "bg-ink-300")}
                          style={{ width: index >= 5 || !e.you ? `${e.rate * 100}%` : "0%" }}
                        />
                      </div>
                      <span className="num w-10 text-right text-[12.5px] font-medium">{index >= 5 || !e.you ? pct(e.rate) : "—"}</span>
                    </div>
                  ))}
                {index >= 6 && (
                  <div className="mt-5 animate-fade-up rounded-lg border border-ink-150 bg-ink-50 px-3 py-2.5 text-[13px] text-ink-600">
                    {scan.opportunities.length} opportunities found · up to +{scan.opportunities.reduce((a, o) => a + o.expectedLift, 0)} visibility points
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function stageSummary(i: number, scan: ScanResult) {
  switch (i) {
    case 0:
      return getCategory(scan.industry, scan.business.category).label;
    case 1:
      return scan.industry.audience.split(" ")[0];
    case 2:
      return `${scan.queries.length} questions`;
    case 3:
      return `${scan.queries.filter((q) => q.mentioned).length} mentions`;
    case 4:
      return `${scan.competitors.length} competitors`;
    case 5:
      return `${scan.you.score}/100`;
    case 6:
      return `${scan.opportunities.length} found`;
  }
  return "";
}

function FeedLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex animate-fade-up items-baseline gap-4 border-b border-ink-100 pb-3 text-[14px]">
      <span className="w-24 shrink-0 font-mono text-[11px] uppercase tracking-wide text-ink-400">{label}</span>
      <span className="text-ink-800">{value}</span>
    </div>
  );
}

function useCountUp(target: number, ms = 1400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function Reveal({ scan }: { scan: ScanResult }) {
  const router = useRouter();
  const score = useCountUp(scan.you.score);
  const top = scan.competitors[0];
  const missed = scan.queries.filter((q) => !q.recommended).length;

  // The most revealing question: high-intent, competitor wins, you're absent.
  const featured =
    [...scan.queries].sort((a, b) => revealWeight(b) - revealWeight(a))[0] ?? scan.queries[0];

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-4 sm:px-8 sm:pt-10">
      <div className="animate-fade-up">
        <div className="eyebrow mb-3">Your AI Visibility Scan is ready</div>
        <h1 className="max-w-3xl text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[42px]">{scan.story.headline}</h1>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="space-y-5">
          <div className="card animate-fade-up p-6 [animation-delay:150ms] sm:p-7">
            <div className="flex items-center gap-6">
              <ScoreRing score={score} size={136} />
              <div>
                <div className="eyebrow">AI Visibility Score</div>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{scan.story.detail}</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-ink-150">
              <MiniStat label="Questions tested" value={String(scan.queries.length)} />
              <MiniStat label="Recommended" value={pct(scan.you.recommendationRate)} />
              <MiniStat label="Sent elsewhere" value={String(missed)} />
            </div>
          </div>
          {top && (
            <div className="card animate-fade-up p-6 [animation-delay:300ms]">
              <div className="eyebrow mb-4">Who AI recommends instead</div>
              <div className="space-y-3">
                {scan.competitors.slice(0, 3).map((c) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <EntityAvatar name={c.name} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium">{c.name}</div>
                      <div className="text-[12px] text-ink-500">Recommended in {pct(c.recommendationRate)} of questions</div>
                    </div>
                    <span className="num text-[15px] font-semibold">{c.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card animate-fade-up p-6 [animation-delay:450ms] sm:p-7">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-[13px] font-semibold">What AI said when a customer asked</span>
            <span className="text-[12px] text-ink-400">1 of {scan.queries.length}</span>
          </div>
          <QueryAnswer query={featured} businessName={scan.business.name} compact />
        </div>
      </div>

      <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-ink-150 bg-white p-6 sm:flex-row sm:items-center">
        <div>
          <div className="text-[16px] font-semibold tracking-tight">
            {scan.opportunities.length} ways to become the business AI recommends
          </div>
          <p className="mt-1 text-[14px] text-ink-500">
            See every question, every competitor, and exactly what to change. We&apos;ll keep monitoring as AI changes.
          </p>
        </div>
        <Button size="lg" onClick={() => router.push("/app")}>
          Open your dashboard <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </main>
  );
}

function revealWeight(q: ScanResult["queries"][number]) {
  const intent = q.intent === "high-intent" ? 3 : q.intent === "comparison" ? 2 : 1;
  const absent = q.position === null ? 3 : q.position > 2 ? 2 : 0;
  return intent + absent * 2 + (q.mentioned ? 0.5 : 0);
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-3 py-3">
      <div className="num text-[20px] font-semibold tracking-tight">{value}</div>
      <div className="mt-0.5 text-[11.5px] text-ink-500">{label}</div>
    </div>
  );
}
