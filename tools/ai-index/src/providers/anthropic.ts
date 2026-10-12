import Anthropic from "@anthropic-ai/sdk";
import { CONFIG } from "../config";
import type { Provider, ProviderAnswer, Question, Study } from "../types";

/**
 * Claude, asked the customer's question exactly as written, with web search
 * located in the study's city (what a visitor using Claude there would get).
 * Server-side refusal fallback is enabled; the answering model is recorded.
 */
export function anthropicProvider(): Provider {
  const { model, effort, webSearch } = CONFIG.anthropic;
  return {
    id: "claude",
    label: "Claude",
    model,
    webSearch,
    unavailableReason: () =>
      process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN ? null : "set ANTHROPIC_API_KEY",
    async ask(question: Question, study: Study): Promise<ProviderAnswer> {
      const client = new Anthropic({ timeout: CONFIG.requestTimeoutMs });
      const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: question.text }];
      const tools: Anthropic.Beta.BetaToolUnion[] = webSearch
        ? [
            {
              type: "web_search_20260209",
              name: "web_search",
              max_uses: 5,
              user_location: {
                type: "approximate",
                city: study.location.city,
                region: study.location.region,
                country: study.location.country,
                timezone: study.location.timezone,
              },
            },
          ]
        : [];

      // A server-tool turn can pause; resume by sending the paused turn back.
      for (let attempt = 0; attempt < 4; attempt++) {
        const message = await client.beta.messages
          .stream({
            model,
            max_tokens: 16000,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            output_config: { effort },
            tools,
            messages,
          })
          .finalMessage();

        if (message.stop_reason === "pause_turn") {
          messages.push({ role: "assistant", content: message.content });
          continue;
        }

        const textBlocks = message.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text");
        const citations = new Set<string>();
        for (const block of textBlocks) {
          for (const c of block.citations ?? []) {
            if (c.type === "web_search_result_location") citations.add(c.url);
          }
        }
        return {
          text: textBlocks.map((b) => b.text).join(""),
          citations: [...citations],
          refused: message.stop_reason === "refusal",
          model: message.model,
          usage: { ...message.usage },
        };
      }
      throw new Error("Response still paused after 4 resumes");
    },
  };
}
