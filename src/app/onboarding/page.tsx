"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui";
import { Field, FlowShell, inputCls } from "@/components/flow-shell";
import { INDUSTRY_LIST, getIndustry } from "@/lib/industries";
import { PR_AREAS } from "@/lib/locations";
import { createBusinessProfile } from "@/lib/engine/profile";
import { useStore } from "@/lib/store";
import type { IndustryId } from "@/lib/types";

const NAME_EXAMPLE: Record<IndustryId, string> = {
  "real-estate": "e.g. Costa Norte Developments",
  "professional-services": "e.g. Rivera Colón CPA Group",
  hospitality: "e.g. Casa Marea Hotel",
};

const FEATURED_AREAS = ["San Juan", "Condado", "Dorado", "Carolina", "Ponce", "Mayagüez", "Rincón", "Caguas"];

export default function Onboarding() {
  const router = useRouter();
  const { addProfile, setPendingScan } = useStore();
  const [step, setStep] = useState<0 | 1>(0);
  const [industryId, setIndustryId] = useState<IndustryId | null>(null);
  const industry = industryId ? getIndustry(industryId) : null;

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("San Juan");
  const [category, setCategory] = useState("");
  const [service, setService] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [compDraft, setCompDraft] = useState("");

  const cat = useMemo(() => industry?.categories.find((c) => c.id === category), [industry, category]);
  const valid = name.trim().length > 1 && !!category && location.trim().length > 1;

  function chooseIndustry(id: IndustryId) {
    setIndustryId(id);
    setCategory("");
    setService("");
    setStep(1);
  }

  function addCompetitor() {
    const v = compDraft.trim();
    if (v && competitors.length < 4 && !competitors.includes(v)) setCompetitors([...competitors, v]);
    setCompDraft("");
  }

  function submit() {
    if (!industryId || !valid) return;
    const profile = createBusinessProfile({
      name,
      website,
      industry: industryId,
      category,
      primaryService: service,
      location,
      competitors: compDraft.trim() ? [...competitors, compDraft.trim()] : competitors,
    });
    addProfile(profile);
    setPendingScan(profile.id);
    router.push("/scan");
  }

  return (
    <FlowShell step={1} wide>
      {step === 0 && (
        <div className="animate-fade-up">
          <h1 className="text-[28px] font-semibold tracking-tight sm:text-[32px]">What type of business are you?</h1>
          <p className="mt-2 text-[15px] text-ink-500">We&apos;ll tailor the questions to what your customers actually ask AI.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {INDUSTRY_LIST.map((ind) => (
              <button
                key={ind.id}
                onClick={() => chooseIndustry(ind.id)}
                className={clsx(
                  "focus-ring group flex flex-col items-start rounded-2xl border bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lift",
                  industryId === ind.id ? "border-ink-900 ring-1 ring-ink-900" : "border-ink-150 hover:border-ink-300",
                )}
              >
                <span className="text-[28px] leading-none">{ind.emoji}</span>
                <span className="mt-5 text-[16px] font-semibold tracking-tight">{ind.label}</span>
                <span className="mt-1.5 text-[13px] leading-snug text-ink-500">{ind.categories.map((c) => c.label.split(" /")[0]).slice(0, 4).join(", ")}…</span>
                <span className="mt-5 inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-400 transition-colors group-hover:text-ink-900">
                  Select <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && industry && (
        <div className="animate-fade-up">
          <button onClick={() => setStep(0)} className="focus-ring mb-6 inline-flex items-center gap-1.5 rounded-md text-[13px] text-ink-500 hover:text-ink-900">
            <ArrowLeft className="h-3.5 w-3.5" /> {industry.emoji} {industry.label}
          </button>
          <h1 className="text-[28px] font-semibold tracking-tight sm:text-[32px]">Tell us about your business</h1>
          <p className="mt-2 text-[15px] text-ink-500">Six quick details. Only the name, category and location are required.</p>

          <div className="card mt-8 space-y-6 p-5 sm:p-7">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Business name">
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder={NAME_EXAMPLE[industry.id]} autoFocus />
              </Field>
              <Field label="Website" optional>
                <input className={inputCls} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="yourbusiness.com" inputMode="url" />
              </Field>
            </div>

            <Field group label="Location" hint="Puerto Rico by default. Pick your city or area.">
              <div className="flex flex-wrap gap-1.5">
                {FEATURED_AREAS.map((a) => (
                  <Chip key={a} active={location === a} onClick={() => setLocation(a)}>
                    {a}
                  </Chip>
                ))}
                <select
                  value={FEATURED_AREAS.includes(location) ? "" : location}
                  onChange={(e) => e.target.value && setLocation(e.target.value)}
                  aria-label="More areas"
                  className={clsx(
                    "focus-ring h-8 rounded-full border bg-white px-3 text-[13px]",
                    !FEATURED_AREAS.includes(location) ? "border-ink-900 text-ink-900" : "border-ink-200 text-ink-500",
                  )}
                >
                  <option value="">More areas…</option>
                  {PR_AREAS.filter((a) => !FEATURED_AREAS.includes(a)).map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </Field>

            <Field group label="Specific category">
              <div className="flex flex-wrap gap-1.5">
                {industry.categories.map((c) => (
                  <Chip
                    key={c.id}
                    active={category === c.id}
                    onClick={() => {
                      setCategory(c.id);
                      setService("");
                    }}
                  >
                    {c.label}
                  </Chip>
                ))}
              </div>
            </Field>

            {cat && (
              <Field group label="Primary service" hint="What do you most want to be recommended for?">
                <input aria-label="Primary service" className={inputCls} value={service} onChange={(e) => setService(e.target.value)} placeholder={cat.services[0]} />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {cat.services.map((s) => (
                    <Chip key={s} small active={service === s} onClick={() => setService(s)}>
                      {s}
                    </Chip>
                  ))}
                </div>
              </Field>
            )}

            <Field group label="Competitors" optional hint="Up to 4. If you skip this, we'll find who AI recommends instead.">
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  value={compDraft}
                  onChange={(e) => setCompDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCompetitor();
                    }
                  }}
                  placeholder="Competitor name"
                  aria-label="Competitor name"
                  disabled={competitors.length >= 4}
                />
                <Button type="button" variant="secondary" className="h-11 shrink-0" onClick={addCompetitor} disabled={!compDraft.trim() || competitors.length >= 4}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
              {competitors.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {competitors.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 rounded-full bg-ink-100 py-1 pl-3 pr-1.5 text-[13px] text-ink-700">
                      {c}
                      <button
                        type="button"
                        aria-label={`Remove ${c}`}
                        onClick={() => setCompetitors(competitors.filter((x) => x !== c))}
                        className="rounded-full p-0.5 hover:bg-ink-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Field>
          </div>

          <div className="mt-6 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-[12.5px] text-ink-400">Next: we&apos;ll test how AI responds to questions about {cat ? cat.plural : "businesses like yours"}.</p>
            <Button size="lg" onClick={submit} disabled={!valid}>
              Run my AI Visibility Scan <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </FlowShell>
  );
}

function Chip({ active, onClick, children, small }: { active: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "focus-ring inline-flex items-center gap-1 rounded-full border transition-colors",
        small ? "h-7 px-2.5 text-[12px]" : "h-8 px-3 text-[13px]",
        active ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-700 hover:border-ink-300",
      )}
    >
      {active && <Check className="h-3 w-3" strokeWidth={3} />}
      {children}
    </button>
  );
}
