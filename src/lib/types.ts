// Core domain model for Zignal — AI Visibility Intelligence.
// Everything the product shows is derived from a BusinessProfile run through the
// scan engine (src/lib/engine). Industries are pluggable via src/lib/industries.

export type IndustryId = "real-estate" | "professional-services" | "hospitality";

export type Intent =
  | "discovery"
  | "comparison"
  | "high-intent"
  | "local"
  | "transactional"
  | "problem";

export type Level = "high" | "medium" | "low";

export type OpportunityStatus = "not-started" | "in-progress" | "completed";

export interface Topic {
  id: string;
  label: string;
  /** Lower-case phrase used inside sentences, e.g. "where to invest". */
  phrase: string;
  /** Words that map a free-form question onto this topic (Ask AI). */
  keywords: string[];
  /** Copy used to turn a weak topic into an opportunity. */
  opportunity: {
    title: string; // may use {city}, {service}, {name}
    why: string;
    action: string;
  };
  /** Signals AI cites when a business wins this topic. */
  winSignals: string[];
}

export interface CategoryDef {
  id: string;
  label: string;
  /** Singular / plural nouns used to build questions, e.g. "accounting firm". */
  noun: string;
  plural: string;
  /** Suggested primary services. */
  services: string[];
  /** Which template group this category uses. */
  templateGroup: string;
  /** Specialties / occasions / property types to fill {focus} slots. */
  focuses: string[];
}

export interface QueryTemplate {
  topic: string;
  intent: Intent;
  /** Placeholders: {city} {region} {noun} {plural} {focus} {service} */
  text: string;
}

export interface IndustryConfig {
  id: IndustryId;
  label: string;
  emoji: string;
  tagline: string;
  /** Who asks the questions: "buyers and investors", "clients", "guests". */
  audience: string;
  categories: CategoryDef[];
  topics: Topic[];
  templates: Record<string, QueryTemplate[]>;
  /** Generic positive signals AI uses for this industry. */
  strengths: string[];
  /** Information AI commonly lacks for businesses in this industry. */
  missingInfo: string[];
  /** Example questions shown in Ask AI. */
  askExamples: string[];
  /**
   * Fictional business names per template group. Used as default competitors
   * when a user lists none, and as the "other businesses" AI also names.
   */
  marketNames: Record<string, string[]>;
}

export interface CompetitorProfile {
  id: string;
  name: string;
  /** Overall authority 0..1 and per-topic strength 0..1 */
  authority: number;
  topicStrength: Record<string, number>;
}

export interface BusinessProfile {
  id: string;
  name: string;
  website: string;
  industry: IndustryId;
  category: string; // CategoryDef.id
  primaryService: string;
  location: string; // city / area
  competitors: CompetitorProfile[];
  authority: number;
  topicStrength: Record<string, number>;
  isDemo?: boolean;
  createdAt: string;
  /** Number of question variants per template. Demo workspaces use more. */
  depth?: number;
}

export interface RankedEntity {
  id: string; // "you" | competitor id
  name: string;
  position: number;
}

export interface QueryResult {
  id: string;
  text: string;
  intent: Intent;
  topic: string;
  location: string;
  ranking: RankedEntity[]; // businesses AI recommended, in order (max 5)
  alsoMentioned: RankedEntity[];
  position: number | null; // your position in ranking
  mentioned: boolean;
  recommended: boolean; // position <= 3
  winnerId: string;
  winnerName: string;
  opportunity: Level;
  summary: string;
  whyYou: string[];
  whyWinner: string[];
  /** Day-over-day position change, for "moved" indicators. */
  delta: number;
}

export interface EntityMetrics {
  id: string;
  name: string;
  score: number;
  mentionRate: number;
  recommendationRate: number;
  avgPosition: number | null;
  share: number;
  wins: number;
  topTopics: string[];
  edges: string[]; // "what they're doing that you aren't"
}

export interface TopicStat {
  topic: Topic;
  queries: number;
  recommendationRate: number;
  mentionRate: number;
  leader: { id: string; name: string; rate: number };
}

export interface Opportunity {
  id: string;
  index: number;
  topicId: string;
  title: string;
  impact: Level;
  why: string;
  action: string;
  expectedLift: number; // visibility points
  affectedQueries: number;
  status: OpportunityStatus;
}

export interface TrendPoint {
  date: string; // ISO day
  score: number;
}

export interface ScanResult {
  business: BusinessProfile;
  industry: IndustryConfig;
  queries: QueryResult[];
  you: EntityMetrics;
  competitors: EntityMetrics[];
  topics: TopicStat[];
  opportunities: Opportunity[];
  trend: TrendPoint[];
  story: { tone: "leading" | "contender" | "behind"; headline: string; detail: string };
  insights: string[];
}
