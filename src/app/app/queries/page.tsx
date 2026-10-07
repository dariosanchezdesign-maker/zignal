"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Check, Download, Minus, Search, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Intent, Level, QueryResult } from "@/lib/types";
import { Drawer } from "@/components/drawer";
import { PositionPill, QueryAnswer } from "@/components/query-answer";
import { Button, ImpactBadge, INTENT_LABEL, PageHeader } from "@/components/ui";

type Vis = "all" | "recommended" | "mentioned" | "absent";
type Pos = "all" | "1" | "top3" | "4plus" | "none";

export default function QueryExplorer() {
  const { scan } = useStore();
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState("all");
  const [location, setLocation] = useState("all");
  const [intent, setIntent] = useState<Intent | "all">("all");
  const [vis, setVis] = useState<Vis>("all");
  const [pos, setPos] = useState<Pos>("all");
  const [competitor, setCompetitor] = useState("all");
  const [opp, setOpp] = useState<Level | "all">("all");
  const [open, setOpen] = useState<QueryResult | null>(null);
  const [sort, setSort] = useState<"default" | "position" | "opportunity">("default");

  const locations = useMemo(() => Array.from(new Set(scan.queries.map((q) => q.location))), [scan]);
  const winners = useMemo(() => Array.from(new Set(scan.queries.map((q) => q.winnerName))).sort(), [scan]);

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const filtered = scan.queries.filter((q) => {
      if (s && !q.text.toLowerCase().includes(s)) return false;
      if (topic !== "all" && q.topic !== topic) return false;
      if (location !== "all" && q.location !== location) return false;
      if (intent !== "all" && q.intent !== intent) return false;
      if (vis === "recommended" && !q.recommended) return false;
      if (vis === "mentioned" && (q.recommended || !q.mentioned)) return false;
      if (vis === "absent" && q.mentioned) return false;
      if (pos === "1" && q.position !== 1) return false;
      if (pos === "top3" && !(q.position && q.position <= 3)) return false;
      if (pos === "4plus" && !(q.position && q.position >= 4)) return false;
      if (pos === "none" && q.position !== null) return false;
      if (competitor !== "all" && q.winnerName !== competitor) return false;
      if (opp !== "all" && q.opportunity !== opp) return false;
      return true;
    });
    const oRank = { high: 0, medium: 1, low: 2 };
    if (sort === "position") filtered.sort((a, b) => (a.position ?? 9) - (b.position ?? 9));
    if (sort === "opportunity") filtered.sort((a, b) => oRank[a.opportunity] - oRank[b.opportunity]);
    return filtered;
  }, [scan, search, topic, location, intent, vis, pos, competitor, opp, sort]);

  const activeFilters = [topic, location, intent, vis, pos, competitor, opp].filter((f) => f !== "all").length + (search ? 1 : 0);
  const reset = () => {
    setSearch("");
    setTopic("all");
    setLocation("all");
    setIntent("all");
    setVis("all");
    setPos("all");
    setCompetitor("all");
    setOpp("all");
  };

  function exportCsv() {
    const header = ["Question", "Topic", "Intent", "Location", "Recommended", "Position", "Winner", "Opportunity"];
    const lines = rows.map((q) =>
      [q.text, scan.industry.topics.find((t) => t.id === q.topic)?.label ?? q.topic, INTENT_LABEL[q.intent], q.location, q.recommended ? "Yes" : "No", q.position ?? "", q.winnerName, q.opportunity]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${scan.business.name.replace(/\s+/g, "-").toLowerCase()}-ai-queries.csv`;
    a.click();
  }

  const recommendedCount = rows.filter((r) => r.recommended).length;

  return (
    <div>
      <PageHeader
        title="Query Explorer"
        description="Every customer question we monitor, what AI answered, and where you stand."
        action={
          process.env.NEXT_PUBLIC_EMBED === "1" ? undefined : (
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          )
        }
      />

      {/* Filters */}
      <div className="card mb-4 p-3 sm:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions…"
            className="focus-ring h-10 w-full rounded-[10px] border border-ink-150 bg-ink-50 pl-9 pr-3 text-[14px] placeholder:text-ink-400 focus:bg-white"
          />
        </div>
        <div className="scrollbar-none -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-0.5">
          <Select label={`${scan.industry.label} topic`} value={topic} onChange={setTopic} options={scan.industry.topics.map((t) => ({ value: t.id, label: t.label }))} />
          <Select label="Location" value={location} onChange={setLocation} options={locations.map((l) => ({ value: l, label: l }))} />
          <Select
            label="Intent"
            value={intent}
            onChange={(v) => setIntent(v as Intent | "all")}
            options={(Object.keys(INTENT_LABEL) as Intent[]).map((i) => ({ value: i, label: INTENT_LABEL[i] }))}
          />
          <Select
            label="Visibility"
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
          <Select label="Competitor winner" value={competitor} onChange={setCompetitor} options={winners.map((w) => ({ value: w, label: w }))} />
          <Select
            label="Opportunity"
            value={opp}
            onChange={(v) => setOpp(v as Level | "all")}
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

      <div className="mb-3 flex items-center justify-between px-1 text-[12.5px] text-ink-500">
        <span>
          <span className="num font-semibold text-ink-900">{rows.length}</span> questions ·{" "}
          <span className="num font-semibold text-ink-900">{recommendedCount}</span> recommend you
        </span>
        <label className="flex items-center gap-2">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="focus-ring rounded-md border border-ink-150 bg-white px-2 py-1 text-[12.5px] text-ink-800">
            <option value="default">Relevance</option>
            <option value="position">Position</option>
            <option value="opportunity">Opportunity</option>
          </select>
        </label>
      </div>

      {/* Desktop table */}
      <div className="card hidden overflow-hidden md:block">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-ink-150 bg-ink-50/70 text-[11.5px] font-medium uppercase tracking-wide text-ink-500">
              <th className="px-5 py-2.5 font-medium">Question</th>
              <th className="px-3 py-2.5 font-medium">AI recommends you?</th>
              <th className="px-3 py-2.5 font-medium">Position</th>
              <th className="px-3 py-2.5 font-medium">Winner</th>
              <th className="px-5 py-2.5 font-medium">Opportunity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((q) => (
              <tr key={q.id} onClick={() => setOpen(q)} className="cursor-pointer transition-colors hover:bg-ink-50/70">
                <td className="max-w-[420px] px-5 py-3">
                  <div className="text-[13.5px] font-medium leading-snug text-ink-900">{q.text}</div>
                  <div className="mt-0.5 text-[11.5px] text-ink-400">
                    {INTENT_LABEL[q.intent]} · {q.location}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <RecCell q={q} />
                </td>
                <td className="px-3 py-3">
                  <PositionPill position={q.position} mentioned={q.mentioned} size="sm" />
                </td>
                <td className="px-3 py-3 text-[13px]">
                  {q.winnerId === "you" ? <span className="font-medium text-accent-700">You</span> : <span className="text-ink-700">{q.winnerName}</span>}
                </td>
                <td className="px-5 py-3">
                  <ImpactBadge level={q.opportunity} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty onReset={reset} />}
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {rows.map((q) => (
          <button key={q.id} onClick={() => setOpen(q)} className="card w-full p-4 text-left">
            <div className="text-[14px] font-medium leading-snug">{q.text}</div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PositionPill position={q.position} mentioned={q.mentioned} size="sm" />
              <ImpactBadge level={q.opportunity} prefix="Opp. " />
              <span className="text-[12px] text-ink-500">Winner: {q.winnerId === "you" ? "You" : q.winnerName}</span>
            </div>
          </button>
        ))}
        {!rows.length && (
          <div className="card">
            <Empty onReset={reset} />
          </div>
        )}
      </div>

      <Drawer open={!!open} onClose={() => setOpen(null)} title="How AI answered">
        {open && <QueryAnswer query={open} businessName={scan.business.name} />}
      </Drawer>
    </div>
  );
}

function RecCell({ q }: { q: QueryResult }) {
  if (q.recommended)
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-positive">
        <Check className="h-3.5 w-3.5" strokeWidth={2.6} /> Recommended
      </span>
    );
  if (q.mentioned)
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-500">
        <Minus className="h-3.5 w-3.5" /> Mentioned
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-negative">
      <X className="h-3.5 w-3.5" strokeWidth={2.6} /> Not mentioned
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
      <div className="text-[14px] font-medium">No questions match these filters</div>
      <button onClick={onReset} className="mt-2 text-[13px] text-ink-500 underline underline-offset-4 hover:text-ink-900">
        Clear filters
      </button>
    </div>
  );
}
