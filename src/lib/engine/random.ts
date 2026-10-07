// Deterministic randomness so a business always produces the same scan.

export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rng(...parts: (string | number)[]) {
  return mulberry32(hashString(parts.join("|")));
}

export function pick<T>(items: T[], r: () => number): T {
  return items[Math.floor(r() * items.length) % items.length];
}

export function pickN<T>(items: T[], n: number, r: () => number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (pool.length && out.length < n) {
    out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  }
  return out;
}

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
