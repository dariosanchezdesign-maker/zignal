"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import type { QueryOutcome } from "@/lib/model/types";
import { windowed } from "@/lib/engine/history";
import { outOfTen, topReasons, winnableQuestions } from "@/lib/engine/summary";
import { ConversationCard, ConversationDrawer } from "@/components/conversation";
import { ScoreExplainer } from "@/components/score";
import { Delta, EntityAvatar } from "@/components/ui";

export default function Home() {
  const { ws, setInsightStatus } = useStore();
  const { business, you, narrative } = ws;
  const [explain, setExplain] = useState(false);
  const [open, setOpen] = useState<QueryOutcome | null>(null);

  const yours = outOfTen(you.recommendation_rate);
  const month = windowed(ws.history, 30);
  const delta = month.length > 1 ? month[month.length - 1].score - month[0].score : 0;
  const rival = ws.competitorMetrics[0];
  const rivalReasons = rival ? topReasons(ws, rival.entity_id) : [];
  const next = ws.insights.find((i) => i.status !== "completed");

  // Three telling examples: a valuable miss, a close second, and a win.
  const examples = useMemo(() => {
    const byValue = [...ws.outcomes].sort((a, b) => b.query.commercial_weight - a.query.commercial_weight);
    const miss = byValue.find((o) => !o.you?.recommended);
    const close = byValue.find((o) => o.you?.recommended && (o.you.position ?? 0) >= 2);
    const win = byValue.find((o) => o.you?.position === 1);
    return [miss, close, win].filter((x): x is QueryOutcome => !!x);
  }, [ws]);

  return (
    <div className="space-y-8">
      {/* 1. Does AI recommend me? */}
      <section className="card p-6 sm:p-9">
        <div className="eyebrow">
          {business.name} · {business.location}
        </div>
        <h1 className="mt-3 max-w-3xl text-balance text-[30px] font-semibold leading-[1.12] tracking-tight sm:text-[40px]">
          AI recommends you in <span className="whitespace-nowrap text-accent-600">{yours} of 10</span> customer questions.
        </h1>
        <div className="mt-6 flex gap-1.5" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className={clsx("h-2.5 flex-1 rounded-full", i < yours ? "bg-accent-600" : "bg-ink-150")} />
          ))}
        </div>
        <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-ink-600">{narrative.strengths}</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-500">
          <span>
            Based on <span className="font-medium text-ink-800">{ws.queries.length} questions</span> your customers ask
          </span>
          <button onClick={() => setExplain(true)} className="font-medium text-ink-800 underline decoration-ink-300 underline-offset-4 hover:decoration-ink-800">
            Visibility score {you.score}
          </button>
          {month.length > 1 && (
            <span className="inline-flex items-center gap-1">
              <Delta value={delta} suffix=" pts" /> in 30 days
            </span>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* 2. Who wins instead? */}
        {rival && (
          <div className="card flex flex-col p-6">
            <div className="eyebrow">Who AI recommends instead</div>
            <div className="mt-4 flex items-center gap-3">
              <EntityAvatar name={rival.name} size={40} />
              <div className="min-w-0">
                <div className="truncate text-[19px] font-semibold tracking-tight">{rival.name}</div>
                <div className="text-[14px] text-ink-600">
                  Recommended in <span className="font-semibold text-ink-900">{outOfTen(rival.recommendation_rate)} of 10</span> questions (you: {yours} of 10)
                </div>
              </div>
            </div>
            {rivalReasons.length > 0 && (
              <p className="mt-4 rounded-lg bg-ink-50 px-3.5 py-2.5 text-[14px] text-ink-700">
                AI&apos;s reasons: {rivalReasons.map((r, i) => (
                  <span key={r}>
                    {i > 0 && " · "}
                    <span className="font-medium text-ink-900">{r.charAt(0).toUpperCase() + r.slice(1)}</span>
                  </span>
                ))}
              </p>
            )}
            <ul className="mt-4 space-y-1.5 text-[13.5px] text-ink-600">
              {ws.competitorMetrics.slice(1).map((c) => (
                <li key={c.entity_id} className="flex justify-between gap-3">
                  <span className="truncate">{c.name}</span>
                  <span className="num shrink-0">{outOfTen(c.recommendation_rate)} of 10</span>
                </li>
              ))}
            </ul>
            <Link href="/app/competitors" className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[13.5px] font-medium text-ink-900 hover:underline">
              Compare competitors <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {/* 3. What should I do? */}
        <div className="card flex flex-col bg-ink-900 p-6 text-white">
          <div className="eyebrow text-ink-300">Do this next</div>
          {next ? (
            <>
              <h2 className="mt-4 text-[21px] font-semibold leading-snug tracking-tight">{next.title}</h2>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-200">{next.observation}</p>
              <p className="mt-4 text-[14px] text-ink-200">
                Could win about <span className="font-semibold text-white">{winnableQuestions(ws, next)} more questions</span>.
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-6">
                <Link href="/app/opportunities" className="focus-ring inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-white px-4 text-[14px] font-medium text-ink-900 hover:bg-ink-100">
                  Show me how <ArrowRight className="h-4 w-4" />
                </Link>
                {next.status === "not-started" && (
                  <button
                    onClick={() => setInsightStatus(next, "in-progress")}
                    className="focus-ring inline-flex h-10 items-center rounded-[10px] border border-white/25 px-4 text-[14px] font-medium text-white hover:bg-white/10"
                  >
                    I&apos;m on it
                  </button>
                )}
                {next.status === "in-progress" && <span className="inline-flex h-10 items-center px-3 text-[13px] text-ink-300">In progress</span>}
              </div>
            </>
          ) : (
            <p className="mt-4 text-[15px] text-ink-200">You&apos;ve finished every next step. Re-check to measure the change.</p>
          )}
        </div>
      </section>

      {/* What AI actually said */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[19px] font-semibold tracking-tight">What AI said when customers asked</h2>
            <p className="mt-1 text-[14px] text-ink-500">Tap one to read the full answer.</p>
          </div>
          <Link href="/app/queries" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-900 hover:underline">
            All {ws.queries.length} questions <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {examples.map((o) => (
            <ConversationCard key={o.query.id} o={o} onOpen={() => setOpen(o)} />
          ))}
        </div>
      </section>

      <div className="flex justify-center pt-2">
        <Link href="/app/visibility" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-500 hover:text-ink-900">
          Want the details? See the full analysis <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <ScoreExplainer ws={ws} open={explain} onClose={() => setExplain(false)} />
      <ConversationDrawer outcome={open} ws={ws} onClose={() => setOpen(null)} />
    </div>
  );
}
