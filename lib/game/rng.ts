// Seeded PRNG (mulberry32). The state lives inside GameState.rng so every
// transition is deterministic and runs are reproducible from their seed.

export interface RngHolder {
  rng: number;
}

export function rand(h: RngHolder): number {
  let t = (h.rng = (h.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function range(h: RngHolder, min: number, max: number): number {
  return min + rand(h) * (max - min);
}

export function int(h: RngHolder, min: number, max: number): number {
  return Math.floor(range(h, min, max + 1));
}

/** Log-uniform: good for market caps and multiples where orders of magnitude matter. */
export function logRange(h: RngHolder, min: number, max: number): number {
  return Math.exp(range(h, Math.log(min), Math.log(max)));
}

export function chance(h: RngHolder, p: number): boolean {
  return rand(h) < p;
}

export function pick<T>(h: RngHolder, arr: readonly T[]): T {
  return arr[Math.floor(rand(h) * arr.length)];
}

export function weighted<T>(h: RngHolder, items: readonly T[], weightOf: (item: T) => number): T {
  let total = 0;
  for (const it of items) total += Math.max(0, weightOf(it));
  if (total <= 0) return items[Math.floor(rand(h) * items.length)];
  let r = rand(h) * total;
  for (const it of items) {
    r -= Math.max(0, weightOf(it));
    if (r < 0) return it;
  }
  return items[items.length - 1];
}

export function weightedKey<K extends string>(h: RngHolder, table: Record<K, number>): K {
  const keys = Object.keys(table) as K[];
  return weighted(h, keys, (k) => table[k]);
}

export function newSeed(): number {
  return 100000 + Math.floor(Math.random() * 900000);
}
