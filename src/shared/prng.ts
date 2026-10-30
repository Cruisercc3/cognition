// Seeded PRNG for everything outside the DSP (conductor, arranger, tests).
// xoshiro128** seeded through splitmix32. The full state is a plain 4-number tuple so
// it can live inside pure, serialisable conductor state.

export type PrngState = [number, number, number, number];

function splitmix32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  };
}

export function seedPrng(seed: number): PrngState {
  const sm = splitmix32(seed);
  const st: PrngState = [sm(), sm(), sm(), sm()];
  if (st.every((v) => v === 0)) st[0] = 1;
  return st;
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

/** Advance the state in place and return a uint32. */
export function nextU32(st: PrngState): number {
  const result = Math.imul(rotl(Math.imul(st[1], 5) >>> 0, 7), 9) >>> 0;
  const t = (st[1] << 9) >>> 0;
  st[2] = (st[2] ^ st[0]) >>> 0;
  st[3] = (st[3] ^ st[1]) >>> 0;
  st[1] = (st[1] ^ st[2]) >>> 0;
  st[0] = (st[0] ^ st[3]) >>> 0;
  st[2] = (st[2] ^ t) >>> 0;
  st[3] = rotl(st[3], 11);
  return result;
}

/** Uniform in [0, 1). */
export function nextFloat(st: PrngState): number {
  return nextU32(st) / 4294967296;
}

/** Uniform in [lo, hi). */
export function nextRange(st: PrngState, lo: number, hi: number): number {
  return lo + (hi - lo) * nextFloat(st);
}

/** Integer in [0, n). */
export function nextInt(st: PrngState, n: number): number {
  return Math.floor(nextFloat(st) * n);
}

/** True with probability p. */
export function chance(st: PrngState, p: number): boolean {
  return nextFloat(st) < p;
}

/** Seeds travel to the DSP as float32 AudioParams, so they must stay below 2^24 to be exact. */
export const MAX_SEED = 16777215;

/** A fresh session seed from a non-deterministic source (only ever called by hosts). */
export function freshSeed(): number {
  return Math.floor(Math.random() * MAX_SEED) + 1;
}
