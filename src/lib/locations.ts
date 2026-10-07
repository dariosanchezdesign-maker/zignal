// Initial market: Puerto Rico. Markets are data, so new regions can be added
// without touching the engine.

export interface Market {
  id: string;
  region: string; // used in {region}
  country: string;
  areas: { name: string; nearby: string[] }[];
}

export const MARKETS: Market[] = [
  {
    id: "pr",
    region: "Puerto Rico",
    country: "Puerto Rico",
    areas: [
      { name: "San Juan", nearby: ["Condado", "Old San Juan", "Santurce", "Carolina"] },
      { name: "Condado", nearby: ["San Juan", "Ocean Park", "Old San Juan", "Santurce"] },
      { name: "Old San Juan", nearby: ["San Juan", "Condado", "Santurce"] },
      { name: "Santurce", nearby: ["San Juan", "Condado", "Hato Rey"] },
      { name: "Hato Rey", nearby: ["San Juan", "Guaynabo", "Santurce"] },
      { name: "Guaynabo", nearby: ["San Juan", "Hato Rey", "Bayamón"] },
      { name: "Dorado", nearby: ["San Juan", "Vega Baja", "Toa Baja"] },
      { name: "Carolina", nearby: ["Isla Verde", "San Juan", "Río Grande"] },
      { name: "Isla Verde", nearby: ["Carolina", "San Juan", "Ocean Park"] },
      { name: "Ponce", nearby: ["Juana Díaz", "Guayanilla", "Coamo"] },
      { name: "Mayagüez", nearby: ["Cabo Rojo", "Rincón", "Aguadilla"] },
      { name: "Rincón", nearby: ["Aguadilla", "Mayagüez", "Isabela"] },
      { name: "Caguas", nearby: ["San Juan", "Cayey", "Gurabo"] },
      { name: "Humacao", nearby: ["Palmas del Mar", "Fajardo", "Caguas"] },
      { name: "Fajardo", nearby: ["Luquillo", "Río Grande", "Ceiba"] },
      { name: "Vieques", nearby: ["Culebra", "Fajardo"] },
    ],
  },
];

export const DEFAULT_MARKET = MARKETS[0];
export const PR_AREAS = DEFAULT_MARKET.areas.map((a) => a.name);

export function nearbyAreas(location: string): string[] {
  const area = DEFAULT_MARKET.areas.find((a) => a.name.toLowerCase() === location.toLowerCase());
  return area ? area.nearby : ["San Juan"];
}
