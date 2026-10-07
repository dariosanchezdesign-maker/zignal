"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import type { QueryOutcome } from "@/lib/model/types";
import type { Workspace } from "@/lib/engine/workspace";
import { YOU } from "@/lib/engine/insights";
import { splitAssociations } from "@/lib/engine/perception";
import { RunDrawer } from "@/components/run-detail";
import { PositionPill } from "@/components/recommendation-view";
import { EntityAvatar, PageHeader, SectionHeader, TrustLabel, fmtPos, pct } from "@/components/ui";

const posOf = (o: QueryOutcome, id: string) => o.recommendations.find((r) => r.matched_business_id === id && r.recommended)?.position ?? null;

export default function Competitors() {
  const { ws } = useStore();
  const [selected, setSelected] = useState(ws.competitorMetrics[0]?.entity_id ?? "");
  const [run, setRun] = useState<QueryOutcome | null>(null);
  useEffect(() => setSelected(ws.competitorMetrics[0]?.entity_id ?? ""), [ws.business.id, ws.competitorMetrics]);

  const rows = [{ ...ws.you, isYou: true }, ...ws.competitorMetrics.map((c) => ({ ...c, isYou: false }))].sort((a, b) => b.recommendation_rate - a.recommendation_rate);
  const maxRate = Math.max(...rows.map((r) => r.recommendation_rate), 0.01);
  const yourRank = [...rows].sort((a, b) => b.score - a.score).findIndex((r) => r.isYou) + 1;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Who is AI recommending instead?"
        description={
          <>
            You rank <span className="font-semibold text-ink-900">#{yourRank} of {rows.length}</span> tracked businesses on AI Visibility in the latest simulation. Select a competitor to
            see what AI credits them with.
          </>
        }
        action={<TrustLabel kind="simulated" />}
      />

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-ink-150 bg-ink-50/70 text-[11px] font-medium uppercase tracking-wide text-ink-500">
                <th className="px-5 py-2.5 font-medium">Business</th>
                <th className="px-3 py-2.5 font-medium">Recommendation rate</th>
                <th className="px-3 py-2.5 text-right font-medium">Avg position</th>
                <th className="px-3 py-2.5 text-right font-medium">Share of voice</th>
                <th className="px-3 py-2.5 text-right font-medium">Visibility</th>
                <th className="w-8 px-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((e) => (
                <tr
                  key={e.entity_id}
                  onClick={() => !e.isYou && setSelected(e.entity_id)}
                  className={clsx(
                    e.isYou ? "bg-accent-50/70" : "cursor-pointer hover:bg-ink-50/70",
                    selected === e.entity_id && "bg-ink-50 shadow-[inset_2px_0_0_#0E1116]",
                  )}
                >
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-2.5">
                      <EntityAvatar name={e.name} you={e.isYou} size={28} />
                      <span className={clsx("text-[14px]", e.isYou ? "font-semibold text-accent-900" : "font-medium")}>
                        {e.name}
                        {e.isYou && <span className="ml-1.5 text-[11.5px] font-medium text-accent-600">You</span>}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-32 rounded-full bg-ink-50 lg:w-48">
                        <div className={clsx("h-2 rounded-full", e.isYou ? "bg-accent-600" : "bg-ink-300")} style={{ width: `${(e.recommendation_rate / maxRate) * 100}%` }} />
                      </div>
                      <span className="num text-[13.5px] font-semibold">{pct(e.recommendation_rate)}</span>
                    </div>
                  </td>
                  <td className="num px-3 py-3 text-right text-[13.5px]">{fmtPos(e.avg_position)}</td>
                  <td className="num px-3 py-3 text-right text-[13.5px]">{pct(e.share_of_voice)}</td>
                  <td className="num px-3 py-3 text-right text-[13.5px] font-semibold">{e.score}</td>
                  <td className="px-3 py-3 text-ink-300">{!e.isYou && <ChevronRight className="h-4 w-4" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected && <Advantage ws={ws} id={selected} onOpenRun={setRun} />}

      <CategoryMatrix ws={ws} />
      <RunDrawer outcome={run} ws={ws} onClose={() => setRun(null)} />
    </div>
  );
}

