import type { Business, Competitor, SignalProfile } from "../model/types";
import type { WorkspaceRecord } from "../engine/workspace";
import { getIndustry } from "../industries";
import { clamp, rng } from "../engine/random";

// Demo workspaces. Every business here, competitors included, is fictional.
// Results are produced by the simulation engine and are labeled as such.

const CREATED = "2026-07-01T12:00:00.000Z";

function todayBaseline() {
  const d = new Date();
  d.setHours(6, 0, 0, 0);
  return d.toISOString();
}

function others(businessId: string, names: string[], attrIds: string[], location: string): SignalProfile[] {
  return names.map((name, i) => {
    const r = rng(businessId, "other", name);
    const attributes: Record<string, number> = {};
    attrIds.forEach((a) => (attributes[a] = clamp(0.28 + r() * 0.4)));
    return { entity_id: `o${i + 1}`, name, location, authority: clamp(0.44 + r() * 0.12), attributes };
  });
}

interface DemoSpec {
  business: Business;
  competitors: (Competitor & { authority: number; attributes: Record<string, number> })[];
  you: { authority: number; attributes: Record<string, number> };
  otherNames: string[];
}

function toRecord(spec: DemoSpec): WorkspaceRecord {
  const industry = getIndustry(spec.business.industry);
  const attrIds = industry.attributes.map((a) => a.id);
  return {
    business: spec.business,
    competitors: spec.competitors.map(({ authority: _a, attributes: _b, ...c }) => c),
    signals: [
      { entity_id: "you", name: spec.business.name, location: spec.business.location, ...spec.you },
      ...spec.competitors.map((c) => ({ entity_id: c.id, name: c.name, location: c.location, authority: c.authority, attributes: c.attributes })),
      ...others(spec.business.id, spec.otherNames, attrIds, "San Juan"),
    ],
    history_days: 90,
    baseline_date: todayBaseline(),
    manual_runs: [],
  };
}

const realEstate: DemoSpec = {
  business: {
    id: "demo-isla-capital",
    name: "Isla Capital Development",
    website: "islacapital.example",
    industry: "real-estate",
    subcategory: "developer",
    description: "Residential developer building rental-ready condos and investment properties in San Juan.",
    location: "San Juan",
    service_area: ["San Juan", "Condado", "Santurce", "Carolina"],
    target_customer: "Investors and second-home buyers",
    services: ["Residential development", "Investment properties", "Pre-construction sales"],
    specialties: ["Rental-ready units", "Act 60 buyers"],
    competitors: ["c-costa-norte", "c-palmar", "c-bahia"],
    created_at: CREATED,
    is_demo: true,
  },
  you: {
    authority: 0.56,
    attributes: { luxury: 0.44, waterfront: 0.3, investment: 0.7, rental: 0.64, "track-record": 0.6, "pre-construction": 0.68, commercial: 0.28, financing: 0.56, neighborhood: 0.6, residential: 0.66, value: 0.5 },
  },
  competitors: [
    {
      id: "c-costa-norte", business_id: "demo-isla-capital", name: "Costa Norte Developments", location: "Dorado",
      description: "Luxury waterfront condominium developer.",
      authority: 0.7,
      attributes: { luxury: 0.82, waterfront: 0.84, investment: 0.55, rental: 0.5, "track-record": 0.74, "pre-construction": 0.5, commercial: 0.4, financing: 0.45, neighborhood: 0.5, residential: 0.62, value: 0.28 },
    },
    {
      id: "c-palmar", business_id: "demo-isla-capital", name: "Palmar Living Group", location: "San Juan",
      description: "Mid-market residential developer.",
      authority: 0.56,
      attributes: { luxury: 0.55, waterfront: 0.45, investment: 0.5, rental: 0.56, "track-record": 0.56, "pre-construction": 0.62, commercial: 0.35, financing: 0.64, neighborhood: 0.64, residential: 0.68, value: 0.66 },
    },
    {
      id: "c-bahia", business_id: "demo-isla-capital", name: "Bahía Development Co.", location: "Carolina",
      description: "Commercial and mixed-use developer.",
      authority: 0.54,
      attributes: { luxury: 0.4, waterfront: 0.5, investment: 0.66, rental: 0.58, "track-record": 0.55, "pre-construction": 0.42, commercial: 0.78, financing: 0.44, neighborhood: 0.42, residential: 0.4, value: 0.45 },
    },
  ],
  otherNames: ["Ceiba Properties", "Marbella Norte Group", "Puerta de Tierra Developers"],
};

