// Phase 0 contract tests on the spike program, rendered offline.

import { describe, it, expect, beforeAll } from 'vitest';
import { compileDsp, compileDspSource, createOffline, faustArgs, type CompiledDsp } from '../dsp/faust-node.ts';
import { renderOffline, hashOutputs } from './render.ts';
import { makeSpikeConductor } from '../../src/shared/conductor/spike-conductor.ts';

const SR = faustArgs.sampleRate;
const BAR_120 = SR * 2; // 4/4 at 120 bpm = 2 s

let spike: CompiledDsp;

beforeAll(async () => {
  spike = await compileDsp('spike');
});

async function render(opts: Partial<Parameters<typeof renderOffline>[0]> & { seconds: number; seed: number }) {
  const proc = await createOffline(spike);
  return renderOffline({ proc, root: 'spike', ...opts });
}

function firstChange(ch: Float32Array, from = 0): number {
  for (let i = from + 1; i < ch.length; i++) if (ch[i] !== ch[i - 1]) return i;
  return -1;
}

describe('spike: compile settings', () => {
  it('compiles in double precision with denormal flushing', () => {
    const meta = JSON.parse(spike.json);
    expect(meta.compile_options).toMatch(/-double/);
    expect(meta.compile_options).toMatch(/-ftz 2/);
  });
});

describe('spike: determinism and seeding', () => {
  it('same seed + same trace -> identical output hash', async () => {
    const a = await render({ seconds: 12, seed: 7, conductor: makeSpikeConductor() });
    const b = await render({ seconds: 12, seed: 7, conductor: makeSpikeConductor() });
    expect(hashOutputs(a.outputs)).toBe(hashOutputs(b.outputs));
    expect(a.decisions).toEqual(b.decisions);
  });

  it('different seed -> different output', async () => {
    const a = await render({ seconds: 2, seed: 7 });
    const b = await render({ seconds: 2, seed: 8 });
    expect(hashOutputs(a.outputs)).not.toBe(hashOutputs(b.outputs));
  });

  it('noise streams are decorrelated', async () => {
    const probe = await compileDspSource(
      'noiseprobe',
      `import("stdfaust.lib"); import("cog.lib");
       seed = nentry("seed", 1, 0, 2147483647, 1);
       process = wnoise(seed, 1), wnoise(seed, 2), wnoise(seed, 3);`
    );
    const proc = await createOffline(probe);
    proc.setParamValue('/noiseprobe/seed', 12345);
    const out = proc.render([], SR * 4);
    const corr = (x: Float32Array, y: Float32Array) => {
      let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
      for (let i = 0; i < x.length; i++) {
        sx += x[i]; sy += y[i]; sxx += x[i] * x[i]; syy += y[i] * y[i]; sxy += x[i] * y[i];
      }
      const n = x.length;
      return (sxy - (sx * sy) / n) / Math.sqrt((sxx - (sx * sx) / n) * (syy - (sy * sy) / n));
    };
    expect(Math.abs(corr(out[0], out[1]))).toBeLessThan(0.01);
    expect(Math.abs(corr(out[0], out[2]))).toBeLessThan(0.01);
    expect(Math.abs(corr(out[1], out[2]))).toBeLessThan(0.01);
    // and roughly uniform in [-1, 1): mean ~0, rms ~ 1/sqrt(3)
    let s = 0, ss = 0;
    for (const v of out[0]) { s += v; ss += v * v; }
    expect(Math.abs(s / out[0].length)).toBeLessThan(0.01);
    expect(Math.sqrt(ss / out[0].length)).toBeCloseTo(1 / Math.sqrt(3), 2);
  });
});

