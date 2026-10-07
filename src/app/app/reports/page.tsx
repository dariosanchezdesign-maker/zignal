"use client";

import { useState } from "react";
import { Check, Link2, Printer } from "lucide-react";
import { useStore } from "@/lib/store";
import { windowed } from "@/lib/engine/history";
import { YOU } from "@/lib/engine/insights";
import { Sparkline } from "@/components/charts";
import { Button, Delta, EntityAvatar, ImpactBadge, Logo, PageHeader, TrustLabel, fmtPos, pct } from "@/components/ui";

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleDateString("en-US", opts);

export default function Reports() {
  const { ws } = useStore();
  const [copied, setCopied] = useState(false);
  const { business, you, narrative } = ws;
  const month = windowed(ws.history, 30);
  const change = month.length > 1 ? month[month.length - 1].score - month[0].score : 0;
  const wins = ws.outcomes.filter((o) => o.you?.position === 1).sort((a, b) => b.query.commercial_weight - a.query.commercial_weight).slice(0, 4);
  const losses = ws.outcomes.filter((o) => !o.you?.recommended && o.query.commercial_weight >= 60).sort((a, b) => b.query.commercial_weight - a.query.commercial_weight).slice(0, 4);
  const weekly = ws.history.filter((_, i) => (ws.history.length - 1 - i) % 7 === 0).slice(-8).reverse();

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title="Reports"
          description="A monthly summary of the latest simulation, ready to share."
          action={
            process.env.NEXT_PUBLIC_EMBED === "1" ? undefined : (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href).catch(() => {});
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1600);
                  }}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy link"}
                </Button>
                <Button size="sm" onClick={() => window.print()}>
                  <Printer className="h-3.5 w-3.5" /> Download PDF
                </Button>
              </div>
            )
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <article className="card p-6 sm:p-10">
          <header className="flex flex-col gap-4 border-b border-ink-150 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Logo />
              <h2 className="mt-6 text-[24px] font-semibold tracking-tight">AI Visibility Report</h2>
              <p className="mt-1 text-[14px] text-ink-500">
                {business.name} · {business.location}, Puerto Rico · {fmt(ws.latest.run_date, { month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {business.is_demo && <TrustLabel kind="demo" />}
              <TrustLabel kind="simulated" />
            </div>
          </header>

          <section className="grid grid-cols-1 gap-6 border-b border-ink-150 py-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <div>
              <div className="eyebrow">AI Visibility Score</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="num text-[48px] font-semibold leading-none tracking-tight">{you.score}</span>
                <span className="text-ink-400">/ 100</span>
              </div>
              <Delta value={change} suffix=" pts over 30 days" className="mt-2" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-[16px] font-semibold leading-snug">{narrative.headline}</h3>
              <p className="text-[14px] leading-relaxed text-ink-600">{narrative.strengths}</p>
              <p className="text-[14px] leading-relaxed text-ink-600">{narrative.opportunity}</p>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-4 border-b border-ink-150 py-6 sm:grid-cols-5">
            {you.components.map((c) => (
              <div key={c.key}>
                <div className="num text-[22px] font-semibold">{Math.round(c.normalized)}</div>
                <div className="text-[12px] text-ink-500">{c.label}</div>
              </div>
            ))}
          </section>

          <section className="border-b border-ink-150 py-6">
            <h3 className="mb-3 text-[14px] font-semibold">Who AI recommends</h3>
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-[11.5px] uppercase tracking-wide text-ink-400">
                  <th className="pb-2 font-medium">Business</th>
                  <th className="pb-2 text-right font-medium">Rec. rate</th>
                  <th className="hidden pb-2 text-right font-medium sm:table-cell">Avg position</th>
                  <th className="pb-2 text-right font-medium">SoV</th>
                  <th className="pb-2 text-right font-medium">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {[{ ...you, isYou: true }, ...ws.competitorMetrics.map((c) => ({ ...c, isYou: false }))]
                  .sort((a, b) => b.score - a.score)
                  .map((e) => (
                    <tr key={e.entity_id}>
                      <td className="py-2">
                        <span className="flex items-center gap-2">
                          <EntityAvatar name={e.name} you={e.isYou} size={20} />
                          <span className={e.isYou ? "font-semibold" : ""}>{e.name}</span>
                        </span>
                      </td>
                      <td className="num py-2 text-right">{pct(e.recommendation_rate)}</td>
                      <td className="num hidden py-2 text-right sm:table-cell">{fmtPos(e.avg_position)}</td>
                      <td className="num py-2 text-right">{pct(e.share_of_voice)}</td>
                      <td className="num py-2 text-right font-medium">{e.score}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>

          <section className="grid grid-cols-1 gap-6 border-b border-ink-150 py-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-[14px] font-semibold">Where AI recommends you first</h3>
              <ul className="space-y-2 text-[13px] text-ink-700">
                {wins.length ? wins.map((o) => <li key={o.query.id}>“{o.query.text}”</li>) : <li className="text-ink-500">No #1 positions in this simulation.</li>}
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-[14px] font-semibold">High-value queries you&apos;re missing</h3>
              <ul className="space-y-2 text-[13px] text-ink-700">
                {losses.length ? (
                  losses.map((o) => (
                    <li key={o.query.id}>
                      “{o.query.text}” <span className="text-ink-400">: {o.winner.matched_business_id === YOU ? "you" : o.winner.business_name}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-ink-500">None. AI recommends you in every high-value query.</li>
                )}
              </ul>
            </div>
          </section>

          <section className="pt-6">
            <h3 className="mb-3 text-[14px] font-semibold">Priorities for next month</h3>
            <ol className="space-y-3">
              {ws.insights
                .filter((i) => i.status !== "completed")
                .slice(0, 3)
                .map((o, i) => (
                  <li key={o.id} className="flex gap-3">
                    <span className="num font-mono text-[12px] text-ink-400">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-[13.5px] font-medium">
                        {o.title} <ImpactBadge level={o.severity} />
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{o.recommendation}</p>
                    </div>
                  </li>
                ))}
            </ol>
          </section>
        </article>

        <aside className="no-print card h-fit p-5">
          <div className="text-[13.5px] font-semibold">Weekly snapshots</div>
          <p className="mt-0.5 text-[12px] text-ink-500">{business.is_demo ? "Simulated monitoring history" : "Your simulations"}</p>
          <ul className="mt-4 divide-y divide-ink-100">
            {weekly.map((w, i) => {
              const idx = ws.history.indexOf(w);
              const spark = ws.history.slice(Math.max(0, idx - 7), idx + 1).map((t) => t.score);
              return (
                <li key={w.simulation.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <div className="text-[13px] font-medium">{fmt(w.simulation.run_date, { month: "short", day: "numeric" })}</div>
                    <div className="num text-[12px] text-ink-500">Score {w.score}</div>
                  </div>
                  {spark.length > 1 && <Sparkline values={spark} width={64} height={22} className={i === 0 ? "text-accent-600" : "text-ink-300"} />}
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
}