const professional: DemoSpec = {
  business: {
    id: "demo-cumbre",
    name: "Cumbre Advisory",
    website: "cumbreadvisory.example",
    industry: "professional-services",
    subcategory: "accounting",
    description: "Accounting and advisory firm for growing Puerto Rico businesses.",
    location: "San Juan",
    service_area: ["San Juan", "Hato Rey", "Guaynabo", "Carolina"],
    target_customer: "Growing small and mid-size businesses",
    services: ["Tax planning", "Bookkeeping", "CFO advisory"],
    specialties: ["Growing businesses", "Bilingual service"],
    competitors: ["c-montalvo", "c-cruz-pagan", "c-bayview"],
    created_at: CREATED,
    is_demo: true,
  },
  you: {
    authority: 0.56,
    attributes: { tax: 0.64, audit: 0.42, advisory: 0.72, startups: 0.36, "small-business": 0.62, construction: 0.28, "act-60": 0.42, "industry-expertise": 0.4, "local-presence": 0.66, bilingual: 0.72, pricing: 0.3, responsiveness: 0.58, "specialized-expertise": 0.45 },
  },
  competitors: [
    {
      id: "c-montalvo", business_id: "demo-cumbre", name: "Montalvo Advisory Group", location: "Hato Rey",
      description: "Established CPA firm with construction and healthcare practices.",
      authority: 0.68,
      attributes: { tax: 0.62, audit: 0.7, advisory: 0.6, startups: 0.35, "small-business": 0.45, construction: 0.8, "act-60": 0.45, "industry-expertise": 0.76, "local-presence": 0.6, bilingual: 0.55, pricing: 0.35, responsiveness: 0.45, "specialized-expertise": 0.62 },
    },
    {
      id: "c-cruz-pagan", business_id: "demo-cumbre", name: "Cruz Pagán & Associates", location: "San Juan",
      description: "Tax firm known for Act 60 compliance.",
      authority: 0.62,
      attributes: { tax: 0.74, audit: 0.55, advisory: 0.45, startups: 0.4, "small-business": 0.5, construction: 0.35, "act-60": 0.82, "industry-expertise": 0.45, "local-presence": 0.62, bilingual: 0.6, pricing: 0.5, responsiveness: 0.5, "specialized-expertise": 0.6 },
    },
    {
      id: "c-bayview", business_id: "demo-cumbre", name: "Bayview Tax Partners", location: "Guaynabo",
      description: "Accounting for startups and small businesses with flat-fee pricing.",
      authority: 0.5,
      attributes: { tax: 0.55, audit: 0.35, advisory: 0.5, startups: 0.76, "small-business": 0.66, construction: 0.3, "act-60": 0.35, "industry-expertise": 0.45, "local-presence": 0.5, bilingual: 0.55, pricing: 0.72, responsiveness: 0.66, "specialized-expertise": 0.4 },
    },
  ],
  otherNames: ["Ocean Park Advisors", "Almendro & Vega", "Norte Professional Group"],
};

const hospitality: DemoSpec = {
  business: {
    id: "demo-casa-mare",
    name: "Casa Maré",
    website: "casamare.example",
    industry: "hospitality",
    subcategory: "hotel",
    description: "Boutique luxury hotel in Condado with a rooftop bar and restaurant.",
    location: "Condado",
    service_area: ["Condado", "San Juan", "Old San Juan"],
    target_customer: "Couples and leisure travelers",
    services: ["Boutique luxury hotel", "Rooftop bar", "Restaurant"],
    specialties: ["Romantic getaways", "Design-led rooms"],
    competitors: ["c-solano", "c-arenisca", "c-coralina"],
    created_at: CREATED,
    is_demo: true,
  },
  you: {
    authority: 0.7,
    attributes: { luxury: 0.78, romantic: 0.74, boutique: 0.82, beachfront: 0.44, family: 0.24, business: 0.3, value: 0.24, dining: 0.62, walkability: 0.72, wellness: 0.48, nightlife: 0.56, local: 0.6 },
  },
  competitors: [
    {
      id: "c-solano", business_id: "demo-casa-mare", name: "The Solano Condado", location: "Condado",
      description: "Oceanfront luxury hotel.",
      authority: 0.66,
      attributes: { luxury: 0.74, romantic: 0.6, boutique: 0.4, beachfront: 0.84, family: 0.5, business: 0.56, value: 0.34, dining: 0.56, walkability: 0.6, wellness: 0.66, nightlife: 0.5, local: 0.4 },
    },
    {
      id: "c-arenisca", business_id: "demo-casa-mare", name: "Hotel Arenisca", location: "Condado",
      description: "Mid-range beach hotel popular with families.",
      authority: 0.58,
      attributes: { luxury: 0.4, romantic: 0.42, boutique: 0.35, beachfront: 0.64, family: 0.74, business: 0.52, value: 0.7, dining: 0.45, walkability: 0.6, wellness: 0.4, nightlife: 0.4, local: 0.45 },
    },
    {
      id: "c-coralina", business_id: "demo-casa-mare", name: "Villa Coralina Resort", location: "Isla Verde",
      description: "Beach resort with spa.",
      authority: 0.6,
      attributes: { luxury: 0.62, romantic: 0.62, boutique: 0.3, beachfront: 0.8, family: 0.6, business: 0.4, value: 0.4, dining: 0.5, walkability: 0.35, wellness: 0.74, nightlife: 0.45, local: 0.4 },
    },
  ],
  otherNames: ["La Ventana Suites", "Brisa Ocean House", "Palma Real Inn"],
};

export const DEMO_RECORDS: WorkspaceRecord[] = [hospitality, realEstate, professional].map(toRecord);
export const DEMO_IDS = DEMO_RECORDS.map((r) => r.business.id);

export function demoRecord(id: string) {
  return DEMO_RECORDS.find((r) => r.business.id === id);
}

