"use client";

import clsx from "clsx";
import { ArrowRight, Check, CircleSlash, MapPin, Sparkles, X } from "lucide-react";
import type { QueryOutcome } from "@/lib/model/types";
import type { Workspace } from "@/lib/engine/workspace";
import { diagnoseOutcome } from "@/lib/engine/diagnosis";
import { YOU } from "@/lib/engine/insights";
import { Badge, EntityAvatar, IntentBadge, TrustLabel, ValueBadge } from "./ui";

/** Question → AI ranking → your result → AI-stated reasons → diagnosis. */
export function RecommendationView({
  outcome,
  ws,
  onOpenRun,
  compact = false,
}: {
  outcome: QueryOutcome;
  ws: Workspace;
  onOpenRun?: () => void;
  compact?: boolean;
}) {
  const { query, you, winner } = outcome;
  const listed = outcome.recommendations.filter((r) => r.recommended).sort((a, b) => (a.position ?? 9) - (b.position ?? 9));
  const mentioned = outcome.recommendations.filter((r) => !r.recommended);
  const diagnosis = diagnoseOutcome(outcome, ws.business.name, ws.insights);
  const reasonsFor = you?.recommended ? you : winner;

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="eyebrow">Customer question</span>
          <IntentBadge intent={query.intent_type} />
          <ValueBadge value={query.commercial_value} />
          <span className="inline-flex items-center gap-1 text-[11.5px] text-ink-400">
            <MapPin className="h-3 w-3" />
            {query.geography}
          </span>
        </div>
        <p className={clsx("font-medium leading-snug tracking-tight text-ink-900", compact ? "text-[17px]" : "text-[19px] sm:text-[21px]")}>“{query.text}”</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-150 bg-ink-50/60">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-150 px-4 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-600">
            <Sparkles className="h-3.5 w-3.5 text-ink-400" />
            AI recommendation ranking
          </span>
          <TrustLabel kind="simulated" />
        </div>
        <div className="px-4 py-3.5">
          <ol className="space-y-1.5">
            {listed.map((r) => {
              const isYou = r.matched_business_id === YOU;
              return (
                <li
                  key={r.id}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg px-2.5 py-2",
                    isYou ? "bg-accent-50 ring-1 ring-inset ring-accent-200" : "bg-white ring-1 ring-inset ring-ink-150",
                  )}
                >
                  <span className={clsx("num w-5 text-center text-[13px] font-semibold", isYou ? "text-accent-700" : "text-ink-400")}>{r.position}</span>
                  <EntityAvatar name={r.business_name} you={isYou} size={24} />
                  <span className={clsx("min-w-0 flex-1 truncate text-[14px]", isYou ? "font-semibold text-accent-900" : "font-medium text-ink-800")}>{r.business_name}</span>
                  {isYou && <Badge tone="accent">Your business</Badge>}
                  {!isYou && !ws.competitors.some((c) => c.id === r.matched_business_id) && (
                    <span className="hidden text-[11px] text-ink-400 sm:inline">Not tracked</span>
                  )}
                </li>
              );
            })}
          </ol>
          {mentioned.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-500">
              <span>Also mentioned:</span>
              {mentioned.map((m) => (
                <span key={m.id} className={clsx("rounded-md px-1.5 py-0.5", m.matched_business_id === YOU ? "bg-accent-50 font-medium text-accent-700" : "bg-white ring-1 ring-inset ring-ink-150")}>
                  {m.business_name}
                </span>
              ))}
            </div>
          )}
          {!you && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-negative-100 bg-negative-50/50 px-3 py-2 text-[12.5px] text-negative">
              <CircleSlash className="h-3.5 w-3.5 shrink-0" />
              {ws.business.name} was not mentioned in this answer.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-ink-150 bg-ink-150">
        <Fact label="Your position" value={you?.position ? `#${you.position}` : "—"} tone={you?.position === 1 ? "pos" : you?.position ? "accent" : "neg"} />
        <Fact label="AI recommended you" value={you?.recommended ? "Yes" : you ? "Mentioned only" : "No"} tone={you?.recommended ? "pos" : "neg"} />
        <Fact label="Top pick" value={winner.matched_business_id === YOU ? "You" : winner.business_name} />
      </div>

      <div className={clsx("grid gap-3", !compact && "sm:grid-cols-2")}>
        <div className="rounded-xl border border-ink-150 bg-white p-4">
          <div className="mb-2.5 text-[13px] font-semibold">
            {you?.recommended ? "AI-stated reasons for recommending you" : `AI-stated reasons for ${winner.business_name}`}
          </div>
          <ul className="space-y-2">
            {reasonsFor.rationale.map((r) => (
              <li key={r} className="flex gap-2 text-[13px] leading-snug text-ink-600">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-positive" strokeWidth={2.5} />
                {r}
              </li>
            ))}
            {!reasonsFor.rationale.length && <li className="text-[13px] text-ink-500">The response gave no specific reasons.</li>}
          </ul>
          <p className="mt-3 text-[11.5px] text-ink-400">Extracted from the AI response text.</p>
        </div>

        <div className="rounded-xl border border-accent-100 bg-accent-50/40 p-4">
          <TrustLabel kind="diagnosis" />
          <div className="mb-2.5 mt-2.5 text-[13px] font-semibold">{diagnosis.title}</div>
          <ul className="space-y-2">
            {diagnosis.points.map((p) => (
              <li key={p} className="flex gap-2 text-[13px] leading-snug text-ink-700">
                {diagnosis.status === "won" ? (
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-400" />
                ) : (
                  <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-negative" strokeWidth={2.5} />
                )}
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {onOpenRun && (
        <button onClick={onOpenRun} className="focus-ring inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium text-ink-900 hover:underline">
          View the full AI run <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" | "accent" }) {
  return (
    <div className="min-w-0 bg-white px-3 py-2.5">
      <div className="text-[11px] text-ink-500">{label}</div>
      <div
        className={clsx("mt-0.5 truncate text-[15px] font-semibold", {
          "text-positive": tone === "pos",
          "text-negative": tone === "neg",
          "text-accent-700": tone === "accent",
        })}
      >
        {value}
      </div>
    </div>
  );
}

export function PositionPill({ outcome, size = "sm" }: { outcome: QueryOutcome; size?: "sm" | "md" }) {
  const you = outcome.you;
  const cls = size === "sm" ? "px-1.5 py-0.5 text-[11.5px]" : "px-2 py-0.5 text-[12px]";
  if (you?.position) {
    return (
      <span
        className={clsx(
          "num inline-flex items-center rounded-md font-semibold",
          cls,
          you.position === 1 ? "bg-positive-50 text-positive" : you.position <= 3 ? "bg-accent-50 text-accent-700" : "bg-caution-50 text-caution",
        )}
      >
        #{you.position}
      </span>
    );
  }
  return (
    <span className={clsx("inline-flex items-center whitespace-nowrap rounded-md font-medium", cls, you ? "bg-ink-100 text-ink-600" : "bg-negative-50 text-negative")}>
      {you ? "Mentioned only" : "Not mentioned"}
    </span>
  );
}
