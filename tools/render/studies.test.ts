// The Deep Work studies: five experiments on Deep Work, each built around one finding about
// sound and cognition. Each keeps Deep Work's key, tempo and core, and holds to its own law:
// in its document, and in the sound itself where the law is about what is heard.

import { describe, it, expect, beforeAll } from 'vitest';
import { loadFixture, studyIds, type Fixture } from './fixture.ts';
import { createOffline } from '../dsp/faust-node.ts';
import { renderOffline } from './render.ts';
import { fullOwned } from '../../src/shared/conductor/arranger.ts';
import { bandFloor, bandShare, modulationIndex } from '../harness/metrics.ts';
import type { DeepWorkStyle } from '../../src/shared/style/schema.ts';

let fx: Fixture;
beforeAll(async () => {
  fx = await loadFixture();
}, 120_000);

const LAYERS = ['kick', 'sub', 'hats', 'ohat', 'clap', 'perc', 'acid', 'stab', 'pad', 'noise', 'rain', 'sea', 'light', 'glass', 'hum', 'series', 'parts', 'veil'];
/** Layers that sound as a sequence of separate, changing pieces. */
const SEGMENTED = ['hats', 'ohat', 'clap', 'perc', 'acid', 'stab', 'glass'];
/** Layers that paint a place. */
const SCENES = ['rain', 'sea', 'light', 'glass', 'hum'];
/** Layers tuned in equal temperament or detuned against each other. */
const TEMPERED = ['pad', 'stab', 'acid', 'glass', 'light', 'parts', 'veil'];

const study = (job: string): DeepWorkStyle => {
  const s = studyIds.map((id) => fx.getStyle(id)!).find((x) => x.use?.name === job);
  if (!s) throw new Error(`no study for ${job}`);
  return s;
};
const built = (s: DeepWorkStyle) => new Set(s.arrangement.build.rungs.flatMap((r) => Object.keys(r.set)));
const neverPlays = (s: DeepWorkStyle, layer: string) => s.params[`${layer}/on`] === 0 && !built(s).has(`${layer}/on`);

/** A variation at full texture; `only` keeps one layer and silences the rest (no kick, so no duck). */
async function render(s: DeepWorkStyle, seconds: number, only?: string) {
  const p = fx.resolve(s, fullOwned(s));
  if (only) for (const l of LAYERS) p[`${l}/on`] = l === only ? 1 : 0;
  const r = renderOffline({ proc: await createOffline(fx.dsp.deepwork), root: 'deepwork', seconds, seed: 9, initialParams: p });
  return r.outputs.slice(0, 2).map((c) => c.subarray(8 * 48000));
}

describe('the Deep Work studies', () => {
  it('five, each a Deep Work: its key, its tempo, outside Auto, each with a job of its own', () => {
    expect(studyIds).toHaveLength(5);
    const dw = fx.getStyle('deep-work')!;
    for (const id of studyIds) {
      const s = fx.getStyle(id)!;
      expect(fx.family.order, id).not.toContain(id);
      expect(s.parentIds, id).toEqual(['deep-work']);
      expect(s.params.bpm, id).toBe(dw.params.bpm);
      expect(s.params['tonal/root'], id).toBe(dw.params['tonal/root']);
      expect(s.use!.why.length, id).toBeGreaterThan(300);
    }
    const jobs = [...fx.family.order, ...studyIds].map((id) => fx.getStyle(id)!.use!.name);
    expect(new Set(jobs).size).toBe(jobs.length);
  });
});

describe('Unbroken (Write): verbal work is disrupted by sound in separate, changing pieces, not by continuous sound', () => {
  it('nothing but the kick is segmented: no ticks, chords, acid, wood or bells; the bass is held; the air breathes', () => {
    const s = study('Write');
    for (const l of SEGMENTED) expect(neverPlays(s, l), l).toBe(true);
    expect(s.params['sub/hold']).toBe(1);
    expect(s.params['sub/motion']).toBe(0);
    expect(s.params['noise/pump']).toBeGreaterThan(0);
    expect(s.params['space/duckShape']).toBeGreaterThan(0.5); // a breath, not an edge
  });

  it('its speech band fluctuates less at the rate of syllables than Deep Work, by half', async () => {
    const band = async (s: DeepWorkStyle) => modulationIndex(await render(s, 40), 300, 3000, 3, 8);
    expect(await band(study('Write'))).toBeLessThan(0.5 * (await band(fx.getStyle('deep-work')!)));
  }, 300_000);
});

