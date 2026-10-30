// Harness hard limits on every variation, every Deep Work study and every Field style, rendered at full
// texture through the real arranger: never clips, no loudness jumps, no deviant onsets, the
// output floor holds, every arranger batch is heard on the bar it asked for, and all of them
// are level-matched.

import { describe, it, expect, beforeAll } from 'vitest';
import { familyOrder, studyIds, fieldIds, loadFixture, renderVariation, type Fixture } from './fixture.ts';
import { PRE_CALIBRATION_CEILING_DB } from '../../src/shared/style/macros.ts';
import { report, toDb, truePeak, maxShortTermStep, onsets, deviantOnsets, integratedLoudness, bandSpike } from '../harness/metrics.ts';

const SECONDS = 75;
const SKIP = 8; // the first window starts from silence
// The sharpest the kept five get in the mid band: Machine Room's claps and toms, ~16.7 dB
// here. The rejected Tight Pulse stood ~18 dB out and Clockwork's knock in threes ~27; the
// user heard both as punchy.
const SPIKE_MAX_DB = 17;

let fx: Fixture;
const loudness: Record<string, number> = {};

beforeAll(async () => {
  fx = await loadFixture();
}, 120_000);

describe.each([...familyOrder, ...studyIds, ...fieldIds])('rendered %s', (id) => {
  let r: Awaited<ReturnType<typeof renderVariation>>;
  let body: Float32Array[];

  beforeAll(async () => {
    r = await renderVariation(fx, id, { seconds: SECONDS, seed: 31 });
    body = r.outputs.slice(0, 2).map((c) => c.subarray(SKIP * 48000));
    loudness[id] = integratedLoudness(body);
  }, 300_000);

  it('never clips; true peak stays at the ceiling (+ inter-sample margin)', () => {
    const tp = toDb(truePeak(r.outputs.slice(0, 2)));
    expect(tp).toBeLessThanOrEqual(-1);
    expect(tp).toBeLessThanOrEqual(PRE_CALIBRATION_CEILING_DB + 2.5);
  });

  it('short-term loudness never jumps more than 3 LU', () => {
    expect(maxShortTermStep(body).maxStep).toBeLessThanOrEqual(3);
  });

  it('has no deviant onsets (>10 dB above the local median)', () => {
    expect(deviantOnsets(onsets(body))).toEqual([]);
  });

  it("keeps the output floor above Chromium's audibility threshold", () => {
    expect(report(r.outputs.slice(0, 2)).floorMinRmsDb).toBeGreaterThanOrEqual(-66);
  });

  it('is heard in the calibrated loudness window (−29 LUFS ± 1.5)', () => {
    expect(loudness[id]).toBeGreaterThanOrEqual(-30.5);
    expect(loudness[id]).toBeLessThanOrEqual(-27.5);
  });

  it('has real stereo above the bass, and keeps the bass centred', () => {
    const rep = report(body);
    expect(rep.highCorrelation).toBeLessThan(0.85);
    expect(rep.highCorrelation).toBeGreaterThan(0.1);
    expect(rep.lrCorrelation).toBeGreaterThan(0.6); // broadband: dominated by the mono low end
  });

  it('nothing hits harder than the variations the user kept: no knock, clap or tom stands out of the bed', () => {
    expect(bandSpike(body)).toBeLessThanOrEqual(SPIKE_MAX_DB);
  });

  it('every arranger batch landed on the bar it asked for', () => {
    for (const d of r.decisions) expect(d.landedBar, d.note).toBe(d.requestedBar);
  });
});
