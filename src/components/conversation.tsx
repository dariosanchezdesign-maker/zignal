"use client";

import { Fragment, useState } from "react";
import clsx from "clsx";
import { ChevronDown, Sparkles } from "lucide-react";
import type { QueryOutcome } from "@/lib/model/types";
import type { Workspace } from "@/lib/engine/workspace";
import { diagnoseOutcome } from "@/lib/engine/diagnosis";
import { YOU } from "@/lib/engine/insights";
import { Drawer } from "./drawer";
import { RunDetail } from "./run-detail";
import { TrustLabel } from "./ui";

/** One-line verdict for a question, in plain words. */
export function verdictFor(o: QueryOutcome): { text: string; tone: "good" | "ok" | "bad" } {
  const p = o.you?.recommended ? o.you.position : null;
  if (p === 1) return { text: "AI recommends you first", tone: "good" };
  if (p) return { text: `AI recommends you #${p}, behind ${o.winner.business_name}`, tone: "ok" };
  if (o.you) return { text: `AI mentions you but recommends ${o.winner.business_name}`, tone: "bad" };
  return { text: `AI recommends ${o.winner.business_name}. You're not mentioned`, tone: "bad" };
}

export function VerdictDot({ tone }: { tone: "good" | "ok" | "bad" }) {
  return <span className={clsx("h-2 w-2 shrink-0 rounded-full", tone === "good" ? "bg-positive" : tone === "ok" ? "bg-caution" : "bg-negative")} />;
}

/** Renders the raw AI response with **bold** names and the user's business highlighted. */
function AnswerText({ text, name }: { text: string; name: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
        if (!part.startsWith("**")) return <Fragment key={i}>{part}</Fragment>;
        const label = part.slice(2, -2);
        return (
          <strong key={i} className={clsx("font-semibold", label === name ? "rounded bg-accent-100 px-1 text-accent-900" : "text-ink-900")}>
            {label}
          </strong>
        );
      })}
    </>
  );
}

export function CustomerBubble({ text, small }: { text: string; small?: boolean }) {
  return (
    <div className="flex justify-end">
      <div className={clsx("max-w-[90%] rounded-2xl rounded-br-md bg-ink-900 text-white", small ? "px-3.5 py-2 text-[13.5px]" : "px-4 py-2.5 text-[15px]")}>{text}</div>
    </div>
  );
}

/** Compact AI answer: the ranked names only. */
export function MiniAnswer({ o }: { o: QueryOutcome }) {
  const listed = o.recommendations.filter((r) => r.recommended).sort((a, b) => (a.position ?? 9) - (b.position ?? 9));
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-ink-100">
        <Sparkles className="h-3 w-3 text-ink-500" />
      </span>
      <ol className="min-w-0 flex-1 space-y-1">
        {listed.map((r) => {
          const you = r.matched_business_id === YOU;
          return (
            <li key={r.id} className={clsx("flex items-center gap-2 rounded-md px-2 py-1 text-[13px]", you ? "bg-accent-50 font-semibold text-accent-900" : "text-ink-700")}>
              <span className="num w-3 text-[11.5px] text-ink-400">{r.position}</span>
              <span className="truncate">{r.business_name}</span>
              {you && <span className="ml-auto rounded bg-accent-600 px-1.5 text-[10px] font-semibold leading-4 text-white">You</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Full conversation for a question, with technical details on demand. */
export function ConversationView({ outcome, ws }: { outcome: QueryOutcome; ws: Workspace }) {
  const [details, setDetails] = useState(false);
  const verdict = verdictFor(outcome);
  const diagnosis = diagnoseOutcome(outcome, ws.business.name, ws.insights);

  return (
    <div className="space-y-5">
      <div className="text-[12px] text-ink-400">A customer asked AI:</div>
      <CustomerBubble text={outcome.query.text} />
      <div className="flex gap-3">
        <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-100">
          <Sparkles className="h-3.5 w-3.5 text-ink-500" />
        </span>
        <div className="min-w-0 flex-1 whitespace-pre-wrap rounded-2xl rounded-tl-md border border-ink-150 bg-white px-4 py-3 text-[14px] leading-relaxed text-ink-700">
          <AnswerText text={outcome.run.raw_response} name={ws.business.name} />
        </div>
      </div>

      <div
        className={clsx(
          "flex items-center gap-2.5 rounded-xl px-4 py-3 text-[15px] font-semibold",
          verdict.tone === "good" ? "bg-positive-50 text-positive" : verdict.tone === "ok" ? "bg-caution-50 text-ink-900" : "bg-negative-50 text-ink-900",
        )}
      >
        <VerdictDot tone={verdict.tone} />
        {verdict.text}
      </div>

      <div className="rounded-xl border border-ink-150 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[14px] font-semibold">{diagnosis.title}</div>
          <TrustLabel kind="diagnosis" />
        </div>
        <ul className="mt-2.5 space-y-1.5">
          {diagnosis.points.map((p) => (
            <li key={p} className="flex gap-2 text-[13.5px] leading-snug text-ink-700">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-400" />
              {p}
            </li>
          ))}
        </ul>
      </div>

      <button onClick={() => setDetails(!details)} className="flex w-full items-center justify-between border-t border-ink-150 pt-4 text-[13px] font-medium text-ink-500 hover:text-ink-900">
        See exactly how this was measured
        <ChevronDown className={clsx("h-4 w-4 transition-transform", details && "rotate-180")} />
      </button>
      {details && <RunDetail outcome={outcome} ws={ws} />}
    </div>
  );
}

export function ConversationDrawer({ outcome, ws, onClose }: { outcome: QueryOutcome | null; ws: Workspace; onClose: () => void }) {
  return (
    <Drawer open={!!outcome} onClose={onClose} title="What AI said">
      {outcome && <ConversationView outcome={outcome} ws={ws} />}
    </Drawer>
  );
}

/** Small card used on Home and Questions. */
export function ConversationCard({ o, onOpen }: { o: QueryOutcome; onOpen: () => void }) {
  const v = verdictFor(o);
  return (
    <button onClick={onOpen} className="card group flex w-full flex-col gap-3 p-4 text-left transition-shadow hover:shadow-lift">
      <CustomerBubble text={o.query.text} small />
      <MiniAnswer o={o} />
      <div className="mt-auto flex items-center gap-2 border-t border-ink-100 pt-3 text-[13px] font-medium text-ink-800">
        <VerdictDot tone={v.tone} />
        <span className="min-w-0 flex-1">{v.text}</span>
      </div>
    </button>
  );
}

