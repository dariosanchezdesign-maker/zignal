// Defaults for the AI Index tool. Every value can be overridden with an
// environment variable so model names can be updated without code changes.
//
// The non-Anthropic model names below are reasonable defaults at the time of
// writing. Check each provider's current model list before a real study and
// set the matching environment variable if a name has changed.

export const CONFIG = {
  repeats: Number(process.env.AI_INDEX_REPEATS ?? 3),
  concurrency: Number(process.env.AI_INDEX_CONCURRENCY ?? 4),
  requestTimeoutMs: 180_000,

  anthropic: {
    model: process.env.AI_INDEX_ANTHROPIC_MODEL ?? "claude-opus-5-5",
    effort: (process.env.AI_INDEX_ANTHROPIC_EFFORT ?? "medium") as "low" | "medium" | "high",
    webSearch: process.env.AI_INDEX_ANTHROPIC_WEB_SEARCH !== "off",
  },
  openai: {
    model: process.env.AI_INDEX_OPENAI_MODEL ?? "gpt-5",
    webSearchTool: process.env.AI_INDEX_OPENAI_WEB_SEARCH_TOOL ?? "web_search",
    webSearch: process.env.AI_INDEX_OPENAI_WEB_SEARCH !== "off",
  },
  gemini: {
    model: process.env.AI_INDEX_GEMINI_MODEL ?? "gemini-2.5-flash",
    webSearch: process.env.AI_INDEX_GEMINI_WEB_SEARCH !== "off",
  },
  perplexity: {
    model: process.env.AI_INDEX_PERPLEXITY_MODEL ?? "sonar",
  },

  /** Model that turns free-text answers into structured records. */
  extractorModel: process.env.AI_INDEX_EXTRACTOR_MODEL ?? "claude-opus-5-5",
};
