// Zignal V1 data model.
//
// Entities mirror what a production backend will store. Field names on core
// records are snake_case to match the planned database schema. Everything the
// UI shows is derived from these records:
//
//   Business → Query → AIRun (raw response) → Recommendation (extracted)
//            → Metrics → Insight → (status) → next Simulation

export type IndustryId = "real-estate" | "professional-services" | "hospitality";

export type IntentType = "discovery" | "best-of" | "comparison" | "local" | "problem" | "high-intent" | "transactional";
export type FunnelStage = "awareness" | "consideration" | "decision";
export type CommercialValue = "low" | "medium" | "high" | "very-high";
export type Difficulty = "low" | "medium" | "high";
export type RunMode = "simulated" | "live";

// ---------------------------------------------------------------------------
// Core records

export interface Business {
  id: string;
  name: string;
  website: string;
  industry: IndustryId;
  subcategory: string;
  description: string;
  location: string;
  service_area: string[];
  target_customer: string;
  services: string[];
  specialties: string[];
  competitors: string[]; // Competitor ids
  created_at: string;
  is_demo?: boolean;
}

export interface Competitor {
  id: string;
  business_id: string;
  name: string;
  location: string;
  description: string;
}

export interface Query {
  id: string;
  text: string;
  industry: IndustryId;
  geography: string;
  intent_type: IntentType;
  funnel_stage: FunnelStage;
  customer_persona: string;
  commercial_value: CommercialValue;
  commercial_weight: number; // 0–100, drives high-intent weighting
  difficulty: Difficulty;
  template_id: string;
  category: string; // query category, used for coverage
  attributes: string[]; // what the customer is asking for (e.g. "romantic")
}

export interface AIRun {
  id: string;
  simulation_id: string;
  query_id: string;
  business_id: string;
  mode: RunMode;
  provider: string;
  model: string;
  run_date: string;
  prompt: string;
  raw_response: string; // never edited after capture
  status: "completed" | "failed";
}

export interface Recommendation {
  id: string;
  ai_run_id: string;
  business_name: string;
  matched_business_id: string | null; // "you" | competitor id | other-business id | null
  mentioned: boolean;
  recommended: boolean;
  position: number | null;
  rationale: string[]; // AI-stated reasons, extracted from the raw response
  confidence: number; // 0–1, extraction + ranking confidence
  source_type: "simulated_response" | "live_response";
}

export type InsightType =
  | "visibility-gap"
  | "competitive-threat"
  | "positioning-gap"
  | "query-opportunity"
  | "reputation-signal"
  | "coverage-gap";

export type Severity = "high" | "medium" | "low";
export type InsightStatus = "not-started" | "in-progress" | "completed";

export interface Evidence {
  label: string;
  value: string;
  query_ids?: string[];
}

export interface Insight {
  id: string; // stable across simulations (type + subject)
  business_id: string;
  type: InsightType;
  title: string;
  severity: Severity;
  observation: string;
  evidence: Evidence[];
  diagnosis: string; // AI-generated diagnosis, labeled as such in the UI
  recommendation: string;
  expected_impact: { points: number; level: Severity };
  status: InsightStatus;
  /** Attributes the action strengthens; used by later simulations. */
  target_attributes: string[];
  query_ids: string[];
}

export interface Simulation {
  id: string;
  business_id: string;
  index: number; // 0 = baseline scan; negative = monitoring history
  run_date: string;
  mode: RunMode;
  provider: string;
  model: string;
  query_count: number;
  trigger: "baseline" | "scheduled" | "manual";
}

// ---------------------------------------------------------------------------
// Simulation state. The hidden model the simulator uses for each entity. In a
// live system this does not exist: answers come from real assistants.

export interface SignalProfile {
  entity_id: string;
  name: string;
  location: string;
  authority: number; // 0–1: reviews, press, third-party references
  attributes: Record<string, number>; // 0–1 strength per industry attribute
}

// ---------------------------------------------------------------------------
// Derived

export interface ScoreComponent {
  key: "recommendation" | "position" | "coverage" | "share" | "high_intent";
  label: string;
  weight: number; // 0–1
  raw: string; // display of the underlying measure
  normalized: number; // 0–100
  contribution: number; // points of final score
  explanation: string;
}

export interface EntityMetrics {
  entity_id: string;
  name: string;
  queries: number;
  recommended: number;
  mentioned: number;
  recommendation_rate: number;
  mention_rate: number;
  avg_position: number | null;
  share_of_voice: number;
  coverage: number;
  coverage_by_category: Record<string, number>;
  high_intent_visibility: number;
  weighted_recommendation_rate: number;
  wins: number;
  components: ScoreComponent[];
  score: number;
}

export interface Association {
  attribute: string;
  label: string;
  strength: number; // 0–100
  citations: number;
  relevantQueries: number;
}

export interface QueryOutcome {
  query: Query;
  run: AIRun;
  recommendations: Recommendation[];
  you: Recommendation | null;
  winner: Recommendation;
  opportunity: Severity;
}

export interface Snapshot {
  simulation: Simulation;
  score: number;
  recommendation_rate: number;
  share_of_voice: number;
}
