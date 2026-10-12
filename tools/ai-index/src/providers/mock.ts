import type { Provider, ProviderAnswer, Question } from "../types";

// Offline provider for testing the pipeline without API keys or cost.
// Answers are written like real assistant replies but name FICTIONAL
// businesses only. Never use mock output in a published index.

const POOLS: Record<string, string[]> = {
  hotels: ["Casa Brisa Condado", "Hotel Almendro", "The Marlin Suites", "Posada del Morro", "Isla Verde Grand", "Hotel Coral Azul"],
  restaurants: ["Fogón de Mar", "Cocina Almendro", "La Terraza Azul", "Pilón Kitchen", "Sal y Humo", "El Patio de Lola"],
  bars: ["Barra Marea", "The Rum Room", "Azotea 1521", "Salsa Viva Club", "La Esquina Bar"],
  experiences: ["Isla Luminosa Tours", "Yunque Trail Co.", "Sabor Food Walks", "Bahía Kayak Adventures", "Spa Alma"],
};
const REASONS = ["great reviews", "ocean views", "walkable location", "authentic local food", "romantic atmosphere", "family-friendly", "good value", "excellent service"];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function mockProvider(id = "mock", label = "Mock AI"): Provider {
  return {
    id,
    label,
    model: "mock-1",
    webSearch: false,
    unavailableReason: () => null,
    async ask(question: Question): Promise<ProviderAnswer> {
      const pool = POOLS[question.category] ?? POOLS.hotels;
      // Vary by question, provider and a random component so repeats differ a little.
      const seed = hash(question.id + id) + Math.floor(Math.random() * 3);
      const picks = [...pool].sort((a, b) => hash(a + seed) - hash(b + seed)).slice(0, 4);
      const es = question.language === "es";
      const lines = [
        es ? "Estas son algunas de las opciones más recomendadas:" : "Here are some of the most recommended options:",
        "",
        ...picks.slice(0, 3).map((name, i) => `${i + 1}. **${name}** — ${es ? "Conocido por" : "Known for"} ${REASONS[(seed + i) % REASONS.length]} and ${REASONS[(seed + i + 3) % REASONS.length]}.`),
        "",
        es ? `También podrías considerar ${picks[3]}.` : `You could also consider ${picks[3]}.`,
      ];
      await new Promise((r) => setTimeout(r, 20));
      return { text: lines.join("\n"), citations: [], refused: false, model: "mock-1" };
    },
  };
}
