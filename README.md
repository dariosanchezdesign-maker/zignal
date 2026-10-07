# Zignal — AI Visibility Intelligence

**See how AI recommends your business — and learn how to become the business it recommends.**

Customers increasingly ask AI assistants who to hire, where to stay and where to invest. Zignal shows a business
how often AI recommends it for the questions its customers actually ask, who gets recommended instead, and what to
change to become the recommendation. The initial market is Puerto Rico.

## Product flow

`Landing → Create account → Business setup → AI Visibility Scan → Results → Recommendations → Monitoring`

| Route | What it does |
| --- | --- |
| `/` | Landing page (hero, the shift, how it works, industries, CTA) |
| `/signup` | Account creation (stored locally in this MVP) |
| `/onboarding` | Industry cards → name, website, location, category, primary service, optional competitors |
| `/scan` | Progressive AI Visibility Scan, then the results reveal |
| `/app` | Overview: AI Visibility Score, story, trend (7/30/90d), metrics, featured answer, competitors, industry insights, opportunities |
| `/app/visibility` | How AI recommends you (per-question answers, intent categories, topic coverage) + **Ask AI about my business** |
| `/app/queries` | Query Explorer with topic, location, intent, visibility, position, competitor and opportunity filters, plus CSV export |
| `/app/competitors` | Who AI recommends instead: competitor cards, head-to-head, share of recommendations, topic matrix |
| `/app/opportunities` | Prioritized actions with impact, reason, action, expected lift and status tracking |
| `/app/reports` | Printable monthly report + weekly snapshots |
| `/app/settings` | Business profile, tracked competitors, monitoring |

Three **demo workspaces** (all fictional) are available from the business selector:

- **Costa Norte Developments**: real estate developer, San Juan (a contender)
- **Rivera Colón CPA Group**: accounting firm, San Juan (behind its competitors)
- **Casa Marea Hotel**: boutique hotel, Condado (the leader, protecting its position)

## Architecture

```
src/
  lib/
    types.ts              Domain model (BusinessProfile, QueryResult, ScanResult, …)
    industries/           Pluggable industry configs: categories, topics, query templates, copy
    locations.ts          Markets/areas (Puerto Rico first; add markets as data)
    engine/
      scan.ts             Query generation → AI answers → metrics → opportunities, story, trend
      ask.ts              "Ask AI about my business" perception engine
      profile.ts          Builds a profile for a newly onboarded business
      period.ts           Change over the selected date range
    demo/                 Demo workspaces (fictional businesses)
    store.tsx             Client store (account, workspaces, statuses) persisted to localStorage
  components/             UI primitives, charts, app shell, query answer view, Ask AI
  app/                    Next.js App Router pages
```

**Adding an industry:** create `src/lib/industries/<id>.ts` implementing `IndustryConfig` (categories, topics with
opportunity copy, query templates per category group, market names) and register it in `industries/index.ts`.
Onboarding, the scan, insights, the Query Explorer and every dashboard adapt automatically.

**Live AI data:** in this MVP, answers come from a deterministic simulation (`engine/scan.ts → simulateAnswer`) that
models how assistants weigh authority and topic-specific evidence. A live provider (querying assistants and parsing
the businesses they name) only needs to return the same `QueryResult` shape, so no screen changes when it's swapped
in. Persistence is localStorage behind the `store.tsx` API, which is the seam for a real backend and scheduled scans.

Out of scope for the MVP: billing, team permissions, enterprise admin, CRM integrations, automated publishing.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm run typecheck
```

Stack: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 3, Geist, lucide-react.
