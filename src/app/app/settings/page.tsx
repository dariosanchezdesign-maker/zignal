"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Info, Plus, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { getCategory, getIndustry } from "@/lib/industries";
import { PR_AREAS } from "@/lib/locations";
import { Field, inputCls } from "@/components/flow-shell";
import { Button, DemoBadge, PageHeader } from "@/components/ui";
import { createBusinessProfile } from "@/lib/engine/profile";

export default function Settings() {
  const router = useRouter();
  const { active, updateProfile, removeProfile, account } = useStore();
  const industry = getIndustry(active.industry);
  const [name, setName] = useState(active.name);
  const [website, setWebsite] = useState(active.website);
  const [location, setLocation] = useState(active.location);
  const [service, setService] = useState(active.primaryService);
  const [competitors, setCompetitors] = useState(active.competitors.map((c) => c.name));
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setName(active.name);
    setWebsite(active.website);
    setLocation(active.location);
    setService(active.primaryService);
    setCompetitors(active.competitors.map((c) => c.name));
    setConfirmDelete(false);
  }, [active]);

  const readOnly = !!active.isDemo;

  function save() {
    const sameComps = competitors.join("|") === active.competitors.map((c) => c.name).join("|");
    // Re-derive competitor profiles only when the list changed.
    const comps = sameComps
      ? active.competitors
      : createBusinessProfile({
          name,
          website,
          industry: active.industry,
          category: active.category,
          primaryService: service,
          location,
          competitors,
        }).competitors;
    updateProfile({ ...active, name: name.trim() || active.name, website, location, primaryService: service, competitors: comps });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Your business profile, competitors and monitoring." />

      {readOnly && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-caution-100 bg-caution-50/60 p-4 text-[13px] text-ink-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-caution" />
          <div>
            <DemoBadge className="mb-1.5" />
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
              {industry.emoji} {industry.label} · {getCategory(industry, active.category).label}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Website">
              <input className={inputCls} value={website} onChange={(e) => setWebsite(e.target.value)} />
            </Field>
            <Field label="Location">
              <select className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)}>
                {PR_AREAS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </Field>
            <Field label="Primary service">
              <input className={inputCls} value={service} onChange={(e) => setService(e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="card space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="text-[15px] font-semibold">Tracked competitors</h2>
            <p className="text-[13px] text-ink-500">Up to 4. Changing competitors triggers a re-scan.</p>
          </div>
          <ul className="divide-y divide-ink-100 rounded-xl border border-ink-150">
            {competitors.map((c) => (
              <li key={c} className="flex items-center justify-between px-4 py-2.5 text-[13.5px]">
                {c}
                {!readOnly && (
                  <button aria-label={`Remove ${c}`} onClick={() => setCompetitors(competitors.filter((x) => x !== c))} className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-900">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!readOnly && competitors.length < 4 && (
            <div className="flex gap-2">
              <input className={inputCls} placeholder="Add competitor" value={draft} onChange={(e) => setDraft(e.target.value)} />
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
          <h2 className="text-[15px] font-semibold">Monitoring</h2>
          <div className="mt-4 divide-y divide-ink-100">
            {[
              ["Re-test questions", "Daily"],
              ["Weekly report", "Mondays, 8:00 AM AST"],
              ["Alert me when a competitor overtakes me", "On"],
              ["Market", "Puerto Rico"],
            ].map(([l, v]) => (
              <div key={l} className="flex items-center justify-between py-3 text-[13.5px]">
                <span className="text-ink-700">{l}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
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
                  removeProfile(active.id);
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
