# Zignal — AI Visibility Intelligence

**See how AI recommends your business — and learn how to become the business it recommends.**

Customers increasingly ask AI assistants who to hire, where to stay and where to invest. Zignal shows a business
how often AI recommends it for the questions its customers actually ask, who gets recommended instead, and what to
change to become the recommendation. The initial market is Puerto Rico.

## Product flow

`Landing → Create account → Business setup → AI Visibility Scan → Results → Recommendations → Monitoring`

The app shows the verdict first and the evidence only on request. A business owner sees three things:
**does AI recommend me, who does it recommend instead, and what should I do next.**

| Route | What it does |
| --- | --- |
| `/` | Landing page |
| `/signup` | Account creation (stored locally in this MVP) |
| `/onboarding` | Industry cards → business details → the generated question set |
| `/scan` | Simulated AI scan of every question, then the results reveal |
| `/app` | **Home**: "AI recommends you in X of 10 customer questions", who wins instead, the next step, three real answers |
| `/app/queries` | **Questions**: AI's answers as conversations; table view with full filters |
| `/app/competitors` | **Competitors**: who AI picks instead, and the reasons it gives |
| `/app/opportunities` | **Next steps**: checklist; evidence behind "Show evidence" |
| `/app/visibility` | **Full analysis**: score breakdown and history, what AI knows you for, Ask AI |
| `/app/reports`, `/app/settings` | In the account menu |

Three **demo workspaces** (all fictional, clearly labeled) are available from the business selector:

- **Casa Maré**: boutique luxury hotel, Condado
- **Isla Capital Development**: residential development and investment, San Juan
- **Cumbre Advisory**: accounting and advisory for growing businesses, San Juan

## V1 data model and intelligence loop

Every number on screen is derived from records. Nothing is assigned by hand.

```
Business → Query → AIRun (raw_response) → Recommendation (extracted) → Metrics → Insight
   ASK         OBSERVE                          MEASURE        EXPLAIN     ACT → MONITOR
```

| Entity | Where | Notes |
| --- | --- | --- |
| `Business`, `Competitor`, `Query`, `AIRun`, `Recommendation`, `Insight`, `Simulation` | `src/lib/model/types.ts` | snake_case fields mirror the planned database schema |
| `SignalProfile` | same | simulation-only state (the hidden model of each business); has no live equivalent |

```
src/lib/
  model/types.ts          Entities
  industries/             Industry configs: subcategories, attributes, query variables, templates
  engine/
    queries.ts            Query generation: templates × variables × geography (60 per business),
                          intent, funnel stage, persona, commercial value/weight, difficulty
    simulate.ts           Simulation engine: deterministic ranking + natural-language raw response
    extract.ts            Parses raw responses into Recommendation records (same path for live data)
    metrics.ts            Recommendation rate, mention rate, avg position, coverage, share of voice,
                          high-intent visibility, and the AI Visibility Score
    perception.ts         Attribute associations from AI-stated rationale
    insights.ts           Opportunity engine: Observation → Evidence → Diagnosis → Action
    diagnosis.ts          Per-query interpretation (labeled "AI-generated diagnosis")
    narrative.ts          Plain-language dashboard summary
    workspace.ts          Runs the pipeline for a workspace; history snapshots
    ask.ts                "Ask AI about my business", answered from the records
  demo/                   Three fictional demo workspaces
  store.tsx               Local repository (localStorage) + actions
```

**AI Visibility Score** = 35% recommendation rate + 25% position score + 20% query coverage + 10% share
of voice + 10% high-intent visibility, each normalized to 0–100. Click the score in the app ("Why 68?")
to see each component's raw value, normalized value and contribution.

**High-intent weighting:** discovery 20 · best-of 45 · comparison 45 · problem 55 · local 65 ·
high intent 85 · transactional 100 (+8 for high-value attributes such as luxury or investment).

**Simulation.** Results are deterministic per (business, query, simulation index). "Run new simulation"
adds a run with small variation. Opportunities marked *completed* strengthen the targeted attributes in
later simulations, so the loop (act → re-run → measure) is visible. Demo workspaces include 90 days of
*simulated monitoring history*; new businesses start with a single baseline run.

**Trust labels** are used consistently: *Demo workspace*, *Simulated AI test*, *AI-generated diagnosis*
and (reserved for real data) *Live AI observation*.

**Going live.** Replace `simulateRun` with a provider call that stores the real response as
`raw_response` with `mode: "live"`. Extraction, metrics, perception and insights are unchanged.

**Adding an industry:** add a config in `src/lib/industries/` and register it in `index.ts`.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm run typecheck
```

Stack: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 3, Geist, lucide-react.
