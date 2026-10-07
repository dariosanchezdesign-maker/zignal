"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import type { EntityMetrics, QueryResult } from "@/lib/types";
import { CompareBars } from "@/components/charts";
import { EntityAvatar, PageHeader, SectionHeader, fmtPos, pct } from "@/components/ui";

function headToHead(queries: QueryResult[], id: string) {
  let theyWin = 0;
  let youWin = 0;
  for (const q of queries) {
    const them = q.ranking.find((x) => x.id === id)?.position ?? 99;
    const you = q.position ?? 99;
    if (them === 99 && you === 99) continue;
    if (them < you) theyWin++;
    else if (you < them) youWin++;
  }
  return { theyWin, youWin };
}

export default function Competitors() {
  const { scan } = useStore();
  const { you, competitors, queries } = scan;
  const all = useMemo(() => [{ ...you, isYou: true }, ...competitors.map((c) => ({ ...c, isYou: false }))], [you, competitors]);
  const ranked = [...all].sort((a, b) => b.score - a.score);
  const yourRank = ranked.findIndex((e) => e.isYou) + 1;

  return (
    <div className="space-y-10">
      <PageHeader
        title="Who AI recommends instead"
        description={
          <>
            You rank <span className="font-semibold text-ink-900">#{yourRank} of {all.length}</span> tracked businesses in AI visibility. Here&apos;s what
            the others are doing that you aren&apos;t.
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <EntityCard e={you} you rank={yourRank} />
        {competitors.map((c) => (
          <EntityCard key={c.id} e={c} rank={ranked.findIndex((r) => r.id === c.id) + 1} h2h={headToHead(queries, c.id)} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <SectionHeader title="Recommendation rate" description="Share of questions where AI puts each business in its top 3." />
          <div className="mt-5">
            <CompareBars rows={[...all].sort((a, b) => b.recommendationRate - a.recommendationRate).map((e) => ({ id: e.id, name: e.name, value: e.recommendationRate, you: e.isYou }))} />
          </div>
        </div>
        <div className="card p-5 sm:p-6">
          <SectionHeader title="Share of AI recommendations" description="Of every business AI names, how often it's each one." />
          <div className="mt-5">
            <CompareBars rows={[...all].sort((a, b) => b.share - a.share).map((e) => ({ id: e.id, name: e.name, value: e.share, you: e.isYou }))} />
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="p-5 sm:p-6">
          <SectionHeader title="Who wins each topic" description="Recommendation rate by topic. Darker means AI recommends that business more often." />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-y border-ink-150 bg-ink-50/70">
                <th className="px-5 py-2.5 text-[11.5px] font-medium uppercase tracking-wide text-ink-500">Topic</th>
                {all.map((e) => (
                  <th key={e.id} className={clsx("px-2 py-2.5 text-center text-[11.5px] font-medium", e.isYou ? "text-accent-700" : "text-ink-500")}>
                    <span className="mx-auto block max-w-[110px] truncate" title={e.name}>
                      {e.isYou ? "You" : e.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {scan.topics.map((t) => {
                const qs = queries.filter((q) => q.topic === t.topic.id);
                const rates = all.map((e) => qs.filter((q) => q.ranking.some((x) => x.id === e.id && x.position <= 3)).length / (qs.length || 1));
                const max = Math.max(...rates);
                return (
                  <tr key={t.topic.id}>
                    <td className="px-5 py-2.5 text-[13px] font-medium">{t.topic.label}</td>
                    {rates.map((r, i) => (
                      <td key={all[i].id} className="px-2 py-1.5 text-center">
                        <span
                          className={clsx(
                            "num inline-flex h-8 w-full max-w-[96px] items-center justify-center rounded-md text-[12.5px] font-medium",
                            r >= 0.55 ? "text-white" : "text-ink-800",
                            r === max && r > 0 && "ring-2 ring-inset ring-ink-900/70",
                          )}
                          style={{ backgroundColor: all[i].isYou ? `rgba(38,71,201,${0.08 + r * 0.85})` : `rgba(45,51,59,${0.06 + r * 0.8})` }}
                          title={`${all[i].name} · ${t.topic.label}: ${pct(r)}`}
                        >
                          {pct(r)}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 border-t border-ink-150 px-5 py-3 text-[11.5px] text-ink-500">
          <span className="inline-block h-3 w-3 rounded-sm ring-2 ring-inset ring-ink-900/70" /> Topic leader
        </div>
      </section>
    </div>
  );
}

function EntityCard({
  e,
  you,
  rank,
  h2h,
}: {
  e: EntityMetrics;
  you?: boolean;
  rank: number;
  h2h?: { theyWin: number; youWin: number };
}) {
  return (
    <div className={clsx("card flex flex-col p-5", you && "ring-1 ring-accent-200")}>
      <div className="flex items-center gap-3">
        <EntityAvatar name={e.name} you={you} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold tracking-tight">{e.name}</div>
          <div className="text-[12px] text-ink-500">{you ? "Your business" : `Rank #${rank} in AI visibility`}</div>
        </div>
        <div className="text-right">
          <div className="num text-[26px] font-semibold leading-none tracking-tight">{e.score}</div>
          <div className="mt-0.5 text-[10.5px] text-ink-400">AI Visibility</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-ink-150">
        <Cell label="Recommended in" value={pct(e.recommendationRate)} />
        <Cell label="Avg. position" value={fmtPos(e.avgPosition)} />
        <Cell label="Mentioned in" value={pct(e.mentionRate)} />
      </div>

      <div className="mt-4 text-[12px] text-ink-500">
        Strongest for: <span className="text-ink-800">{e.topTopics.slice(0, 2).join(", ")}</span>
      </div>

      {you ? (
        <div className="mt-4 flex-1 rounded-lg bg-accent-50 p-3 text-[12.5px] leading-relaxed text-accent-900">
          AI recommends you as the top pick in <span className="font-semibold">{e.wins}</span> questions. Compare yourself to each competitor below.
        </div>
      ) : (
        <div className="mt-4 flex-1">
          <div className="mb-2 text-[12px] font-semibold text-ink-900">What they&apos;re doing that you aren&apos;t</div>
          {e.edges.length ? (
            <ul className="space-y-1.5">
              {e.edges.map((x) => (
                <li key={x} className="flex gap-2 text-[12.5px] leading-snug text-ink-600">
                  <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-ink-400" />
                  {x}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-ink-500">No clear edge over you on any topic.</p>
          )}
        </div>
      )}

      {h2h && (
        <div className="mt-4 border-t border-ink-100 pt-3">
          <div className="mb-1.5 flex justify-between text-[11.5px] text-ink-500">
            <span>Ranks above you</span>
            <span>You rank above</span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full bg-ink-700" style={{ width: `${(h2h.theyWin / Math.max(1, h2h.theyWin + h2h.youWin)) * 100}%` }} />
            <div className="h-full flex-1 bg-accent-600" />
          </div>
          <div className="num mt-1.5 flex justify-between text-[12.5px] font-semibold">
            <span>{h2h.theyWin} questions</span>
            <span className="text-accent-700">{h2h.youWin} questions</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-50 px-3 py-2.5">
      <div className="num text-[16px] font-semibold">{value}</div>
      <div className="text-[10.5px] text-ink-500">{label}</div>
    </div>
  );
}