describe('spike: bar-latched commits', () => {
  it('a multi-param batch latches on one sample, on a bar line', async () => {
    const r = await render({ seconds: 10, seed: 3, conductor: makeSpikeConductor(2) });
    const [, , , pA, pB] = r.outputs;
    const ia = firstChange(pA);
    const ib = firstChange(pB);
    expect(ia).toBeGreaterThan(0);
    expect(ia).toBe(ib);
    // bar k starts on sample k*BAR (+1: the clock starts advancing on sample 1)
    expect([0, 1]).toContain(ia % BAR_120);
    // every batch landed on the bar it asked for
    expect(r.decisions.length).toBeGreaterThan(0);
    for (const d of r.decisions) expect(d.landedBar).toBe(d.requestedBar);
  });

  it('every later batch also latches both probes together', async () => {
    const r = await render({ seconds: 30, seed: 11, conductor: makeSpikeConductor(2) });
    const [, , , pA, pB] = r.outputs;
    let i = 0;
    let n = 0;
    while ((i = firstChange(pA, i)) > 0) {
      expect(pB[i]).not.toBe(pB[i - 1]);
      expect(pB[i]).toBe(-pA[i]);
      expect([0, 1]).toContain(i % BAR_120);
      n++;
    }
    expect(n).toBeGreaterThanOrEqual(5);
  });

  it('an immediate batch latches within one block, mid-bar, not at the bar line', async () => {
    const proc = await createOffline(spike);
    renderOffline({ proc, root: 'spike', seconds: 0.5, seed: 3 }); // now mid bar 0
    const r = renderOffline({
      proc,
      root: 'spike',
      seconds: 0.5,
      seed: 3,
      events: [{ applyAtBar: -1, immediate: true, rampSec: 0, ruleId: 'manual', changes: [{ param: 'probeA', value: 5 }] }]
    });
    const i = r.outputs[3].findIndex((v) => v === 5);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThanOrEqual(faustArgs.blockSize);
    expect(r.decisions[0].immediate).toBe(true);
  });
});

describe('spike: ramps reach their target exactly (double precision)', () => {
  it('0.9 -> 1.0 over 60 s arrives within 0.1% and is linear', async () => {
    const r = await render({
      seconds: 66,
      seed: 1,
      // lands on bar 1 (t = 2 s), ramps for 60 s
      events: [{ applyAtBar: 1, rampSec: 60, ruleId: 'test.glide', changes: [{ param: 'glide', value: 1.0 }] }]
    });
    const g = r.outputs[2];
    const start = firstChange(g);
    expect([0, 1]).toContain(start % BAR_120);
    const mid = g[start + 30 * SR];
    expect(mid).toBeCloseTo(0.95, 4);
    const end = g[start + 60 * SR + 10];
    expect(Math.abs(end - 1.0) / 1.0).toBeLessThan(0.001);
    expect(g[g.length - 1]).toBe(1.0); // exact arrival, then holds
  });

  it('a param not in a batch keeps its own ramp running', async () => {
    const r = await render({
      seconds: 14,
      seed: 1,
      events: [
        { applyAtBar: 1, rampSec: 8, ruleId: 'glide', changes: [{ param: 'glide', value: 1.7 }] },
        { applyAtBar: 3, rampSec: 0, ruleId: 'probe', changes: [{ param: 'probeA', value: 9 }] }
      ]
    });
    const g = r.outputs[2];
    const start = firstChange(g);
    // at bar 3 (6 s) the glide ramp (started at 2 s) must be untouched by the probe batch
    const t5 = g[start + 5 * SR];
    expect(t5).toBeCloseTo(0.9 + (0.8 * 5) / 8, 4);
  });
});

describe('spike: tempo latches to the bar line', () => {
  it('a bpm change mid-bar takes effect at the next bar', async () => {
    const proc = await createOffline(spike);
    const r = renderOffline({ proc, root: 'spike', seconds: 0.5, seed: 1 });
    expect(r.barStarts.map((b) => b.bar)).toEqual([0]);
    proc.setParamValue('/spike/bpm', 100); // mid bar 0
    const r2 = renderOffline({ proc, root: 'spike', seconds: 8, seed: 1 });
    // bar 0 still ends at 2 s (120 bpm); bar 1 is 2.4 s long (100 bpm)
    const offset = Math.ceil((0.5 * SR) / faustArgs.blockSize) * faustArgs.blockSize;
    const at = (bar: number) => r2.barStarts.find((b) => b.bar === bar)!.sample + offset;
    const block = faustArgs.blockSize;
    expect(Math.abs(at(1) - BAR_120)).toBeLessThanOrEqual(block);
    expect(Math.abs(at(2) - at(1) - 2.4 * SR)).toBeLessThanOrEqual(block);
    expect(Math.abs(at(3) - at(2) - 2.4 * SR)).toBeLessThanOrEqual(block);
  });
});
