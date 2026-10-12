# AI Index (internal tool)

Asks AI assistants the questions real customers ask, many times over, and measures which businesses they recommend. Built for studies like the **San Juan Hospitality AI Index**, and for one-page snapshots to share with individual businesses.

This is an internal research tool. It is not part of the customer-facing app.

```
questions  →  AI answers (stored word for word)  →  extracted businesses + reasons  →  index + snapshots
```

## Setup

You need Node.js 20+ and an API key for each AI you want to test. Any subset works.

| AI | Environment variable | Where to get a key |
|---|---|---|
| Claude | `ANTHROPIC_API_KEY` | console.anthropic.com |
| ChatGPT | `OPENAI_API_KEY` | platform.openai.com |
| Gemini | `GEMINI_API_KEY` | aistudio.google.com |
| Perplexity | `PERPLEXITY_API_KEY` | perplexity.ai (API settings) |

The Claude key is also used to read each answer and extract the businesses it names (the most accurate option). Without it, the tool falls back to a simpler parser that only handles numbered lists.

```bash
npm install
export ANTHROPIC_API_KEY=...      # and any others you have
```

## Running a study

Start with a small, cheap trial:

```bash
npm run ai-index -- all --limit 5 --repeats 1
```

Then the full study (50 questions, each asked 3 times per AI):

```bash
npm run ai-index -- all
```

Make a one-page snapshot for a business:

```bash
npm run ai-index -- snapshot "Business Name"
```

| Command | What it does |
|---|---|
| `run` | Asks every question to every available AI. Safe to stop and re-run: finished answers are kept and only missing or failed ones are retried. |
| `extract` | Reads each stored answer and records the businesses named, their order and the reasons given. |
| `report` | Builds `report.md`, `index.json` and `businesses.csv`. |
| `snapshot "Name"` | Writes a one-page Markdown snapshot for that business. |
| `all` | `run`, then `extract`, then `report`. |

Useful options: `--providers claude,chatgpt`, `--repeats 5`, `--limit 10`, `--dry-run` (shows how many requests would be made), `--study path/to/questions.json`.

Results are stored in `tools/ai-index/data/<study>/` (not committed to git):
- `runs.jsonl`: every AI answer, unedited, with model, date and cited sources
- `extractions.jsonl`: the structured data pulled from each answer
- `report/`: the index outputs
- `snapshots/`: one file per business

### Testing without keys

```bash
npm run ai-index -- all --mock
```

This uses an offline mock with **fictional** businesses to check the pipeline end to end. Its output is labeled as mock data and must never be shared.

## Cost

Every real run costs money. Run `--dry-run` first to see the number of requests.

A full study is 50 questions × 3 repeats = 150 answers per AI, plus one extraction call per answer. As a rough guide, Claude with web search costs on the order of $0.10–0.20 per answer, so about $15–30 for the Claude part of a full study plus a few dollars for extraction. Check each provider's current pricing before a large run. The `--limit 5 --repeats 1` trial costs well under a dollar per AI.

## How it asks

- Each question is sent exactly as written, with no system prompt or extra instructions, like a customer typing it in.
- Web search is on where the AI supports it and is located in the study's city (San Juan). Customers' assistants usually search the web for local questions, so answers without search would not reflect what they see.
- Claude runs on `claude-opus-5-5` with server-side refusal fallback enabled. The model that actually answered is recorded on every run.
- Default models for the other AIs are set in `src/config.ts`. **Check each provider's current model names before a real study** and override with `AI_INDEX_OPENAI_MODEL`, `AI_INDEX_GEMINI_MODEL` or `AI_INDEX_PERPLEXITY_MODEL` if needed. The ChatGPT, Gemini and Perplexity connections follow each provider's documented API format; if one returns an error, the message includes the provider's response so the format can be adjusted.

## Reading the results

- **Recommended in:** share of all analyzed answers that recommended the business.
- **Top pick in:** share of answers where it was the first recommendation.
- **Consistency:** on the questions where it appears, how often it appears across repeats. Low consistency means AI mentions it sometimes, not reliably.
- **By AI model / By language:** the same rate split by assistant and by English vs. Spanish questions.

Spelling variants are merged automatically ("The Condado Vanderbilt Hotel" and "Condado Vanderbilt" count as one). If two names still show up separately, add them to `aliases/<study>.json`:

```json
{ "Canonical Name": ["Variant one", "Variant two"] }
```

## Publishing responsibly

The index names real businesses, so:

- Always include the methodology section the report generates (questions, AI models, dates, number of answers).
- Describe results as what AI recommended in these tests ("recommended in 7 of 10 answers"), never as a judgment of quality.
- Keep the raw answers (`runs.jsonl`) so any figure can be traced back to what an AI actually said.
- Re-run before publishing an update; AI answers change over time.
