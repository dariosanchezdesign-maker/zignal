"use client";

import clsx from "clsx";
import { Lightbulb } from "lucide-react";
import type { ScanResult } from "@/lib/types";
import { YOU } from "@/lib/engine/scan";
import { Meter, pct } from "./ui";

/** Industry-specific topic coverage: what AI recommends you for, and what it doesn't. */
export function TopicCoverage({ scan, limit }: { scan: ScanResult; limit?: number }) {
  const rows = [...scan.topics].sort((a, b) => b.recommendationRate - a.recommendationRate).slice(0, limit);
  return (
    <div className="divide-y divide-ink-100">
      {rows.map((t) => {
        const youLead = t.leader.id === YOU;
        const weak = t.recommendationRate < 0.34;
        return (
          <div key={t.topic.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 py-3 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_minmax(0,11rem)]">
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-medium text-ink-900">{t.topic.label}</div>
              <div className="text-[11.5px] text-ink-400">{t.queries} question{t.queries === 1 ? "" : "s"}</div>
            </div>
            <div className="order-3 col-span-2 flex items-center gap-3 sm:order-none sm:col-span-1">
              <Meter value={t.recommendationRate} tone={weak ? "muted" : "accent"} />
              <span className={clsx("num w-10 shrink-0 text-right text-[13px] font-semibold", weak ? "text-ink-500" : "text-ink-900")}>
                {pct(t.recommendationRate)}
              </span>
            </div>
            <div className="text-right text-[12px] sm:text-left">
              {youLead ? (
                <span className="font-medium text-positive">You lead</span>
              ) : (
                <span className="text-ink-500">
                  <span className="hidden sm:inline">Leader: </span>
                  <span className="font-medium text-ink-700">{t.leader.name}</span> <span className="num">{pct(t.leader.rate)}</span>
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function InsightList({ insights }: { insights: string[] }) {
  return (
    <ul className="space-y-2.5">
      {insights.map((i) => (
        <li key={i} className="flex gap-3 rounded-xl border border-ink-150 bg-white p-3.5 text-[13.5px] leading-snug text-ink-700">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-caution" strokeWidth={1.9} />
          {i}
        </li>
      ))}
    </ul>
  );
}
