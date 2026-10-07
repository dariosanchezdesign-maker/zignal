"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { useStore } from "@/lib/store";
import type { Intent, QueryResult } from "@/lib/types";
import { AskAI } from "@/components/ask-ai";
import { Drawer } from "@/components/drawer";
import { PositionPill, QueryAnswer } from "@/components/query-answer";
import { TopicCoverage } from "@/components/insights";
import { INTENT_HINT, INTENT_LABEL, PageHeader, Segmented, pct } from "@/components/ui";

const INTENTS: Intent[] = ["discovery", "comparison", "high-intent", "local", "transactional", "problem"];
type Outcome = "all" | "recommended" | "missed";

export default function VisibilityPage() {
  return (
    <Suspense>
      <Visibility />
    </Suspense>
  );
}

function Visibility() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get("tab") === "ask" ? "ask" : "questions";
  const { scan } = useStore();

  return (
    <div>
      <PageHeader
        title="AI Visibility"
        description={`What AI tells ${scan.industry.audience} when they ask for a recommendation — and where ${scan.business.name} fits in.`}
      />
      <div className="mb-6 flex border-b border-ink-150">
        {[
          { id: "questions", label: "How AI recommends you" },
          { id: "ask", label: "Ask AI about my business" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => router.replace(t.id === "ask" ? "/app/visibility?tab=ask" : "/app/visibility")}
            className={clsx(
              "-mb-px border-b-2 px-1 pb-3 text-[14px] font-medium transition-colors first:mr-6",
              tab === t.id ? "border-ink-900 text-ink-900" : "border-transparent text-ink-500 hover:text-ink-800",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "ask" ? <AskAI scan={scan} /> : <Questions />}
    </div>
  );
}

function Questions() {
  const { scan } = useStore();
  const [intent, setIntent] = useState<Intent | "all">("all");
  const [outcome, setOutcome] = useState<Outcome>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const list = useMemo(
    () =>
      scan.queries.filter(
        (q) =>
          (intent === "all" || q.intent === intent) &&
          (outcome === "all" || (outcome === "recommended" ? q.recommended : !q.recommended)),
      ),
    [scan, intent, outcome],
  );

  useEffect(() => setSelectedId(null), [scan.business.id]);
  const selected = list.find((q) => q.id === selectedId) ?? list[0];

  const intentStats = INTENTS.map((i) => {
    const qs = scan.queries.filter((q) => q.intent === i);
    return { i, n: qs.length, rate: qs.length ? qs.filter((q) => q.recommended).length / qs.length : 0 };
  }).filter((x) => x.n > 0);

  return (
    <div className="space-y-6">
      {/* Intent categories */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {intentStats.map((s) => (
          <button
            key={s.i}
            onClick={() => setIntent(intent === s.i ? "all" : s.i)}
            className={clsx(
              "focus-ring rounded-xl border p-3 text-left transition-all",
              intent === s.i ? "border-ink-900 bg-white ring-1 ring-ink-900" : "border-ink-150 bg-white hover:border-ink-300",
            )}
          >
            <div className="text-[12.5px] font-semibold">{INTENT_LABEL[s.i]}</div>
            <div className="text-[11px] text-ink-400">{INTENT_HINT[s.i]}</div>
            <div className="mt-2.5 flex items-baseline justify-between">
              <span className="num text-[18px] font-semibold">{pct(s.rate)}</span>
              <span className="num text-[11px] text-ink-400">{s.n} q</span>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]">
        <div className="card flex flex-col overflow-hidden lg:max-h-[calc(100vh-140px)] lg:sticky lg:top-[88px]">
          <div className="flex items-center justify-between gap-3 border-b border-ink-150 px-4 py-3">
            <span className="text-[13px] font-semibold">
              {list.length} question{list.length === 1 ? "" : "s"}
              {intent !== "all" && <span className="font-normal text-ink-400"> · {INTENT_LABEL[intent]}</span>}
            </span>
            <Segmented<Outcome>
              value={outcome}
              onChange={setOutcome}
              options={[
                { value: "all", label: "All" },
                { value: "recommended", label: "Recommended" },
                { value: "missed", label: "Missed" },
              ]}
            />
          </div>
          <ul className="flex-1 divide-y divide-ink-100 overflow-y-auto">
            {list.map((q) => (
              <QuestionRow
                key={q.id}
                q={q}
                active={selected?.id === q.id}
                onClick={() => {
                  setSelectedId(q.id);
                  setMobileOpen(true);
                }}
              />
            ))}
            {!list.length && <li className="p-6 text-center text-[13px] text-ink-500">No questions match these filters.</li>}
          </ul>
        </div>

        <div className="hidden lg:block">
          {selected && (
            <div key={selected.id} className="card animate-fade-in p-7">
              <QueryAnswer query={selected} businessName={scan.business.name} />
            </div>
          )}
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="text-[15px] font-semibold">Visibility by topic</div>
        <p className="mt-1 text-[13px] text-ink-500">Industry-specific themes in the questions {scan.industry.audience} ask.</p>
        <div className="mt-3">
          <TopicCoverage scan={scan} />
        </div>
      </div>

      <div className="lg:hidden">
        <Drawer open={mobileOpen && !!selected} onClose={() => setMobileOpen(false)} title="How AI answered">
          {selected && <QueryAnswer query={selected} businessName={scan.business.name} />}
        </Drawer>
      </div>
    </div>
  );
}

function QuestionRow({ q, active, onClick }: { q: QueryResult; active: boolean; onClick: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        className={clsx(
          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
          active ? "bg-ink-50 lg:shadow-[inset_2px_0_0_#0E1116]" : "hover:bg-ink-50/60",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] leading-snug text-ink-800">{q.text}</div>
          <div className="mt-1 text-[11.5px] text-ink-400">
            {INTENT_LABEL[q.intent]} · {q.winnerId === "you" ? "You're the top pick" : `Top pick: ${q.winnerName}`}
          </div>
        </div>
        <PositionPill position={q.position} mentioned={q.mentioned} size="sm" />
      </button>
    </li>
  );
}
