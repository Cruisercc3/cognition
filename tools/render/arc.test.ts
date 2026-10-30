// A whole session arc through the real arranger: the build, the body, and a morph to
// another variation — rendered, with the harness limits that matter for each part.

import { describe, it, expect, beforeAll } from 'vitest';
import { createOffline } from '../dsp/faust-node.ts';
import { renderOffline, hashOutputs } from './render.ts';
import { familyOrder, loadFixture, arrangerFor, renderVariation, withActionAt, type Fixture } from './fixture.ts';
import { startOwned, requestVariation } from '../../src/shared/conductor/arranger.ts';
import { correlation, highCorrelation, maxShortTermStep, onsets, deviantOnsets, report } from '../harness/metrics.ts';

let fx: Fixture;
beforeAll(async () => {
  fx = await loadFixture();
}, 120_000);

describe('Deep Work building up (a quick build)', () => {
  const SECONDS = 160;
  const INTRO = 0.15;
  let r: Awaited<ReturnType<typeof renderVariation>>;

  beforeAll(async () => {
    r = await renderVariation(fx, 'deep-work', { seconds: SECONDS, seed: 9, introScale: INTRO });
  }, 300_000);

  const sec = (minutes: number) => minutes * 60 * INTRO;

  it('every element is heard on its bar', () => {
    const built = r.decisions.filter((d) => d.ruleId === 'arc.build');
    expect(built).toHaveLength(fx.getStyle('deep-work')!.arrangement.build.top);
    for (const d of r.decisions) expect(d.landedBar).toBe(d.requestedBar);
  });

  it('short-term loudness never jumps more than 3 LU once the foundation is in', () => {
    const b = fx.getStyle('deep-work')!.arrangement.build;
    expect(maxShortTermStep(r.outputs.slice(0, 2), sec(b.foundationMinutes) + 12).maxStep).toBeLessThanOrEqual(3);
  });

  it('has no deviant onsets once the build is complete', () => {
    // the build itself is excluded by design: layers fading in from silence rise above a sparse median
    const b = fx.getStyle('deep-work')!.arrangement.build;
    const body = r.outputs.slice(0, 2).map((c) => c.subarray(Math.round((sec(b.minutes) + 12) * 48000)));
    expect(deviantOnsets(onsets(body))).toEqual([]);
  });

  it('is reproducible from seed + style', async () => {
    const again = await renderVariation(fx, 'deep-work', { seconds: 20, seed: 9, introScale: INTRO });
    const first20 = r.outputs.slice(0, 2).map((c) => c.slice(0, again.outputs[0].length));
    expect(hashOutputs(again.outputs.slice(0, 2))).toBe(hashOutputs(first20));
  }, 120_000);
});

describe('a morph between neighbours (Deep Work → Acid Drift)', () => {
  const PICK_BAR = 8;
  let r: Awaited<ReturnType<typeof renderVariation>>;

  beforeAll(async () => {
    const conductor = withActionAt(arrangerFor(fx, 'deep-work', { introScale: 0 }), PICK_BAR, (st) => requestVariation(st, 'acid-drift'));
    r = await renderVariation(fx, 'deep-work', { seconds: 120, seed: 13, conductor });
  }, 300_000);

  it('starts on the next bar and every step is heard on its bar', () => {
    const m = r.decisions.find((d) => d.ruleId === 'arranger.morph')!;
    expect(m.landedBar).toBe(PICK_BAR + 1);
    expect(r.decisions.filter((d) => d.ruleId === 'arranger.morph.step').length).toBeGreaterThan(0);
    for (const d of r.decisions) expect(d.landedBar, d.note).toBe(d.requestedBar);
  });

  it('never jumps more than 3 LU in short-term loudness, and has no deviant onsets', () => {
    const body = r.outputs.slice(0, 2).map((c) => c.subarray(8 * 48000));
    expect(maxShortTermStep(body).maxStep).toBeLessThanOrEqual(3);
    expect(deviantOnsets(onsets(body))).toEqual([]);
  });
});

describe(`the widest pick (${familyOrder[0]} → ${familyOrder[familyOrder.length - 1]}: slowest to fastest)`, () => {
  it('still blends without a loudness jump or a deviant onset', async () => {
    const [from, to] = [familyOrder[0], familyOrder[familyOrder.length - 1]];
    const conductor = withActionAt(arrangerFor(fx, from, { introScale: 0 }), 6, (st) => requestVariation(st, to));
    const r = await renderVariation(fx, from, { seconds: 110, seed: 17, conductor });
    const body = r.outputs.slice(0, 2).map((c) => c.subarray(8 * 48000));
    expect(maxShortTermStep(body).maxStep).toBeLessThanOrEqual(3);
    expect(deviantOnsets(onsets(body))).toEqual([]);
  }, 300_000);
});

describe('rendered noise bed', () => {
  // width < 1 narrows the image on purpose, and the bus keeps everything below ~140 Hz
  // mono (so brown noise reads as mono broadband); above the bass the generator itself
  // must be decorrelated.
  it('is decorrelated L/R (< 0.1) above the bass at full width, and mono below it', async () => {
    const s = fx.getStyle('deep-work')!;
    const proc = await createOffline(fx.dsp.deepwork);
    const p = { ...fx.resolve(s, startOwned(s, 0)), 'noise/solo': 1, 'noise/level': -30, 'space/crossfeed': 0, 'space/room': 0, 'space/width': 1 };
    const r = renderOffline({ proc, root: 'deepwork', seconds: 10, seed: 5, initialParams: p });
    const body = r.outputs.slice(0, 2).map((c) => c.subarray(48000 * 2));
    expect(Math.abs(highCorrelation(body, 400))).toBeLessThan(0.1);
    expect(correlation(body[0], body[1])).toBeGreaterThan(0.3);
    expect(report(body).integratedLufs).toBeGreaterThan(-70);
  }, 120_000);
});
