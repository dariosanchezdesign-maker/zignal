"use client";

import clsx from "clsx";
import { Check, CircleSlash, MapPin, Sparkles, TrendingUp, X } from "lucide-react";
import type { QueryResult } from "@/lib/types";
import { YOU } from "@/lib/engine/scan";
import { Badge, EntityAvatar, ImpactBadge, IntentBadge } from "./ui";

/** The core reveal: what a customer asked, what AI answered, and why. */
export function QueryAnswer({ query, businessName, compact = false }: { query: QueryResult; businessName: string; compact?: boolean }) {
  const youWin = query.winnerId === YOU;
  const runnerUp = query.ranking.find((r) => r.id !== YOU && r.id !== query.winnerId) ?? query.ranking.find((r) => r.id !== YOU);
  const mentionedOnly = !query.position && query.mentioned;

  return (
    <div className="space-y-5">
      {/* Customer question */}
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="eyebrow">A customer asks AI</span>
          <IntentBadge intent={query.intent} />
          <span className="inline-flex items-center gap-1 text-[11.5px] text-ink-400">
            <MapPin className="h-3 w-3" />
            {query.location}
          </span>
        </div>
        <p className={clsx("font-medium leading-snug tracking-tight text-ink-900", compact ? "text-[17px]" : "text-[19px] sm:text-[21px]")}>
          “{query.text}”
        </p>
      </div>

      {/* AI answer */}
      <div className="overflow-hidden rounded-xl border border-ink-150 bg-ink-50/60">
        <div className="flex items-center justify-between gap-3 border-b border-ink-150 px-4 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-600">
            <Sparkles className="h-3.5 w-3.5 text-ink-400" />
            AI response summary
          </span>
          <PositionPill position={query.position} mentioned={query.mentioned} />
        </div>
        <div className="px-4 py-3.5">
          <p className="mb-3.5 text-[13.5px] leading-relaxed text-ink-600">{query.summary}</p>
          <ol className="space-y-1.5">
            {query.ranking.map((r) => {
              const isYou = r.id === YOU;
              return (
                <li
                  key={r.id}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors",
                    isYou ? "bg-accent-50 ring-1 ring-inset ring-accent-200" : "bg-white ring-1 ring-inset ring-ink-150",
                  )}
                >
                  <span className={clsx("num w-5 text-center text-[13px] font-semibold", isYou ? "text-accent-700" : "text-ink-400")}>{r.position}</span>
                  <EntityAvatar name={r.name} you={isYou} size={24} />
                  <span className={clsx("min-w-0 flex-1 truncate text-[14px]", isYou ? "font-semibold text-accent-900" : "font-medium text-ink-800")}>{r.name}</span>
                  {isYou && <Badge tone="accent">Your business</Badge>}
                  {r.position === 1 && !isYou && <span className="hidden text-[11.5px] text-ink-400 sm:inline">Top recommendation</span>}
                </li>
              );
            })}
          </ol>
          {query.alsoMentioned.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-500">
              <span>Also mentioned:</span>
              {query.alsoMentioned.map((m) => (
                <span
                  key={m.id}
                  className={clsx("rounded-md px-1.5 py-0.5", m.id === YOU ? "bg-accent-50 font-medium text-accent-700" : "bg-white ring-1 ring-inset ring-ink-150")}
                >
                  {m.name}
                </span>
              ))}
            </div>
          )}
          {!query.mentioned && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-negative-100 bg-negative-50/50 px-3 py-2 text-[12.5px] text-negative">
              <CircleSlash className="h-3.5 w-3.5 shrink-0" />
              {businessName} was not mentioned in this answer.
            </div>
          )}
        </div>
      </div>

      {/* Why */}
      <div className="grid gap-3 sm:grid-cols-2">
        {query.position ? (
          <ReasonList
            title={youWin ? "Why AI chose you" : "Why you were recommended"}
            items={query.whyYou}
            tone="positive"
          />
        ) : (
          <ReasonList
            title={mentionedOnly ? "Why you weren't recommended" : "Why you weren't included"}
            items={query.whyWinner.map(gapPhrase).slice(0, 3)}
            tone="negative"
          />
        )}
        {youWin ? (
          <ReasonList
            title={runnerUp ? `How ${runnerUp.name} could overtake you` : "How to protect this position"}
            items={["More third-party mentions this quarter", "Fresher content on this topic", "Growing review volume"]}
            tone="neutral"
          />
        ) : (
          <ReasonList title={`Why ${query.winnerName} ranked higher`} items={query.whyWinner} tone="neutral" />
        )}
      </div>

      {!compact && (
        <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4 text-[12.5px] text-ink-500">
          <TrendingUp className="h-3.5 w-3.5" />
          Opportunity <ImpactBadge level={query.opportunity} />
          <span className="text-ink-300">·</span>
          {query.opportunity === "low"
            ? "You're well positioned. Keep your content and reviews current."
            : "Closing the gaps on the right is the fastest way to move up on this question."}
        </div>
      )}
    </div>
  );
}

const COMPARATIVES: [RegExp, string][] = [
  [/^More (third-party|recent|authoritative)/, "Fewer $1"],
  [/^More specific/, "Less specific"],
  [/^Stronger /, "Weaker "],
  [/^Higher /, "Lower "],
];

/** Turns what the winner has into what the business is missing. */
function gapPhrase(signal: string) {
  for (const [re, rep] of COMPARATIVES) if (re.test(signal)) return `${signal.replace(re, rep)} than the businesses AI recommends`;
  return `No clear evidence of ${signal.charAt(0).toLowerCase()}${signal.slice(1)}`;
}

export function PositionPill({ position, mentioned, size = "md" }: { position: number | null; mentioned: boolean; size?: "sm" | "md" }) {
  if (position) {
    return (
      <span
        className={clsx(
          "num inline-flex items-center gap-1 rounded-md font-semibold",
          size === "sm" ? "px-1.5 py-0.5 text-[11.5px]" : "px-2 py-0.5 text-[12px]",
          position === 1 ? "bg-positive-50 text-positive" : position <= 3 ? "bg-accent-50 text-accent-700" : "bg-caution-50 text-caution",
        )}
      >
        {size === "md" && <span className="font-medium opacity-70">Your position</span>}#{position}
      </span>
    );
  }
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-md font-medium",
        size === "sm" ? "px-1.5 py-0.5 text-[11.5px]" : "px-2 py-0.5 text-[12px]",
        mentioned ? "bg-ink-100 text-ink-600" : "bg-negative-50 text-negative",
      )}
    >
      {mentioned ? "Mentioned only" : "Not mentioned"}
    </span>
  );
}

function ReasonList({ title, items, tone }: { title: string; items: string[]; tone: "positive" | "negative" | "neutral" }) {
  return (
    <div className="rounded-xl border border-ink-150 bg-white p-4">
      <div className="mb-2.5 text-[13px] font-semibold text-ink-900">{title}</div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it} className="flex gap-2 text-[13px] leading-snug text-ink-600">
            {tone === "positive" ? (
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-positive" strokeWidth={2.5} />
            ) : tone === "negative" ? (
              <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-negative" strokeWidth={2.5} />
            ) : (
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-400" />
            )}
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
