// Signature-harness metrics on rendered audio (48 kHz stereo Float32 channels).
// BS.1770 / EBU R128 loudness, true peak, loudness steps, deviant onsets, output floor,
// L/R correlation, spectral tilt. Pure functions; no external toolchain.

const SR = 48000;

// --- K-weighting (BS.1770-4 coefficients at 48 kHz) --------------------------------

function biquad(x: Float32Array | Float64Array, b: number[], a: number[]): Float64Array {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    const yi = b[0] * xi + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1; x1 = xi; y2 = y1; y1 = yi;
    y[i] = yi;
  }
  return y;
}

export function kWeight(x: Float32Array): Float64Array {
  const s1 = biquad(x, [1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585]);
  return biquad(s1, [1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621]);
}

/** Running sum of squares of the K-weighted channels (summed over channels), for fast windows. */
function kPowerPrefix(chans: Float32Array[]): Float64Array {
  const n = chans[0].length;
  const pre = new Float64Array(n + 1);
  const kw = chans.map(kWeight);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (const c of kw) s += c[i] * c[i];
    pre[i + 1] = pre[i] + s;
  }
  return pre;
}

const lufsOf = (meanSquareSum: number) => -0.691 + 10 * Math.log10(Math.max(meanSquareSum, 1e-20));

/** Loudness series over windows of `winSec`, every `hopSec`. */
export function loudnessSeries(chans: Float32Array[], winSec: number, hopSec: number): number[] {
  const pre = kPowerPrefix(chans);
  const win = Math.round(winSec * SR);
  const hop = Math.round(hopSec * SR);
  const out: number[] = [];
  for (let s = 0; s + win <= chans[0].length; s += hop) out.push(lufsOf((pre[s + win] - pre[s]) / win));
  return out;
}

/** EBU R128 integrated loudness (gated). */
export function integratedLoudness(chans: Float32Array[]): number {
  const blocks = loudnessSeries(chans, 0.4, 0.1);
  const abs = blocks.filter((l) => l > -70);
  if (!abs.length) return -Infinity;
  const meanEnergy = (ls: number[]) => ls.reduce((s, l) => s + Math.pow(10, (l + 0.691) / 10), 0) / ls.length;
  const relGate = lufsOf(meanEnergy(abs)) - 10;
  const gated = abs.filter((l) => l > relGate);
  return lufsOf(meanEnergy(gated));
}

/** EBU Tech 3342 loudness range. */
export function loudnessRange(chans: Float32Array[]): number {
  const st = loudnessSeries(chans, 3, 0.1).filter((l) => l > -70);
  if (st.length < 2) return 0;
  const meanEnergy = st.reduce((s, l) => s + Math.pow(10, (l + 0.691) / 10), 0) / st.length;
  const rel = lufsOf(meanEnergy) - 20;
  const g = st.filter((l) => l > rel).sort((a, b) => a - b);
  const pct = (p: number) => g[Math.min(g.length - 1, Math.max(0, Math.round((p / 100) * (g.length - 1))))];
  return pct(95) - pct(10);
}

/** Largest change in short-term (3 s) loudness between windows 3 s apart. */
export function maxShortTermStep(chans: Float32Array[], skipSec = 0): { maxStep: number; atSec: number } {
  const hop = 0.1;
  const st = loudnessSeries(chans, 3, hop);
  const lag = Math.round(3 / hop);
  let maxStep = 0, atSec = 0;
  for (let i = Math.round(skipSec / hop); i + lag < st.length; i++) {
    if (st[i] < -70 && st[i + lag] < -70) continue;
    const d = Math.abs(st[i + lag] - st[i]);
    if (d > maxStep) { maxStep = d; atSec = (i + lag) * hop + 3; }
  }
  return { maxStep, atSec };
}

// --- Peaks ---------------------------------------------------------------------------

export function samplePeak(chans: Float32Array[]): number {
  let m = 0;
  for (const c of chans) for (const v of c) m = Math.max(m, Math.abs(v));
  return m;
}

