"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Info, Plus, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { getIndustry, getSubcategory } from "@/lib/industries";
import { PR_AREAS } from "@/lib/locations";
import { createWorkspaceRecord } from "@/lib/engine/profile";
import { Field, inputCls } from "@/components/flow-shell";
import { Button, PageHeader, TrustLabel } from "@/components/ui";

export default function Settings() {
  const router = useRouter();
  const { ws, workspaces, updateRecord, removeRecord, account } = useStore();
  const record = workspaces.find((r) => r.business.id === ws.business.id)!;
  const b = ws.business;
  const industry = getIndustry(b.industry);
  const [name, setName] = useState(b.name);
  const [website, setWebsite] = useState(b.website);
  const [description, setDescription] = useState(b.description);
  const [target, setTarget] = useState(b.target_customer);
  const [competitors, setCompetitors] = useState(ws.competitors.map((c) => c.name));
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setName(b.name);
    setWebsite(b.website);
    setDescription(b.description);
    setTarget(b.target_customer);
    setCompetitors(ws.competitors.map((c) => c.name));
    setConfirmDelete(false);
  }, [b, ws.competitors]);

  const readOnly = !!b.is_demo;

  function save() {
    const sameComps = competitors.join("|") === ws.competitors.map((c) => c.name).join("|");
    let next = { ...record, business: { ...record.business, name: name.trim() || b.name, website, description, target_customer: target } };
    if (!sameComps) {
      // New competitor set: rebuild competitor signal profiles, keep your own.
      const fresh = createWorkspaceRecord({
        name: next.business.name,
        website,
        industry: b.industry,
        subcategory: b.subcategory,
        primaryService: b.services[0] ?? "",
        specialties: b.specialties,
        location: b.location,
        competitors,
      });
      const comps = fresh.competitors.map((c) => ({ ...c, business_id: b.id }));
      next = {
        ...next,
        business: { ...next.business, competitors: comps.map((c) => c.id) },
        competitors: comps,
        signals: [record.signals.find((s) => s.entity_id === "you")!, ...fresh.signals.filter((s) => s.entity_id !== "you")],
      };
    }
    next.signals = next.signals.map((s) => (s.entity_id === "you" ? { ...s, name: next.business.name } : s));
    updateRecord(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Business profile and tracked competitors." />

      {readOnly && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-caution-100 bg-caution-50/60 p-4 text-[13px] text-ink-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-caution" />
          <div>
            <TrustLabel kind="demo" className="mb-1.5" />
            <p>Demo workspaces are read-only. {account ? "Add your own business to edit its profile." : "Create an account to scan your own business."}</p>
            <Button size="sm" className="mt-3" onClick={() => router.push(account ? "/onboarding" : "/signup")}>
              <Plus className="h-3.5 w-3.5" /> {account ? "Add a business" : "Create account"}
            </Button>
          </div>
        </div>
      )}

      <fieldset disabled={readOnly} className="space-y-6 disabled:opacity-70">
        <section className="card space-y-5 p-5 sm:p-6">
          <div>
            <h2 className="text-[15px] font-semibold">Business profile</h2>
            <p className="text-[13px] text-ink-500">
              {industry.emoji} {industry.label} · {getSubcategory(industry, b.subcategory).label} · {b.location}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Business name">
              <input id="settings-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Website">
              <input id="settings-website" className={inputCls} value={website} onChange={(e) => setWebsite(e.target.value)} />
            </Field>
            <Field label="Target customer">
              <input id="settings-target" className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)} />
            </Field>
            <Field label="Location">
              <select id="settings-location" className={inputCls} value={b.location} disabled>
                {PR_AREAS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Description">
            <textarea id="settings-description" className={`${inputCls} h-auto py-2.5`} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 gap-4 text-[13px] sm:grid-cols-3">
            <ReadOnly label="Services" value={b.services.join(", ") || "—"} />
            <ReadOnly label="Specialties" value={b.specialties.join(", ") || "—"} />
            <ReadOnly label="Service area" value={b.service_area.join(", ")} />
          </div>
        </section>

        <section className="card space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="text-[15px] font-semibold">Tracked competitors</h2>
            <p className="text-[13px] text-ink-500">Changes apply from the next simulation.</p>
          </div>
          <ul className="divide-y divide-ink-100 rounded-xl border border-ink-150">
            {competitors.map((c) => (
              <li key={c} className="flex items-center justify-between px-4 py-2.5 text-[13.5px]">
                {c}
                {!readOnly && competitors.length > 1 && (
                  <button aria-label={`Remove ${c}`} onClick={() => setCompetitors(competitors.filter((x) => x !== c))} className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-900">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!readOnly && competitors.length < 4 && (
            <div className="flex gap-2">
              <input id="settings-competitor" className={inputCls} placeholder="Add competitor" value={draft} onChange={(e) => setDraft(e.target.value)} />
              <Button
                variant="secondary"
                className="h-11"
                disabled={!draft.trim()}
                onClick={() => {
                  setCompetitors([...competitors, draft.trim()]);
                  setDraft("");
                }}
              >
                Add
              </Button>
            </div>
          )}
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold">Data source</h2>
          <div className="mt-4 divide-y divide-ink-100 text-[13.5px]">
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-ink-700">Simulated AI tests</span>
              <TrustLabel kind="simulated" />
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-ink-700">Live AI observations</span>
              <span className="text-[12.5px] text-ink-400">Not connected yet</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="text-ink-700">Query set</span>
              <span className="font-medium">{ws.queries.length} queries</span>
            </div>
          </div>
        </section>
      </fieldset>

      {!readOnly && (
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          {confirmDelete ? (
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-ink-600">Remove this business?</span>
              <Button
                size="sm"
                className="bg-negative hover:bg-negative/90"
                onClick={() => {
                  removeRecord(b.id);
                  router.push("/app");
                }}
              >
                Remove
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="text-negative hover:bg-negative-50 hover:text-negative">
              <Trash2 className="h-3.5 w-3.5" /> Remove business
            </Button>
          )}
          <Button onClick={save}>{saved ? (<><Check className="h-4 w-4" /> Saved</>) : "Save changes"}</Button>
        </div>
      )}
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[12px] text-ink-400">{label}</div>
      <div className="mt-0.5 text-ink-800">{value}</div>
    </div>
  );
}
