"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Check, Download, Minus, Search, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { CommercialValue, IntentType, QueryOutcome, Severity } from "@/lib/model/types";
import { COMMERCIAL_LABEL } from "@/lib/engine/queries";
import { YOU } from "@/lib/engine/insights";
import { RunDrawer } from "@/components/run-detail";
import { PositionPill } from "@/components/recommendation-view";
import { Button, ImpactBadge, INTENT_LABEL, PageHeader, TrustLabel, ValueBadge } from "@/components/ui";

type Vis = "all" | "recommended" | "mentioned" | "absent";
type Pos = "all" | "1" | "top3" | "4plus" | "none";

export default function QueryExplorer() {
  const { ws } = useStore();
  const [search, setSearch] = useState("");
  const [intent, setIntent] = useState<IntentType | "all">("all");
  const [location, setLocation] = useState("all");
  const [value, setValue] = useState<CommercialValue | "all">("all");
  const [vis, setVis] = useState<Vis>("all");
  const [pos, setPos] = useState<Pos>("all");
  const [competitor, setCompetitor] = useState("all");
  const [opp, setOpp] = useState<Severity | "all">("all");
  const [open, setOpen] = useState<QueryOutcome | null>(null);
  const [sort, setSort] = useState<"default" | "value" | "position" | "opportunity">("default");

  const locations = useMemo(() => Array.from(new Set(ws.queries.map((q) => q.geography))), [ws]);
  const winners = useMemo(() => Array.from(new Set(ws.outcomes.map((o) => o.winner.business_name))).sort(), [ws]);

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = ws.outcomes.filter((o) => {
      const q = o.query;
      if (s && !q.text.toLowerCase().includes(s)) return false;
      if (intent !== "all" && q.intent_type !== intent) return false;
      if (location !== "all" && q.geography !== location) return false;
      if (value !== "all" && q.commercial_value !== value) return false;
      if (vis === "recommended" && !o.you?.recommended) return false;
      if (vis === "mentioned" && (!o.you || o.you.recommended)) return false;
      if (vis === "absent" && o.you) return false;
      const p = o.you?.position ?? null;
      if (pos === "1" && p !== 1) return false;
      if (pos === "top3" && !(p && p <= 3)) return false;
      if (pos === "4plus" && !(p && p >= 4)) return false;
      if (pos === "none" && p !== null) return false;
      if (competitor !== "all" && o.winner.business_name !== competitor) return false;
      if (opp !== "all" && o.opportunity !== opp) return false;
      return true;
    });
    const rank = { high: 0, medium: 1, low: 2 };
    if (sort === "value") filtered.sort((a, b) => b.query.commercial_weight - a.query.commercial_weight);
    if (sort === "position") filtered.sort((a, b) => (a.you?.position ?? 9) - (b.you?.position ?? 9));
    if (sort === "opportunity") filtered.sort((a, b) => rank[a.opportunity] - rank[b.opportunity] || b.query.commercial_weight - a.query.commercial_weight);
    return filtered;
  }, [ws, search, intent, location, value, vis, pos, competitor, opp, sort]);

  const activeFilters = [intent, location, value, vis, pos, competitor, opp].filter((f) => f !== "all").length + (search ? 1 : 0);
  const reset = () => {
    setSearch("");
    setIntent("all");
    setLocation("all");
    setValue("all");
    setVis("all");
    setPos("all");
    setCompetitor("all");
    setOpp("all");
  };

  function exportCsv() {
    const header = ["Query", "Intent", "Commercial value", "Location", "Recommended", "Position", "Winner", "Opportunity", "Raw response"];
    const lines = rows.map((o) =>
      [o.query.text, INTENT_LABEL[o.query.intent_type], COMMERCIAL_LABEL[o.query.commercial_value], o.query.geography, o.you?.recommended ? "Yes" : "No", o.you?.position ?? "", o.winner.business_name, o.opportunity, o.run.raw_response]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${ws.business.name.replace(/\s+/g, "-").toLowerCase()}-ai-runs.csv`;
    a.click();
  }

  const recommendedCount = rows.filter((r) => r.you?.recommended).length;

  return (
    <div>
      <PageHeader
        title="Query Explorer"
        description="Every query in the latest simulation, what AI answered, and where you stand. Click a row to see the full AI run."
        action={
          process.env.NEXT_PUBLIC_EMBED === "1" ? undefined : (
            <Button variant="secondary" size="sm" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          )
        }
      />

      <div className="card mb-4 p-3 sm:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            id="query-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search queries…"
            className="focus-ring h-10 w-full rounded-[10px] border border-ink-150 bg-ink-50 pl-9 pr-3 text-[14px] placeholder:text-ink-400 focus:bg-white"
          />
        </div>
        <div className="scrollbar-none -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-0.5">
          <Select label="Intent" value={intent} onChange={(v) => setIntent(v as IntentType | "all")} options={(Object.keys(INTENT_LABEL) as IntentType[]).map((i) => ({ value: i, label: INTENT_LABEL[i] }))} />
          <Select label="Location" value={location} onChange={setLocation} options={locations.map((l) => ({ value: l, label: l }))} />
          <Select
            label="Commercial value"
            value={value}
            onChange={(v) => setValue(v as CommercialValue | "all")}
            options={(Object.keys(COMMERCIAL_LABEL) as CommercialValue[]).map((c) => ({ value: c, label: COMMERCIAL_LABEL[c] }))}
          />
          <Select
            label="Recommended"
            value={vis}
            onChange={(v) => setVis(v as Vis)}
            options={[
              { value: "recommended", label: "Recommended" },
              { value: "mentioned", label: "Mentioned only" },
              { value: "absent", label: "Not mentioned" },
            ]}
          />
          <Select
            label="Position"
            value={pos}
            onChange={(v) => setPos(v as Pos)}
            options={[
              { value: "1", label: "#1" },
              { value: "top3", label: "Top 3" },
              { value: "4plus", label: "#4 or lower" },
              { value: "none", label: "Not ranked" },
            ]}
          />
          <Select label="Winner" value={competitor} onChange={setCompetitor} options={winners.map((w) => ({ value: w, label: w }))} />
          <Select
            label="Opportunity"
            value={opp}
            onChange={(v) => setOpp(v as Severity | "all")}
            options={[
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
          />
          {activeFilters > 0 && (
            <button onClick={reset} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 text-[12.5px] font-medium text-ink-500 hover:text-ink-900">
              <X className="h-3.5 w-3.5" /> Clear {activeFilters}
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[12.5px] text-ink-500">
        <span className="flex items-center gap-2">
          <span>
            <span className="num font-semibold text-ink-900">{rows.length}</span> queries · <span className="num font-semibold text-ink-900">{recommendedCount}</span> recommend you
          </span>
          <TrustLabel kind="simulated" />
        </span>
        <label className="flex items-center gap-2">
          Sort
          <select id="query-sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="focus-ring rounded-md border border-ink-150 bg-white px-2 py-1 text-[12.5px] text-ink-800">
            <option value="default">Default</option>
            <option value="value">Commercial value</option>
            <option value="position">Position</option>
            <option value="opportunity">Opportunity</option>
          </select>
        </label>
      </div>

      <div className="card hidden overflow-hidden md:block">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-ink-150 bg-ink-50/70 text-[11px] font-medium uppercase tracking-wide text-ink-500">
              <th className="px-5 py-2.5 font-medium">Question</th>
              <th className="px-3 py-2.5 font-medium">Intent</th>
              <th className="px-3 py-2.5 font-medium">Value</th>
              <th className="px-3 py-2.5 font-medium">Recommended?</th>
              <th className="px-3 py-2.5 font-medium">Position</th>
              <th className="px-3 py-2.5 font-medium">Winner</th>
              <th className="px-5 py-2.5 font-medium">Opportunity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((o) => (
              <tr key={o.query.id} onClick={() => setOpen(o)} className="cursor-pointer transition-colors hover:bg-ink-50/70">
                <td className="max-w-[360px] px-5 py-3">
                  <div className="text-[13.5px] font-medium leading-snug text-ink-900">{o.query.text}</div>
                  <div className="mt-0.5 text-[11.5px] text-ink-400">
                    {o.query.geography} · {o.query.customer_persona}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-[12.5px] text-ink-600">{INTENT_LABEL[o.query.intent_type]}</td>
                <td className="px-3 py-3">
                  <ValueBadge value={o.query.commercial_value} />
                </td>
                <td className="px-3 py-3">
                  <RecCell o={o} />
                </td>
                <td className="px-3 py-3">
                  <PositionPill outcome={o} />
                </td>
                <td className="max-w-[160px] truncate px-3 py-3 text-[13px]">
                  {o.winner.matched_business_id === YOU ? <span className="font-medium text-accent-700">You</span> : <span className="text-ink-700">{o.winner.business_name}</span>}
                </td>
                <td className="px-5 py-3">
                  <ImpactBadge level={o.opportunity} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty onReset={reset} />}
      </div>

      <div className="space-y-2 md:hidden">
        {rows.map((o) => (
          <button key={o.query.id} onClick={() => setOpen(o)} className="card w-full p-4 text-left">
            <div className="text-[14px] font-medium leading-snug">{o.query.text}</div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PositionPill outcome={o} />
              <ValueBadge value={o.query.commercial_value} />
              <ImpactBadge level={o.opportunity} prefix="Opp. " />
            </div>
            <div className="mt-2 text-[12px] text-ink-500">
              {INTENT_LABEL[o.query.intent_type]} · Winner: {o.winner.matched_business_id === YOU ? "You" : o.winner.business_name}
            </div>
          </button>
        ))}
        {!rows.length && (
          <div className="card">
            <Empty onReset={reset} />
          </div>
        )}
      </div>

      <RunDrawer outcome={open} ws={ws} onClose={() => setOpen(null)} />
    </div>
  );
}

function RecCell({ o }: { o: QueryOutcome }) {
  if (o.you?.recommended)
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-positive">
        <Check className="h-3.5 w-3.5" strokeWidth={2.6} /> Yes
      </span>
    );
  if (o.you)
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-ink-500">
        <Minus className="h-3.5 w-3.5" /> Mentioned
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-negative">
      <X className="h-3.5 w-3.5" strokeWidth={2.6} /> No
    </span>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const active = value !== "all";
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={clsx(
        "focus-ring h-8 shrink-0 cursor-pointer appearance-none rounded-lg border bg-[length:12px] bg-[right_8px_center] bg-no-repeat pl-2.5 pr-7 text-[12.5px] transition-colors",
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238C939C' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        active ? "border-ink-900 bg-ink-900 font-medium text-white" : "border-ink-150 bg-white text-ink-700 hover:border-ink-300",
      )}
    >
      <option value="all" className="bg-white text-ink-900">
        {label}: All
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-white text-ink-900">
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Empty({ onReset }: { onReset: () => void }) {
  return (
    <div className="p-10 text-center">
      <div className="text-[14px] font-medium">No queries match these filters</div>
      <button onClick={onReset} className="mt-2 text-[13px] text-ink-500 underline underline-offset-4 hover:text-ink-900">
        Clear filters
      </button>
    </div>
  );
}