/** True peak by 4x oversampling with a windowed-sinc interpolator (BS.1770 Annex 2 style). */
export function truePeak(chans: Float32Array[]): number {
  const L = 4, taps = 48;
  const h: number[][] = [];
  for (let p = 0; p < L; p++) {
    const ph: number[] = [];
    for (let k = -taps / 2; k < taps / 2; k++) {
      const t = k - p / L;
      const sinc = t === 0 ? 1 : Math.sin(Math.PI * t) / (Math.PI * t);
      const w = 0.5 + 0.5 * Math.cos((Math.PI * t) / (taps / 2));
      ph.push(sinc * w);
    }
    h.push(ph);
  }
  let m = 0;
  for (const c of chans) {
    for (let i = taps / 2; i < c.length - taps / 2; i++) {
      // only interpolate around local sample maxima (fast, sufficient for peaks)
      const a = Math.abs(c[i]);
      if (a < m * 0.7 || a < Math.abs(c[i - 1]) || a < Math.abs(c[i + 1])) continue;
      for (let p = 0; p < L; p++) {
        let s = 0;
        for (let k = 0; k < taps; k++) s += c[i + k - taps / 2] * h[p][k];
        m = Math.max(m, Math.abs(s));
      }
    }
  }
  return Math.max(m, samplePeak(chans));
}

export const toDb = (x: number) => 20 * Math.log10(Math.max(x, 1e-12));

// --- Floor -----------------------------------------------------------------------------

/** Minimum per-channel RMS (dBFS, mean-square) over 1 s windows — Chromium's audibility test is RMS. */
export function minWindowRmsDb(chans: Float32Array[], winSec = 1): number {
  const win = Math.round(winSec * SR);
  let minDb = Infinity;
  for (const c of chans) {
    for (let s = 0; s + win <= c.length; s += win) {
      let ss = 0;
      for (let i = s; i < s + win; i++) ss += c[i] * c[i];
      minDb = Math.min(minDb, 10 * Math.log10(Math.max(ss / win, 1e-20)));
    }
  }
  return minDb;
}

// --- Onsets and deviants -------------------------------------------------------------------

export interface Onset {
  sec: number;
  peakDb: number;
}

/** Onsets from a 5 ms peak envelope: a frame that rises >= riseDb over the previous 50 ms. */
export function onsets(chansIn: Float32Array[], riseDb = 6): Onset[] {
  // high-pass at 35 Hz so the sub-audible keep-alive tone never reads as onsets
  const w0 = (2 * Math.PI * 35) / SR, al = Math.sin(w0) / Math.SQRT2, a0 = 1 + al, cw = Math.cos(w0);
  const chans = chansIn.map((c) => Float32Array.from(biquad(c, [(1 + cw) / 2 / a0, -(1 + cw) / a0, (1 + cw) / 2 / a0], [1, (-2 * cw) / a0, (1 - al) / a0])));
  const frame = Math.round(0.005 * SR);
  const n = Math.floor(chans[0].length / frame);
  const env = new Float64Array(n);
  for (let f = 0; f < n; f++) {
    let m = 0;
    for (const c of chans) for (let i = f * frame; i < (f + 1) * frame; i++) m = Math.max(m, Math.abs(c[i]));
    env[f] = toDb(m);
  }
  // ignore frames far below the program's loud parts (noise, floor tone, tails)
  const sorted = Array.from(env).sort((a, b) => a - b);
  const loud = sorted[Math.floor(sorted.length * 0.99)];
  const gateDb = loud - 30;
  const look = 10; // 50 ms
  const out: Onset[] = [];
  let last = -1000;
  for (let f = look; f < n - 2; f++) {
    let prevMax = -Infinity;
    for (let k = f - look; k < f; k++) prevMax = Math.max(prevMax, env[k]);
    let localMin = Infinity;
    for (let k = f - look; k < f; k++) localMin = Math.min(localMin, env[k]);
    if (env[f] > gateDb && env[f] - localMin >= riseDb && env[f] >= prevMax && f - last > 8) {
      // peak of the event within the next 30 ms
      let pk = env[f];
      for (let k = f; k < Math.min(n, f + 6); k++) pk = Math.max(pk, env[k]);
      out.push({ sec: (f * frame) / SR, peakDb: pk });
      last = f;
    }
  }
  return out;
}

/** Onsets more than `thresholdDb` above the median onset peak within +/- windowSec. */
export function deviantOnsets(ons: Onset[], thresholdDb = 10, windowSec = 8): Onset[] {
  const dev: Onset[] = [];
  for (const o of ons) {
    const local = ons.filter((x) => Math.abs(x.sec - o.sec) <= windowSec).map((x) => x.peakDb).sort((a, b) => a - b);
    const med = local[Math.floor(local.length / 2)];
    if (o.peakDb - med > thresholdDb) dev.push(o);
  }
  return dev;
}

// --- Stereo and spectrum ------------------------------------------------------------------

export function correlation(x: Float32Array, y: Float32Array): number {
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  const n = x.length;
  for (let i = 0; i < n; i++) { sx += x[i]; sy += y[i]; sxx += x[i] * x[i]; syy += y[i] * y[i]; sxy += x[i] * y[i]; }
  const den = Math.sqrt((sxx - (sx * sx) / n) * (syy - (sy * sy) / n));
  return den > 0 ? (sxy - (sx * sy) / n) / den : 0;
}

