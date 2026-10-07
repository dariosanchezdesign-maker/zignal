import type { IndustryId } from "../model/types";
import type { AttributeDef, IndustryConfig, Subcategory } from "./types";
import { realEstate } from "./real-estate";
import { professionalServices } from "./professional-services";
import { hospitality } from "./hospitality";

/**
 * Industry registry. To add an industry, create a config implementing
 * IndustryConfig (subcategories, query categories, attributes, template
 * variables and templates) and register it here. Query generation, the
 * simulator, metrics, perception and insights all adapt automatically.
 */
export const INDUSTRIES: Record<IndustryId, IndustryConfig> = {
  "real-estate": realEstate,
  "professional-services": professionalServices,
  hospitality,
};

export const INDUSTRY_LIST: IndustryConfig[] = Object.values(INDUSTRIES);

export const getIndustry = (id: IndustryId): IndustryConfig => INDUSTRIES[id];

export function getSubcategory(industry: IndustryConfig, id: string): Subcategory {
  return industry.subcategories.find((s) => s.id === id) ?? industry.subcategories[0];
}

export function getAttribute(industry: IndustryConfig, id: string): AttributeDef {
  return industry.attributes.find((a) => a.id === id) ?? industry.attributes[0];
}

export function getCategoryLabel(industry: IndustryConfig, id: string): string {
  return industry.categories.find((c) => c.id === id)?.label ?? id;
}

export type { IndustryConfig, Subcategory, AttributeDef } from "./types";
