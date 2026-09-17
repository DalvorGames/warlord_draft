// Seeded, portable RNG (mulberry32). Same seed replays identically in any JS runtime.

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Integer in [0, n). */
  int(n: number): number;
  /** Gaussian multiplier centred on 1 with the given standard deviation. */
  gaussian(sd: number): number;
  /** Uniformly pick one element. */
  pick<T>(arr: readonly T[]): T;
  /** Weighted pick; returns the index. Weights must be non-negative and not all zero. */
  weightedIndex(weights: readonly number[]): number;
  /** A fresh 32-bit seed drawn from this stream (for forking sub-streams). */
  fork(): number;
  /** Current internal state; pass to `fromState` to resume. */
  state(): number;
}

export function mulberry32(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    int: (n) => Math.floor(next() * n),
    gaussian(sd) {
      const u = 1 - next();
      const v = next();
      return 1 + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    weightedIndex(weights) {
      let total = 0;
      for (const w of weights) total += w;
      let r = next() * total;
      for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r < 0) return i;
      }
      return weights.length - 1;
    },
    fork: () => Math.floor(next() * 4294967296) >>> 0,
    state: () => s,
  };
  return rng;
}

/** Resume a mulberry32 stream from a saved `state()` value. */
export function fromState(state: number): Rng {
  // mulberry32 advances state before use, so seeding with the saved state resumes exactly.
  return mulberry32(state);
}

/** Hash a string to a 32-bit seed (FNV-1a), so "2026-09-16" can be a daily seed. */
export function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