/** Octave-band levels (dB, mean-square of the mid signal) from 63 Hz to 8 kHz via band-pass biquads. */
export function octaveBands(chans: Float32Array[]): { hz: number; db: number }[] {
  const mid = new Float32Array(chans[0].length);
  for (let i = 0; i < mid.length; i++) mid[i] = (chans[0][i] + (chans[1]?.[i] ?? chans[0][i])) * 0.5;
  const centres = [63, 125, 250, 500, 1000, 2000, 4000, 8000];
  return centres.map((fc) => {
    const w0 = (2 * Math.PI * fc) / SR;
    const q = Math.SQRT2; // ~1 octave
    const alpha = Math.sin(w0) / (2 * q);
    const a0 = 1 + alpha;
    const y = biquad(mid, [alpha / a0, 0, -alpha / a0], [1, (-2 * Math.cos(w0)) / a0, (1 - alpha) / a0]);
    let ss = 0;
    for (const v of y) ss += v * v;
    return { hz: fc, db: 10 * Math.log10(Math.max(ss / y.length, 1e-20)) };
  });
}

/**
 * Stereo width above the bass: L/R correlation of 2nd-order high-passed channels (default
 * 400 Hz). Broadband correlation is dominated by the mono kick and bass, so it reads ~1
 * for any techno mix; this is the width the ear hears in the mids and highs.
 */
export function highCorrelation(chans: Float32Array[], hz = 400): number {
  const w0 = (2 * Math.PI * hz) / SR;
  const alpha = Math.sin(w0) / (2 * Math.SQRT1_2);
  const a0 = 1 + alpha;
  const cw = Math.cos(w0);
  const b = [(1 + cw) / 2 / a0, -(1 + cw) / a0, (1 + cw) / 2 / a0];
  const a = [1, (-2 * cw) / a0, (1 - alpha) / a0];
  const hl = biquad(chans[0], b, a);
  const hr = biquad(chans[1] ?? chans[0], b, a);
  return correlation(Float32Array.from(hl), Float32Array.from(hr));
}

/**
 * How far the sharpest hits stand out of a band: the 99.5th percentile of a 5 ms RMS
 * envelope over its 75th, in dB (mid of the channels, 4th-order band-pass). In the
 * 300 Hz–3 kHz band this is what a bare knock, clap or tom does to a mix; a kit that sits
 * inside a tonal bed reads low.
 */
export function bandSpike(chans: Float32Array[], lo = 300, hi = 3000): number {
  const y = band4(midOf(chans), lo, hi);
  const frame = Math.round(0.005 * SR);
  const env: number[] = [];
  for (let s = 0; s + frame <= y.length; s += frame) {
    let m = 0;
    for (let i = s; i < s + frame; i++) m += y[i] * y[i];
    env.push(10 * Math.log10(m / frame + 1e-20));
  }
  env.sort((a, b) => a - b);
  const q = (p: number) => env[Math.floor(p * (env.length - 1))];
  return q(0.995) - q(0.75);
}

/** The mid of the channels (L+R)/2. */
function midOf(chans: Float32Array[]): Float32Array {
  const mid = new Float32Array(chans[0].length);
  for (let i = 0; i < mid.length; i++) mid[i] = (chans[0][i] + (chans[1]?.[i] ?? chans[0][i])) * 0.5;
  return mid;
}

/** 2nd-order Butterworth high- or low-pass (RBJ) at sample rate `fs`. */
function pass2(x: Float32Array | Float64Array, type: 'hp' | 'lp', f: number, fs = SR): Float64Array {
  const w0 = (2 * Math.PI * f) / fs, al = Math.sin(w0) / Math.SQRT2, cw = Math.cos(w0), a0 = 1 + al;
  const b = type === 'lp' ? [(1 - cw) / 2, 1 - cw, (1 - cw) / 2] : [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2];
  return biquad(x, b.map((v) => v / a0), [1, (-2 * cw) / a0, (1 - al) / a0]);
}

/** 4th-order band-pass: two high-pass sections, then two low-pass. */
function band4(x: Float32Array | Float64Array, lo: number, hi: number, fs = SR): Float64Array {
  return pass2(pass2(pass2(pass2(x, 'hp', lo, fs), 'hp', lo, fs), 'lp', hi, fs), 'lp', hi, fs);
}

