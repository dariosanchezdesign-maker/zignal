import { CONFIG } from "../config";
import type { Provider, ProviderAnswer, Question, Study } from "../types";

// Non-Anthropic providers, called over their public HTTP APIs. Response shapes
// follow each provider's documented format at the time of writing; if a
// provider changes its API, the error message includes the raw body so the
// parser here can be adjusted.

async function postJson(url: string, body: unknown, headers: Record<string, string>): Promise<any> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(CONFIG.requestTimeoutMs),
      });
      const text = await res.text();
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
        await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
      return JSON.parse(text);
    } catch (e) {
      lastError = e;
      if (e instanceof Error && e.message.startsWith("HTTP 4")) throw e;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    }
  }
  throw lastError;
}

/** ChatGPT via the OpenAI Responses API, with web search. */
export function openaiProvider(): Provider {
  const { model, webSearch, webSearchTool } = CONFIG.openai;
  return {
    id: "chatgpt",
    label: "ChatGPT",
    model,
    webSearch,
    unavailableReason: () => (process.env.OPENAI_API_KEY ? null : "set OPENAI_API_KEY"),
    async ask(question: Question, study: Study): Promise<ProviderAnswer> {
      const body: Record<string, unknown> = { model, input: question.text };
      if (webSearch) {
        body.tools = [
          {
            type: webSearchTool,
            user_location: { type: "approximate", city: study.location.city, region: study.location.region, country: study.location.country },
          },
        ];
      }
      const json = await postJson("https://api.openai.com/v1/responses", body, { authorization: `Bearer ${process.env.OPENAI_API_KEY}` });
      const parts: string[] = [];
      const citations = new Set<string>();
      for (const item of json.output ?? []) {
        if (item.type !== "message") continue;
        for (const c of item.content ?? []) {
          if (c.type === "output_text") {
            parts.push(c.text);
            for (const a of c.annotations ?? []) if (a.url) citations.add(a.url);
          }
          if (c.type === "refusal") parts.push(c.refusal);
        }
      }
      if (!parts.length) throw new Error(`No text in OpenAI response: ${JSON.stringify(json).slice(0, 400)}`);
      return { text: parts.join("\n"), citations: [...citations], refused: false, model: json.model ?? model, usage: json.usage };
    },
  };
}

/** Gemini via the Generative Language API, grounded with Google Search. */
export function geminiProvider(): Provider {
  const { model, webSearch } = CONFIG.gemini;
  return {
    id: "gemini",
    label: "Gemini",
    model,
    webSearch,
    unavailableReason: () => (process.env.GEMINI_API_KEY ? null : "set GEMINI_API_KEY"),
    async ask(question: Question): Promise<ProviderAnswer> {
      const body: Record<string, unknown> = { contents: [{ role: "user", parts: [{ text: question.text }] }] };
      if (webSearch) body.tools = [{ google_search: {} }];
      const json = await postJson(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, body, {
        "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
      });
      const cand = json.candidates?.[0];
      const text = (cand?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
      const citations = (cand?.groundingMetadata?.groundingChunks ?? []).map((g: { web?: { uri?: string } }) => g.web?.uri).filter(Boolean);
      if (!text && cand?.finishReason !== "SAFETY") throw new Error(`No text in Gemini response: ${JSON.stringify(json).slice(0, 400)}`);
      return { text, citations, refused: cand?.finishReason === "SAFETY", model, usage: json.usageMetadata };
    },
  };
}

/** Perplexity (search is built in). */
export function perplexityProvider(): Provider {
  const { model } = CONFIG.perplexity;
  return {
    id: "perplexity",
    label: "Perplexity",
    model,
    webSearch: true,
    unavailableReason: () => (process.env.PERPLEXITY_API_KEY ? null : "set PERPLEXITY_API_KEY"),
    async ask(question: Question): Promise<ProviderAnswer> {
      const json = await postJson(
        "https://api.perplexity.ai/chat/completions",
        { model, messages: [{ role: "user", content: question.text }] },
        { authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}` },
      );
      const text = json.choices?.[0]?.message?.content ?? "";
      if (!text) throw new Error(`No text in Perplexity response: ${JSON.stringify(json).slice(0, 400)}`);
      return { text, citations: json.citations ?? json.search_results?.map((s: { url: string }) => s.url) ?? [], refused: false, model: json.model ?? model, usage: json.usage };
    },
  };
}