function Advantage({ ws, id, onOpenRun }: { ws: Workspace; id: string; onOpenRun: (o: QueryOutcome) => void }) {
  const comp = ws.competitorMetrics.find((c) => c.entity_id === id);
  const theirs = ws.perception[id] ?? [];
  const mine = ws.perception[YOU] ?? [];
  const beats = useMemo(
    () =>
      ws.outcomes
        .filter((o) => {
          const t = posOf(o, id);
          const m = o.you?.recommended ? o.you.position : null;
          return t !== null && (m === null || t < m);
        })
        .sort((a, b) => b.query.commercial_weight - a.query.commercial_weight),
    [ws, id],
  );
  const youBeat = ws.outcomes.filter((o) => {
    const t = posOf(o, id);
    const m = o.you?.recommended ? o.you.position : null;
    return m !== null && (t === null || m < t);
  }).length;
  if (!comp) return null;

  const { strong } = splitAssociations(theirs);
  const gaps = theirs
    .map((t) => ({ t, mine: mine.find((m) => m.attribute === t.attribute)?.strength ?? 0 }))
    .filter((x) => x.t.strength - x.mine >= 25)
    .slice(0, 3);
  const youOwn = mine
    .map((m) => ({ m, theirs: theirs.find((t) => t.attribute === m.attribute)?.strength ?? 0 }))
    .filter((x) => x.m.strength - x.theirs >= 25)
    .slice(0, 3);

  return (
    <section className="card p-5 sm:p-7">
      <SectionHeader eyebrow="Competitor advantage" title={`What AI credits ${comp.name} with`} />
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <div className="mb-2 text-[12px] font-semibold">Frequently associated with</div>
          <div className="flex flex-wrap gap-1.5">
            {strong.length ? (
              strong.map((a) => (
                <span key={a.attribute} className="rounded-md bg-ink-900 px-2 py-1 text-[12px] font-medium text-white">
                  {a.label} <span className="num opacity-60">{a.strength}</span>
                </span>
              ))
            ) : (
              <span className="text-[13px] text-ink-500">No standout associations</span>
            )}
          </div>

          <div className="mb-3 mt-6 text-[12px] font-semibold">Association: {comp.name} vs. you</div>
          <div className="space-y-2.5">
            {theirs.filter((a) => a.relevantQueries > 0).slice(0, 7).map((a) => {
              const m = mine.find((x) => x.attribute === a.attribute)?.strength ?? 0;
              return (
                <div key={a.attribute} className="grid grid-cols-[minmax(0,7.5rem)_1fr_4.5rem] items-center gap-3">
                  <span className="truncate text-[12.5px] text-ink-700">{a.label}</span>
                  <div className="space-y-1">
                    <div className="h-1.5 rounded-full bg-ink-50">
                      <div className="h-1.5 rounded-full bg-ink-700" style={{ width: `${Math.max(2, a.strength)}%` }} />
                    </div>
                    <div className="h-1.5 rounded-full bg-ink-50">
                      <div className="h-1.5 rounded-full bg-accent-600" style={{ width: `${Math.max(2, m)}%` }} />
                    </div>
                  </div>
                  <span className="num text-right text-[11.5px] text-ink-500">
                    {a.strength} / <span className="text-accent-700">{m}</span>
                  </span>
                </div>
              );
            })}
            <div className="flex gap-4 pt-1 text-[11.5px] text-ink-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-3 rounded-full bg-ink-700" /> {comp.name}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-3 rounded-full bg-accent-600" /> You
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-accent-100 bg-accent-50/40 p-4">
            <TrustLabel kind="diagnosis" />
            <p className="mt-2.5 text-[14px] font-medium leading-snug text-ink-900">Here&apos;s what they&apos;re credited with that you aren&apos;t.</p>
            <ul className="mt-2 space-y-1.5 text-[13px] leading-snug text-ink-700">
              {gaps.map((g) => (
                <li key={g.t.attribute}>
                  {g.t.label}: {comp.name} {g.t.strength}, you {g.mine}
                </li>
              ))}
              {!gaps.length && <li>No attribute where they clearly out-associate you.</li>}
            </ul>
            {youOwn.length > 0 && (
              <p className="mt-3 text-[12.5px] text-ink-600">Where you lead them: {youOwn.map((x) => x.m.label.toLowerCase()).join(", ")}.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-ink-150 bg-ink-150">
            <div className="bg-white px-4 py-3">
              <div className="num text-[22px] font-semibold">{beats.length}</div>
              <div className="text-[11.5px] text-ink-500">queries where they rank above you</div>
            </div>
            <div className="bg-white px-4 py-3">
              <div className="num text-[22px] font-semibold text-accent-700">{youBeat}</div>
              <div className="text-[11.5px] text-ink-500">queries where you rank above them</div>
            </div>
          </div>

          <div>
            <div className="mb-2 text-[12px] font-semibold">Highest-value queries they win over you</div>
            <ul className="divide-y divide-ink-100 rounded-xl border border-ink-150">
              {beats.slice(0, 5).map((o) => (
                <li key={o.query.id}>
                  <button onClick={() => onOpenRun(o)} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-ink-50">
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink-800">{o.query.text}</span>
                    <span className="num shrink-0 text-[11.5px] text-ink-500">#{posOf(o, id)}</span>
                    <PositionPill outcome={o} />
                  </button>
                </li>
              ))}
              {!beats.length && <li className="px-3.5 py-3 text-[13px] text-ink-500">They never rank above you.</li>}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryMatrix({ ws }: { ws: Workspace }) {
  const all = [{ id: YOU, name: "You", isYou: true }, ...ws.competitorMetrics.map((c) => ({ id: c.entity_id, name: c.name, isYou: false }))];
  const cats = ws.industry.categories.filter((c) => ws.queries.some((q) => q.category === c.id));
  return (
    <section className="card overflow-hidden">
      <div className="p-5 sm:p-6">
        <SectionHeader title="Recommendation rate by query category" description="Darker means AI recommends that business more often in that category." />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-y border-ink-150 bg-ink-50/70">
              <th className="px-5 py-2.5 text-[11px] font-medium uppercase tracking-wide text-ink-500">Category</th>
              {all.map((e) => (
                <th key={e.id} className={clsx("px-2 py-2.5 text-center text-[11.5px] font-medium", e.isYou ? "text-accent-700" : "text-ink-500")}>
                  <span className="mx-auto block max-w-[120px] truncate" title={e.name}>
                    {e.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {cats.map((c) => {
              const qs = ws.outcomes.filter((o) => o.query.category === c.id);
              const rates = all.map((e) => qs.filter((o) => posOf(o, e.id) !== null).length / (qs.length || 1));
              const max = Math.max(...rates);
              return (
                <tr key={c.id}>
                  <td className="px-5 py-2.5 text-[13px] font-medium">
                    {c.label} <span className="text-[11px] font-normal text-ink-400">{qs.length}</span>
                  </td>
                  {rates.map((r, i) => (
                    <td key={all[i].id} className="px-2 py-1.5 text-center">
                      <span
                        className={clsx(
                          "num inline-flex h-8 w-full max-w-[96px] items-center justify-center rounded-md text-[12.5px] font-medium",
                          r >= 0.55 ? "text-white" : "text-ink-800",
                          r === max && r > 0 && "ring-2 ring-inset ring-ink-900/70",
                        )}
                        style={{ backgroundColor: all[i].isYou ? `rgba(38,71,201,${0.08 + r * 0.85})` : `rgba(45,51,59,${0.06 + r * 0.8})` }}
                        title={`${all[i].name} · ${c.label}: ${pct(r)}`}
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
    </section>
  );
}