/**
 * How much a band's level fluctuates at a range of rates: the band's 5 ms RMS envelope (mid
 * of the channels), band-passed to [rateLo, rateHi] Hz, as an RMS fraction of its mean.
 * In the speech band at 3–8 Hz this is the fluctuation that moves like syllables (the range
 * where fluctuation strength, which predicts disruption of verbal memory, is highest);
 * beating and flutter show up at their own rates.
 */
export function modulationIndex(chans: Float32Array[], lo: number, hi: number, rateLo: number, rateHi: number): number {
  const y = band4(midOf(chans), lo, hi);
  const frame = Math.round(0.005 * SR);
  const fs = SR / frame;
  const env = new Float64Array(Math.floor(y.length / frame));
  for (let j = 0; j < env.length; j++) {
    let m = 0;
    for (let i = j * frame; i < (j + 1) * frame; i++) m += y[i] * y[i];
    env[j] = Math.sqrt(m / frame);
  }
  const mean = env.reduce((a, b) => a + b, 0) / env.length;
  const f = band4(env, rateLo, rateHi, fs);
  const settle = Math.round(fs * 2);
  let s = 0;
  for (let j = settle; j < f.length; j++) s += f[j] * f[j];
  return Math.sqrt(s / Math.max(1, f.length - settle)) / Math.max(mean, 1e-12);
}

/**
 * A band's steady floor: the quietest moments of the band (10th percentile of 100 ms frames)
 * relative to the whole signal's mean energy, in dB (mid of the channels). A masker has to be
 * there all the time; energy that only comes in bursts (ticks, notes) leaves the gaps between
 * them open, and a voice is heard through the gaps.
 */
export function bandFloor(chans: Float32Array[], lo: number, hi: number): number {
  const m = midOf(chans);
  const y = band4(m, lo, hi);
  let all = 0;
  for (let i = 0; i < m.length; i++) all += m[i] * m[i];
  all /= Math.max(1, m.length);
  const frame = Math.round(0.1 * SR);
  const e: number[] = [];
  for (let s = 0; s + frame <= y.length; s += frame) {
    let p = 0;
    for (let i = s; i < s + frame; i++) p += y[i] * y[i];
    e.push(10 * Math.log10(p / frame / Math.max(all, 1e-20) + 1e-20));
  }
  e.sort((a, b) => a - b);
  return e[Math.floor(0.1 * (e.length - 1))];
}

/** A band's share of the whole signal's energy, in dB (mid of the channels). */
export function bandShare(chans: Float32Array[], lo: number, hi: number): number {
  const m = midOf(chans);
  const y = band4(m, lo, hi);
  let all = 0, inBand = 0;
  for (let i = 0; i < m.length; i++) {
    all += m[i] * m[i];
    inBand += y[i] * y[i];
  }
  return 10 * Math.log10(inBand / Math.max(all, 1e-20));
}

/** Least-squares slope of octave-band levels in dB per octave (pink = -3, brown = -6 for noise). */
export function spectralTilt(chans: Float32Array[]): number {
  const bands = octaveBands(chans);
  const xs = bands.map((b) => Math.log2(b.hz));
  const ys = bands.map((b) => b.db);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0, den = 0;
  for (let i = 0; i < xs.length; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  return num / den;
}

export interface Report {
  seconds: number;
  integratedLufs: number;
  lra: number;
  samplePeakDb: number;
  truePeakDb: number;
  maxStStep: { maxStep: number; atSec: number };
  onsetsPerMin: number;
  deviants: Onset[];
  floorMinRmsDb: number;
  lrCorrelation: number;
  /** L/R correlation above 400 Hz (see highCorrelation). */
  highCorrelation: number;
  tiltDbPerOct: number;
  bands: { hz: number; db: number }[];
}

export function report(chans: Float32Array[], opts: { skipSec?: number } = {}): Report {
  const skip = Math.round((opts.skipSec ?? 0) * SR);
  const body = skip > 0 ? chans.map((c) => c.subarray(skip)) : chans;
  const ons = onsets(body);
  const seconds = body[0].length / SR;
  return {
    seconds,
    integratedLufs: integratedLoudness(body),
    lra: loudnessRange(body),
    samplePeakDb: toDb(samplePeak(body)),
    truePeakDb: toDb(truePeak(body)),
    maxStStep: maxShortTermStep(body),
    onsetsPerMin: (ons.length / seconds) * 60,
    deviants: deviantOnsets(ons),
    floorMinRmsDb: minWindowRmsDb(chans),
    lrCorrelation: correlation(body[0], body[1]),
    highCorrelation: highCorrelation(body),
    tiltDbPerOct: spectralTilt(body),
    bands: octaveBands(body)
  };
}
