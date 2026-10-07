import type { FunnelStage, IndustryId, IntentType } from "../model/types";

/**
 * Something a customer can ask for and an AI can credit a business with
 * ("romantic", "waterfront", "Act 60 tax"). Attributes link queries,
 * AI-stated rationale, perception and opportunities.
 */
export interface AttributeDef {
  id: string;
  label: string; // "Romantic"
  rationale: string; // AI-stated reason, e.g. "Romantic positioning"
  prose: string; // phrase used inside responses; extraction looks for it
  diagnosis: string; // noun phrase for diagnoses: "romantic-stay positioning"
  action: string; // concrete action to strengthen it
  keywords: string[]; // matches onboarding text and Ask AI questions
}

export interface VarOption {
  value: string;
  attrs?: string[];
  persona?: string;
}

export interface QueryTemplate {
  id: string;
  text: string; // placeholders: {location} plus any key in vars
  intent: IntentType;
  category: string;
  funnel: FunnelStage;
  persona: string;
  /** Template groups this template applies to (subcategory.group). */
  groups: string[];
  /** Base attributes every query from this template asks about. */
  attrs?: string[];
  /** Restrict {location} to the business area (local) or the region (broad). */
  scope?: "local" | "broad" | "any";
}

export interface QueryCategory {
  id: string;
  label: string;
}

export interface Subcategory {
  id: string;
  label: string;
  group: string;
  noun: string; // "accounting firm"
  plural: string; // "accounting firms"
  services: string[];
  specialties: string[];
  target_customer: string;
  /** Attribute baseline for a new business of this kind. */
  base: Record<string, number>;
  /** Overrides for template variables (e.g. services for this subcategory). */
  vars?: Record<string, VarOption[]>;
}

export interface IndustryConfig {
  id: IndustryId;
  label: string;
  emoji: string;
  tagline: string;
  audience: string;
  subcategories: Subcategory[];
  categories: QueryCategory[];
  /** A query's category follows the first variable attribute mapped here. */
  attrCategory: Record<string, string>;
  attributes: AttributeDef[];
  vars: Record<string, VarOption[]>;
  templates: QueryTemplate[];
  /** Fictional names AI also mentions, per subcategory group. */
  marketNames: Record<string, string[]>;
  missingInfo: string[];
  askExamples: string[];
}
