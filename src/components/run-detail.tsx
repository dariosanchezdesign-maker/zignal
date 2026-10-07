"use client";

import { Fragment } from "react";
import clsx from "clsx";
import type { QueryOutcome } from "@/lib/model/types";
import type { Workspace } from "@/lib/engine/workspace";
import { diagnoseOutcome } from "@/lib/engine/diagnosis";
import { YOU } from "@/lib/engine/insights";
import { COMMERCIAL_LABEL, INTENT_LABEL } from "@/lib/engine/queries";
import { getCategoryLabel } from "@/lib/industries";
import { Drawer } from "./drawer";
import { Badge, TrustLabel } from "./ui";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

/** The full chain for one run: Question → AI response → extracted data → insight. */
export function RunDetail({ outcome, ws }: { outcome: QueryOutcome; ws: Workspace }) {
  const { query, run, recommendations } = outcome;
  const diagnosis = diagnoseOutcome(outcome, ws.business.name, ws.insights);
  const linked = ws.insights.filter((i) => i.query_ids.includes(query.id));

  return (
    <div className="space-y-7">
      <section>
        <Step n={1} title="Query" />
        <p className="text-[18px] font-medium leading-snug tracking-tight">“{query.text}”</p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[12.5px] sm:grid-cols-3">
          <Meta label="Industry" value={ws.industry.label} />
          <Meta label="Intent" value={INTENT_LABEL[query.intent_type]} />
          <Meta label="Commercial value" value={`${COMMERCIAL_LABEL[query.commercial_value]} (${query.commercial_weight})`} />
          <Meta label="Funnel stage" value={query.funnel_stage.charAt(0).toUpperCase() + query.funnel_stage.slice(1)} />
          <Meta label="Persona" value={query.customer_persona} />
          <Meta label="Geography" value={query.geography} />
          <Meta label="Category" value={getCategoryLabel(ws.industry, query.category)} />
          <Meta label="Difficulty" value={query.difficulty.charAt(0).toUpperCase() + query.difficulty.slice(1)} />
          <Meta label="Template" value={query.template_id} mono />
        </dl>
      </section>

      <section>
        <Step n={2} title="AI response" right={<TrustLabel kind="simulated" />} />
        <dl className="mb-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
          <Meta label="Provider" value={run.provider} />
          <Meta label="Model" value={run.model} />
          <Meta label="Run date" value={fmt(run.run_date)} />
          <Meta label="Status" value={run.status === "completed" ? "Completed" : "Failed"} />
        </dl>
        <div className="rounded-xl border border-ink-150 bg-ink-50/60">
          <div className="border-b border-ink-150 px-4 py-2 font-mono text-[11px] text-ink-500">Prompt: {run.prompt}</div>
          <div className="whitespace-pre-wrap px-4 py-3.5 text-[13.5px] leading-relaxed text-ink-800">
            <RawText text={run.raw_response} />
          </div>
        </div>
        <p className="mt-2 text-[11.5px] text-ink-400">Raw response, stored exactly as returned. Everything below is extracted from this text.</p>
      </section>

      <section>
        <Step n={3} title="Extracted recommendations" />
        <div className="overflow-x-auto rounded-xl border border-ink-150">
          <table className="w-full min-w-[480px] text-left text-[12.5px]">
            <thead className="bg-ink-50/70 text-[11px] uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Business</th>
                <th className="px-3 py-2 font-medium">AI-stated rationale</th>
                <th className="px-3 py-2 text-right font-medium">Conf.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {recommendations.map((r) => {
                const isYou = r.matched_business_id === YOU;
                const tracked = ws.competitors.some((c) => c.id === r.matched_business_id);
                return (
                  <tr key={r.id} className={clsx(isYou && "bg-accent-50/60")}>
                    <td className="num px-3 py-2.5 align-top font-semibold text-ink-500">{r.position ?? "—"}</td>
                    <td className="px-3 py-2.5 align-top">
                      <div className={clsx("font-medium", isYou && "text-accent-900")}>{r.business_name}</div>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        <Badge tone={isYou ? "accent" : tracked ? "neutral" : "neutral"}>{isYou ? "Your business" : tracked ? "Competitor" : "Not tracked"}</Badge>
                        <Badge tone={r.recommended ? "positive" : "neutral"}>{r.recommended ? "Recommended" : "Mentioned"}</Badge>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-top text-ink-600">{r.rationale.length ? r.rationale.join(" · ") : "—"}</td>
                    <td className="num px-3 py-2.5 text-right align-top text-ink-500">{Math.round(r.confidence * 100)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <Step n={4} title="What this means for you" right={<TrustLabel kind="diagnosis" />} />
        <p className="text-[14px] leading-relaxed text-ink-700">{diagnosis.meaning}</p>
        <ul className="mt-3 space-y-1.5">
          {diagnosis.points.map((p) => (
            <li key={p} className="flex gap-2 text-[13px] leading-snug text-ink-600">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-400" />
              {p}
            </li>
          ))}
        </ul>
        {linked.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5 text-[12px] text-ink-500">
            Evidence for:
            {linked.map((i) => (
              <Badge key={i.id} tone="ink">
                {i.title}
              </Badge>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RawText({ text }: { text: string }) {
  // Render **bold** without interpreting anything else.
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") ? (
          <strong key={i} className="font-semibold text-ink-900">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function Step({ n, title, right }: { n: number; title: string; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="num flex h-5 w-5 items-center justify-center rounded-full bg-ink-900 text-[10.5px] font-semibold text-white">{n}</span>
        <span className="text-[13.5px] font-semibold">{title}</span>
      </div>
      {right}
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-ink-400">{label}</dt>
      <dd className={clsx("truncate font-medium text-ink-800", mono && "font-mono text-[11.5px]")}>{value}</dd>
    </div>
  );
}

export function RunDrawer({ outcome, ws, onClose }: { outcome: QueryOutcome | null; ws: Workspace; onClose: () => void }) {
  return (
    <Drawer open={!!outcome} onClose={onClose} title="AI run detail">
      {outcome && <RunDetail outcome={outcome} ws={ws} />}
    </Drawer>
  );
}
