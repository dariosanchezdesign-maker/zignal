import type { BusinessProfile } from "../types";

// Demo workspaces. Every business here — including competitors — is fictional.
// Performance numbers are simulated to illustrate the product.

const DEMO_DATE = "2026-07-01T12:00:00.000Z";

export const DEMO_REAL_ESTATE: BusinessProfile = {
  id: "demo-costa-norte",
  name: "Costa Norte Developments",
  website: "costanorte.example",
  industry: "real-estate",
  category: "developer",
  primaryService: "Luxury residential condos",
  location: "San Juan",
  isDemo: true,
  createdAt: DEMO_DATE,
  depth: 8,
  authority: 0.68,
  topicStrength: {
    invest: 0.38,
    neighborhoods: 0.62,
    developers: 0.74,
    agents: 0.5,
    "property-types": 0.66,
    rentals: 0.48,
    luxury: 0.5,
    commercial: 0.24,
    financing: 0.58,
    market: 0.46,
  },
  competitors: [
    {
      id: "c-atlantico",
      name: "Atlántico Realty Group",
      authority: 0.64,
      topicStrength: { invest: 0.78, neighborhoods: 0.6, developers: 0.52, agents: 0.62, "property-types": 0.56, rentals: 0.66, luxury: 0.7, commercial: 0.72, financing: 0.46, market: 0.64 },
    },
    {
      id: "c-palmar",
      name: "Palmar Living",
      authority: 0.6,
      topicStrength: { invest: 0.5, neighborhoods: 0.56, developers: 0.66, agents: 0.4, "property-types": 0.6, rentals: 0.46, luxury: 0.72, commercial: 0.3, financing: 0.44, market: 0.42 },
    },
    {
      id: "c-isla-capital",
      name: "Isla Capital Partners",
      authority: 0.56,
      topicStrength: { invest: 0.72, neighborhoods: 0.4, developers: 0.42, agents: 0.36, "property-types": 0.4, rentals: 0.6, luxury: 0.44, commercial: 0.7, financing: 0.62, market: 0.64 },
    },
    {
      id: "c-bahia",
      name: "Bahía Development Co.",
      authority: 0.5,
      topicStrength: { invest: 0.42, neighborhoods: 0.5, developers: 0.58, agents: 0.34, "property-types": 0.52, rentals: 0.4, luxury: 0.46, commercial: 0.46, financing: 0.36, market: 0.34 },
    },
  ],
};

export const DEMO_PROFESSIONAL: BusinessProfile = {
  id: "demo-rivera-colon",
  name: "Rivera Colón CPA Group",
  website: "riveracolon.example",
  industry: "professional-services",
  category: "accounting",
  primaryService: "Tax preparation & planning",
  location: "San Juan",
  isDemo: true,
  createdAt: DEMO_DATE,
  depth: 8,
  authority: 0.54,
  topicStrength: {
    "best-provider": 0.48,
    local: 0.64,
    specialized: 0.6,
    pricing: 0.3,
    industry: 0.28,
    trust: 0.5,
    "client-type": 0.4,
  },
  competitors: [
    {
      id: "c-montalvo",
      name: "Montalvo Advisory Group",
      authority: 0.66,
      topicStrength: { "best-provider": 0.74, local: 0.52, specialized: 0.62, pricing: 0.4, industry: 0.72, trust: 0.74, "client-type": 0.66 },
    },
    {
      id: "c-cruz-pagan",
      name: "Cruz Pagán & Associates",
      authority: 0.62,
      topicStrength: { "best-provider": 0.62, local: 0.66, specialized: 0.58, pricing: 0.6, industry: 0.5, trust: 0.62, "client-type": 0.56 },
    },
    {
      id: "c-bayview",
      name: "Bayview Tax Partners",
      authority: 0.54,
      topicStrength: { "best-provider": 0.5, local: 0.44, specialized: 0.64, pricing: 0.52, industry: 0.62, trust: 0.48, "client-type": 0.66 },
    },
    {
      id: "c-ocean-park",
      name: "Ocean Park Accounting",
      authority: 0.44,
      topicStrength: { "best-provider": 0.4, local: 0.58, specialized: 0.36, pricing: 0.62, industry: 0.32, trust: 0.42, "client-type": 0.5 },
    },
  ],
};

export const DEMO_HOSPITALITY: BusinessProfile = {
  id: "demo-casa-marea",
  name: "Casa Marea Hotel",
  website: "casamarea.example",
  industry: "hospitality",
  category: "hotel",
  primaryService: "Boutique hotel",
  location: "Condado",
  isDemo: true,
  createdAt: DEMO_DATE,
  depth: 8,
  authority: 0.76,
  topicStrength: {
    "best-of": 0.8,
    romance: 0.46,
    family: 0.36,
    luxury: 0.82,
    budget: 0.46,
    location: 0.8,
    experiences: 0.66,
    occasions: 0.54,
    tourist: 0.7,
  },
  competitors: [
    {
      id: "c-solano",
      name: "The Solano Condado",
      authority: 0.62,
      topicStrength: { "best-of": 0.72, romance: 0.78, family: 0.5, luxury: 0.76, budget: 0.36, location: 0.7, experiences: 0.6, occasions: 0.66, tourist: 0.6 },
    },
    {
      id: "c-arenisca",
      name: "Hotel Arenisca",
      authority: 0.6,
      topicStrength: { "best-of": 0.6, romance: 0.5, family: 0.72, luxury: 0.46, budget: 0.7, location: 0.62, experiences: 0.5, occasions: 0.5, tourist: 0.66 },
    },
    {
      id: "c-coralina",
      name: "Villa Coralina Resort",
      authority: 0.58,
      topicStrength: { "best-of": 0.52, romance: 0.66, family: 0.62, luxury: 0.62, budget: 0.3, location: 0.4, experiences: 0.7, occasions: 0.62, tourist: 0.5 },
    },
    {
      id: "c-ventana",
      name: "La Ventana Suites",
      authority: 0.46,
      topicStrength: { "best-of": 0.44, romance: 0.48, family: 0.46, luxury: 0.4, budget: 0.62, location: 0.58, experiences: 0.36, occasions: 0.4, tourist: 0.48 },
    },
  ],
};

export const DEMO_WORKSPACES: BusinessProfile[] = [DEMO_REAL_ESTATE, DEMO_PROFESSIONAL, DEMO_HOSPITALITY];
