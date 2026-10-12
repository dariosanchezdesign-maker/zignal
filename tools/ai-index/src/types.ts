// Records for the AI Index tool. Raw responses (RunRecord) are stored exactly
// as returned and never edited; everything else is derived from them.

export interface Question {
  id: string;
  text: string;
  category: string;
  intent: string;
  language: "en" | "es";
}

export interface Study {
  study: string;
  title: string;
  description: string;
  location: { city: string; region: string; country: string; timezone: string };
  questions: Question[];
}

export interface ProviderAnswer {
  text: string;
  citations: string[];
  refused: boolean;
  model: string; // model that actually answered (may differ after a fallback)
  usage?: Record<string, unknown>;
}

export interface Provider {
  id: string;
  label: string;
  model: string;
  webSearch: boolean;
  /** Missing credentials, as a human-readable reason; null when ready. */
  unavailableReason(): string | null;
  ask(question: Question, study: Study): Promise<ProviderAnswer>;
}

export interface RunRecord {
  run_id: string; // `${provider}:${question_id}:${repeat}`
  study: string;
  question_id: string;
  provider: string;
  model: string;
  repeat: number;
  prompt: string;
  web_search: boolean;
  started_at: string;
  finished_at: string;
  status: "completed" | "refused" | "failed";
  raw_response: string;
  citations: string[];
  error?: string;
  usage?: Record<string, unknown>;
}

export interface ExtractedBusiness {
  name: string;
  status: "recommended" | "mentioned";
  position: number | null; // order among recommended businesses, 1-based
  reasons: string[];
  area: string | null;
}

export interface ExtractionRecord {
  run_id: string;
  extractor: string; // "claude:<model>" or "heuristic"
  extracted_at: string;
  businesses: ExtractedBusiness[];
}
