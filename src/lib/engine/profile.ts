import type { Business, Competitor, IndustryId, SignalProfile } from "../model/types";
import { getIndustry, getSubcategory } from "../industries";
import { nearbyAreas } from "../locations";
import type { WorkspaceRecord } from "./workspace";
import { clamp, rng } from "./random";

export interface NewBusinessInput {
  name: string;
  website: string;
  industry: IndustryId;
  subcategory: string;
  primaryService: string;
  specialties: string[];
  location: string;
  competitors: string[];
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export function createBusiness(input: NewBusinessInput): Business {
  const industry = getIndustry(input.industry);
  const sub = getSubcategory(industry, input.subcategory);
  const id = `${slug(input.name) || "business"}-${Date.now().toString(36)}`;
  const service = input.primaryService.trim() || sub.services[0];
  return {
    id,
    name: input.name.trim(),
    website: input.website.trim(),
    industry: input.industry,
    subcategory: sub.id,
    description: `${sub.label} in ${input.location} focused on ${service.toLowerCase()}.`,
    location: input.location,
    service_area: [input.location, ...nearbyAreas(input.location).slice(0, 2)],
    target_customer: sub.target_customer,
    services: [service],
    specialties: input.specialties,
    competitors: [],
    created_at: new Date().toISOString(),
  };
}

/**
 * Builds the simulation state for a new business. Attribute strengths start
 * from the subcategory baseline, are raised for what the business says it
 * offers, and vary deterministically by business.
 */
export function createWorkspaceRecord(input: NewBusinessInput): WorkspaceRecord {
  const business = createBusiness(input);
  const industry = getIndustry(input.industry);
  const sub = getSubcategory(industry, input.subcategory);
  const r = rng(input.name, input.website, input.subcategory, input.location);
  const text = [input.primaryService, ...input.specialties].join(" ").toLowerCase();

  const attributes: Record<string, number> = {};
  for (const a of industry.attributes) {
    const claimed = a.keywords.some((k) => text.includes(k)) ? 0.22 : 0;
    attributes[a.id] = clamp((sub.base[a.id] ?? 0.36) + claimed + (r() - 0.5) * 0.24, 0.1, 0.9);
  }
  const authority = clamp(0.46 + r() * 0.1 + (business.website ? 0.03 : -0.05));

  const market = industry.marketNames[sub.group] ?? Object.values(industry.marketNames)[0];
  const named = input.competitors.map((c) => c.trim()).filter(Boolean);
  const compNames = [...named, ...market.filter((m) => !named.includes(m))].slice(0, Math.max(3, Math.min(4, named.length)));
  const otherNames = market.filter((m) => !compNames.includes(m)).slice(0, 3);

  const competitors: Competitor[] = compNames.map((name, i) => ({
    id: `c${i + 1}-${slug(name)}`,
    business_id: business.id,
    name,
    location: i % 2 === 0 ? input.location : nearbyAreas(input.location)[0] ?? input.location,
    description: named.includes(name) ? "Added by you" : "Frequently recommended by AI for your queries",
  }));
  business.competitors = competitors.map((c) => c.id);

  const profile = (id: string, name: string, location: string, base: number, spread: number, auth: number): SignalProfile => {
    const cr = rng(business.id, id);
    const attrs: Record<string, number> = {};
    industry.attributes.forEach((a) => (attrs[a.id] = clamp(base + cr() * spread, 0.1, 0.92)));
    return { entity_id: id, name, location, authority: clamp(auth + cr() * 0.12), attributes: attrs };
  };

  return {
    business,
    competitors,
    signals: [
      { entity_id: "you", name: business.name, location: business.location, authority, attributes },
      ...competitors.map((c, i) => profile(c.id, c.name, c.location, 0.32 + (i === 0 ? 0.06 : 0), 0.46, 0.52)),
      ...otherNames.map((n, i) => profile(`o${i + 1}`, n, "San Juan", 0.28, 0.4, 0.44)),
    ],
    history_days: 0,
    baseline_date: new Date().toISOString(),
    manual_runs: [],
  };
}
