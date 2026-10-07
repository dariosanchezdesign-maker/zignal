import type { IndustryConfig, IndustryId } from "../types";
import { realEstate } from "./real-estate";
import { professionalServices } from "./professional-services";
import { hospitality } from "./hospitality";

/**
 * Industry registry. To add an industry: create a config file following the
 * IndustryConfig shape (categories, topics, query templates, copy) and register
 * it here. Onboarding, the scan engine and every dashboard adapt automatically.
 */
export const INDUSTRIES: Record<IndustryId, IndustryConfig> = {
  "real-estate": realEstate,
  "professional-services": professionalServices,
  hospitality,
};

export const INDUSTRY_LIST: IndustryConfig[] = Object.values(INDUSTRIES);

export function getIndustry(id: IndustryId): IndustryConfig {
  return INDUSTRIES[id];
}

export function getCategory(industry: IndustryConfig, categoryId: string) {
  return industry.categories.find((c) => c.id === categoryId) ?? industry.categories[0];
}

export function getTopic(industry: IndustryConfig, topicId: string) {
  return industry.topics.find((t) => t.id === topicId) ?? industry.topics[0];
}
