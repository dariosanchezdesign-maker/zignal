import type { BusinessProfile, CompetitorProfile, IndustryId } from "../types";
import { getCategory, getIndustry } from "../industries";
import { clamp, rng } from "./random";

export interface NewBusinessInput {
  name: string;
  website: string;
  industry: IndustryId;
  category: string;
  primaryService: string;
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

/**
 * Builds a profile for a new business. Visibility signals are estimated
 * deterministically from the inputs so the same business always scans the same.
 */
export function createBusinessProfile(input: NewBusinessInput): BusinessProfile {
  const industry = getIndustry(input.industry);
  const id = `${slug(input.name) || "business"}-${Date.now().toString(36)}`;
  const r = rng(input.name, input.website, input.category, input.location);

  // A business with a website has more for AI to read.
  const hasSite = input.website.trim().length > 3;
  const authority = clamp(0.42 + r() * 0.16 + (hasSite ? 0.04 : -0.06));
  const topicStrength: Record<string, number> = {};
  industry.topics.forEach((t, i) => {
    // Business tends to be strongest in one or two topics.
    const focusBoost = i === Math.floor(r() * industry.topics.length) ? 0.18 : 0;
    topicStrength[t.id] = clamp(0.3 + r() * 0.38 + focusBoost, 0.1, 0.92);
  });

  const names = input.competitors.map((c) => c.trim()).filter(Boolean);
  const group = getCategory(industry, input.category).templateGroup;
  const seeds = industry.marketNames[group] ?? Object.values(industry.marketNames)[0];
  const pool = names.length >= 2 ? names : [...names, ...seeds.filter((s) => !names.includes(s))];
  const competitors: CompetitorProfile[] = pool.slice(0, 4).map((name, i) => {
    const cr = rng(id, name);
    const ts: Record<string, number> = {};
    industry.topics.forEach((t) => (ts[t.id] = clamp(0.32 + cr() * 0.45 + (i === 0 ? 0.08 : 0), 0.1, 0.95)));
    return { id: `c${i + 1}-${slug(name)}`, name, authority: clamp(0.5 + cr() * 0.2 - i * 0.03), topicStrength: ts };
  });

  return {
    id,
    name: input.name.trim(),
    website: input.website.trim(),
    industry: input.industry,
    category: input.category,
    primaryService: input.primaryService.trim() || industry.categories.find((c) => c.id === input.category)?.services[0] || "",
    location: input.location,
    competitors,
    authority,
    topicStrength,
    createdAt: new Date().toISOString(),
    depth: 5,
  };
}
