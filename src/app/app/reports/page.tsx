"use client";

import { useState } from "react";
import { Check, Link2, Printer } from "lucide-react";
import { useStore } from "@/lib/store";
import { periodChange } from "@/lib/engine/period";
import { Sparkline } from "@/components/charts";
import { Button, Delta, EntityAvatar, ImpactBadge, Logo, PageHeader, fmtPos, pct } from "@/components/ui";

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", opts);

export default function Reports() {
  const { scan } = useStore();
  const [copied, setCopied] = useState(false);
  const { business, you, competitors, story, trend } = scan;
  const today = trend[trend.length - 1].date;
  const change = periodChange(scan, 30);
  const wins = scan.queries.filter((q) => q.position === 1).slice(0, 4);
  const losses = scan.queries.filter((q) => q.position === null && (q.intent === "high-intent" || q.intent === "comparison")).slice(0, 4);
  const weekly = trend.filter((_, i) => (trend.length - 1 - i) % 7 === 0).slice(-8).reverse();

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title="Reports"
          description="A monthly summary you can share with your team, partners or clients."
          action={
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
                {business.name} · {business.location}, Puerto Rico · {fmt(today, { month: "long", year: "numeric" })}
              </p>
            </div>
            {business.isDemo && <span className="font-mono text-[10.5px] uppercase tracking-wider text-caution">Demo workspace · fictional</span>}
          </header>

          <section className="grid gap-6 border-b border-ink-150 py-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <div>
              <div className="eyebrow">AI Visibility Score</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="num text-[48px] font-semibold leading-none tracking-tight">{you.score}</span>
                <span className="text-ink-400">/ 100</span>
              </div>
              <Delta value={change.score} suffix=" pts vs last month" className="mt-2" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold leading-snug">{story.headline}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-600">{story.detail}</p>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-4 border-b border-ink-150 py-6 sm:grid-cols-4">
            {[
              ["Mention rate", pct(you.mentionRate)],
              ["Recommendation rate", pct(you.recommendationRate)],
              ["Average position", fmtPos(you.avgPosition)],
              ["Questions tested", String(scan.queries.length)],
            ].map(([l, v]) => (
              <div key={l}>
                <div className="num text-[22px] font-semibold">{v}</div>
                <div className="text-[12px] text-ink-500">{l}</div>
              </div>
            ))}
          </section>

          <section className="border-b border-ink-150 py-6">
            <h3 className="mb-3 text-[14px] font-semibold">Competitive landscape</h3>
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-[11.5px] uppercase tracking-wide text-ink-400">
                  <th className="pb-2 font-medium">Business</th>
                  <th className="pb-2 text-right font-medium">Visibility</th>
                  <th className="pb-2 text-right font-medium">Recommended</th>
                  <th className="hidden pb-2 text-right font-medium sm:table-cell">Avg. position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {[{ ...you, isYou: true }, ...competitors.map((c) => ({ ...c, isYou: false }))]
                  .sort((a, b) => b.score - a.score)
                  .map((e) => (
                    <tr key={e.id}>
                      <td className="py-2">
                        <span className="flex items-center gap-2">
                          <EntityAvatar name={e.name} you={e.isYou} size={20} />
                          <span className={e.isYou ? "font-semibold" : ""}>{e.name}</span>
                        </span>
                      </td>
                      <td className="num py-2 text-right font-medium">{e.score}</td>
                      <td className="num py-2 text-right">{pct(e.recommendationRate)}</td>
                      <td className="num hidden py-2 text-right sm:table-cell">{fmtPos(e.avgPosition)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>

          <section className="grid gap-6 border-b border-ink-150 py-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-[14px] font-semibold">Where AI recommends you first</h3>
              <ul className="space-y-2 text-[13px] text-ink-700">
                {wins.length ? wins.map((q) => <li key={q.id}>“{q.text}”</li>) : <li className="text-ink-500">No #1 positions yet.</li>}
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-[14px] font-semibold">High-intent questions you&apos;re missing</h3>
              <ul className="space-y-2 text-[13px] text-ink-700">
                {losses.length ? (
                  losses.map((q) => (
                    <li key={q.id}>
                      “{q.text}” <span className="text-ink-400">— {q.winnerName}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-ink-500">None — you appear in every high-intent answer.</li>
                )}
              </ul>
            </div>
          </section>

          <section className="pt-6">
            <h3 className="mb-3 text-[14px] font-semibold">Priorities for next month</h3>
            <ol className="space-y-3">
              {scan.opportunities.slice(0, 3).map((o) => (
                <li key={o.id} className="flex gap-3">
                  <span className="num font-mono text-[12px] text-ink-400">{String(o.index).padStart(2, "0")}</span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-[13.5px] font-medium">
                      {o.title} <ImpactBadge level={o.impact} />
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{o.action}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </article>

        <aside className="no-print card h-fit p-5">
          <div className="text-[13.5px] font-semibold">Weekly snapshots</div>
          <p className="mt-0.5 text-[12px] text-ink-500">Generated every Monday</p>
          <ul className="mt-4 divide-y divide-ink-100">
            {weekly.map((w, i) => {
              const idx = trend.findIndex((t) => t.date === w.date);
              return (
                <li key={w.date} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <div className="text-[13px] font-medium">Week of {fmt(w.date, { month: "short", day: "numeric" })}</div>
                    <div className="num text-[12px] text-ink-500">Score {w.score}</div>
                  </div>
                  <Sparkline values={trend.slice(Math.max(0, idx - 7), idx + 1).map((t) => t.score)} width={64} height={22} className={i === 0 ? "text-accent-600" : "text-ink-300"} />
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
}