describe('Middle Distance (Design): the harmony moves inside, the top stays still, nothing paints a picture', () => {
  it('the top and bottom parts hold; only the inner parts move', () => {
    const s = study('Design');
    const moved = { ...s.arrangement.variations, ...s.arrangement.drift };
    expect('parts/inner1' in s.arrangement.variations).toBe(true);
    expect('parts/inner2' in s.arrangement.variations).toBe(true);
    expect('parts/top' in moved).toBe(false);
    expect('parts/low' in moved).toBe(false);
  });

  it('every chord the parts can reach is free of rubs (no minor second or minor ninth between any two parts)', () => {
    const s = study('Design');
    const opts = (k: string) => s.arrangement.variations[k] ?? [s.params[k]];
    for (const a of opts('parts/inner1')) {
      for (const b of opts('parts/inner2')) {
        const notes = [s.params['parts/low'], a, b, s.params['parts/top']];
        for (let i = 0; i < notes.length; i++) {
          for (let j = i + 1; j < notes.length; j++) {
            const d = Math.abs(notes[i] - notes[j]);
            expect([1, 13], `${notes.join(' ')}`).not.toContain(d);
          }
        }
      }
    }
  });

  it('no scene sounds: no rain, sea, light, bells or hum', () => {
    const s = study('Design');
    for (const l of SCENES) expect(neverPlays(s, l), l).toBe(true);
  });
});

describe('Overtones (Hours): ratios, not numbers — one tone from the harmonic series, nothing beating', () => {
  it('every pitched layer sits on the root: the kick is tuned to it, the bass plays only it, no tempered chord plays', () => {
    const s = study('Hours');
    const rootHz = 440 * Math.pow(2, (s.params['tonal/root'] - 12 - 69) / 12);
    expect(Math.abs(s.params['kick/pitch'] - rootHz)).toBeLessThan(0.01);
    expect(s.params['sub/motion']).toBe(0);
    for (const l of TEMPERED) expect(neverPlays(s, l), l).toBe(true);
    expect(built(s).has('series/on')).toBe(true);
  });

  it('its bed, heard alone, beats far less than Deep Work’s detuned pad', async () => {
    const beat = async (s: DeepWorkStyle, bed: string) => modulationIndex(await render(s, 28, bed), 200, 4000, 3, 20);
    expect(await beat(study('Hours'), 'series')).toBeLessThan(0.4 * (await beat(fx.getStyle('deep-work')!, 'pad')));
  }, 300_000);
});

describe('Flutter (Hold): a 16 Hz flutter on the bed, locked to the beat, arriving gradually', () => {
  it('the flutter is an element that fades in, inside the safety block, at eight pulses a beat (12–20 Hz)', () => {
    const s = study('Hold');
    const r = s.arrangement.build.rungs.find((x) => 'beta/depth' in x.set)!;
    expect(r).toBeDefined();
    expect(s.arrangement.start['beta/depth']).toBe(0);
    expect(r.set['beta/depth']).toBeLessThanOrEqual(s.safety.maxAmDepth);
    expect(r.fadeBars).toBeGreaterThanOrEqual(16);
    const rate = (s.params.bpm / 60) * 8;
    expect(rate).toBeGreaterThanOrEqual(12);
    expect(rate).toBeLessThanOrEqual(Math.min(20, s.safety.amRateMaxHz));
    expect(s.params['beta/chords']).toBe(1);
  });

  it('its pad, heard alone, flutters at 12–20 Hz several times as much as Deep Work’s', async () => {
    // alone, because in the full mix the sixteenth notes already put energy at 16 Hz
    const flutter = async (s: DeepWorkStyle) => modulationIndex(await render(s, 28, 'pad'), 200, 1000, 12, 20);
    expect(await flutter(study('Hold'))).toBeGreaterThan(3 * (await flutter(fx.getStyle('deep-work')!)));
  }, 300_000);
});

describe('Shelter (Shield): a steady veil over the band where speech is understood', () => {
  it('the veil is the first element, so it is there from the start and stays through the tides', () => {
    const s = study('Shield');
    expect(Object.keys(s.arrangement.build.rungs[0].set)).toEqual(['veil/on']);
  });

  it('at the same loudness, the band speech is understood in (1–4 kHz) is never empty: its quietest moments sit far above Deep Work’s, and it is no brighter than the kept five', async () => {
    const shelter = await render(study('Shield'), 40);
    const deepWork = await render(fx.getStyle('deep-work')!, 40);
    expect(bandFloor(shelter, 1000, 4000)).toBeGreaterThan(bandFloor(deepWork, 1000, 4000) + 12);
    expect(bandShare(shelter, 1000, 4000)).toBeGreaterThan(bandShare(deepWork, 1000, 4000) + 1.5);
    expect(bandShare(shelter, 3000, 10000)).toBeLessThan(-24); // the brightest kept variation sits at about -24
  }, 300_000);
});
