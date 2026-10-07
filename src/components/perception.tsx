"use client";

import clsx from "clsx";
import type { Association } from "@/lib/model/types";
import type { Workspace } from "@/lib/engine/workspace";
import { splitAssociations } from "@/lib/engine/perception";
import { YOU } from "@/lib/engine/insights";

/** "How AI sees {business}": attribute associations from AI-stated rationale. */
export function PerceptionBars({ list, compare, compareName, limit }: { list: Association[]; compare?: Association[]; compareName?: string; limit?: number }) {
  const rows = list.filter((a) => a.relevantQueries > 0 || a.citations > 0).slice(0, limit);
  return (
    <div className="space-y-2.5">
      {rows.map((a) => {
        const other = compare?.find((c) => c.attribute === a.attribute);
        return (
          <div key={a.attribute} className="grid grid-cols-[minmax(0,8.5rem)_1fr_2.25rem] items-center gap-3" title={`Cited in ${a.citations} answers · ${a.relevantQueries} queries ask for it`}>
            <span className="truncate text-[13px] text-ink-700">{a.label}</span>
            <div className="space-y-1">
              <div className="h-2 rounded-full bg-ink-50">
                <div className={clsx("h-2 rounded-full transition-[width] duration-700", a.strength >= 45 ? "bg-accent-600" : a.strength >= 20 ? "bg-accent-200" : "bg-ink-200")} style={{ width: `${Math.max(2, a.strength)}%` }} />
              </div>
              {other && (
                <div className="h-1.5 rounded-full bg-ink-50">
                  <div className="h-1.5 rounded-full bg-ink-400" style={{ width: `${Math.max(2, other.strength)}%` }} title={`${compareName}: ${other.strength}`} />
                </div>
              )}
            </div>
            <span className="num text-right text-[12.5px] font-semibold">{a.strength}</span>
          </div>
        );
      })}
      {compare && (
        <div className="flex gap-4 pt-1 text-[11.5px] text-ink-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-full bg-accent-600" /> You
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-3 rounded-full bg-ink-400" /> {compareName}
          </span>
        </div>
      )}
    </div>
  );
}

export function PerceptionSummary({ ws }: { ws: Workspace }) {
  const { strong, weak } = splitAssociations(ws.perception[YOU] ?? []);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <div className="mb-2 text-[12px] font-semibold text-ink-900">Strongest associations</div>
        <div className="flex flex-wrap gap-1.5">
          {strong.length ? strong.map((a) => <Chip key={a.attribute} strong>{a.label}</Chip>) : <span className="text-[12.5px] text-ink-500">None yet</span>}
          <Chip strong>{ws.business.location}</Chip>
        </div>
      </div>
      <div>
        <div className="mb-2 text-[12px] font-semibold text-ink-900">Weak associations</div>
        <div className="flex flex-wrap gap-1.5">
          {weak.length ? weak.map((a) => <Chip key={a.attribute}>{a.label}</Chip>) : <span className="text-[12.5px] text-ink-500">No clear gaps</span>}
        </div>
      </div>
    </div>
  );
}

function Chip({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span className={clsx("rounded-md px-2 py-1 text-[12px] font-medium", strong ? "bg-accent-50 text-accent-800" : "border border-dashed border-ink-200 text-ink-500")}>
      {children}
    </span>
  );
}
