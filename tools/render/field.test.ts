// The Field engine: the beatless and tonal worlds (Drift, Bloom, Lattice). Each world holds
// to its own law, in its documents and in the sound itself where the law is about what is
// heard; the colour ladder and the phase move by the smallest step there is; Auto blends from
// one world into the next without a loudness jump or a deviant.

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { fieldIds, loadFixture, arrangerFor, renderVariation, withActionAt, type Fixture } from './fixture.ts';
import { repoRoot } from '../dsp/faust-node.ts';
import { requestVariation, type ArrangerData } from '../../src/shared/conductor/arranger.ts';
import { barSeconds } from '../../src/shared/conductor/bars.ts';
import { bandSpike, deviantOnsets, maxShortTermStep, modulationIndex, onsets } from '../harness/metrics.ts';
import type { DeepWorkStyle } from '../../src/shared/style/schema.ts';
import type { ConductorEvent } from '../../src/shared/contract.ts';
import type { Conductor, ConductorState } from '../../src/shared/conductor/types.ts';

let fx: Fixture;
beforeAll(async () => {
  fx = await loadFixture();
}, 300_000);

const source = fs.readFileSync(path.join(repoRoot, 'dsp', 'field.dsp'), 'utf8');
/** The numbers in a one-line Faust definition, e.g. `degBase(i) = ba.selectn(7, i, 0, 1, ...)` (after the selector). */
function constants(name: string): number[] {
  const line = source.split('\n').find((l) => l.startsWith(`${name}(`));
  if (!line) throw new Error(`no ${name} in field.dsp`);
  const args = line.slice(line.indexOf('selectn(') + 8, line.lastIndexOf(')')).split(',').map((x) => x.trim());
  return args.slice(2).map(Number);
}

const style = (id: string): DeepWorkStyle => fx.getStyle(id)!;
const byWorld = (prefix: string) => fieldIds.filter((id) => style(id).tagline.startsWith(prefix));
const built = (s: DeepWorkStyle) => new Set(s.arrangement.build.rungs.flatMap((r) => Object.keys(r.set)));
const neverPlays = (s: DeepWorkStyle, el: string) => s.params[`${el}/on`] === 0 && !built(s).has(`${el}/on`);

function drive(c: Conductor<ArrangerData>, bars: number, seed: number) {
  let st: ConductorState<ArrangerData> = c.init(seed);
  const evs: ConductorEvent[] = [];
  const states: ArrangerData[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const r = c.onBar(st, { bar, audioSec: 0, signals: {} });
    st = r.state;
    evs.push(...r.events);
    states.push(st.data);
  }
  return { evs, states };
}
const barsFor = (minutes: number, bpm: number) => Math.round((minutes * 60) / barSeconds(bpm));

/** The numbers of a `name = waveform{...}` table in field.dsp, in rows of `cols`. */
function table(name: string, cols: number): number[][] {
  const at = source.indexOf(`${name} = waveform{`);
  if (at < 0) throw new Error(`no table ${name} in field.dsp`);
  const body = source.slice(source.indexOf('{', at) + 1, source.indexOf('}', at));
  const nums = body.split(',').map((x) => Number(x.trim()));
  const rows: number[][] = [];
  for (let i = 0; i < nums.length; i += cols) rows.push(nums.slice(i, i + cols));
  return rows;
}

// The colour ladder, as the engine holds it: one row per mode, semitones for degrees 0..27.
const LADDER = table('ladder', 28);
const scaleOf = (mode: number) => LADDER[mode].slice(0, 7);
const semis = (d: number, mode: number) => LADDER[mode][d];

describe('the Field line', () => {
  it('seven styles in three worlds, all on the Field engine and one root, outside the Pulse family, each with a job of its own', () => {
    expect(fieldIds).toHaveLength(7);
    expect(byWorld('Drift')).toHaveLength(3);
    expect(byWorld('Bloom')).toHaveLength(2);
    expect(byWorld('Lattice')).toHaveLength(2);
    const roots = new Set(fieldIds.map((id) => style(id).params['tonal/root']));
    expect(roots.size).toBe(1);
    for (const id of fieldIds) {
      const s = style(id);
      expect(s.program, id).toBe('field');
      expect(fx.family.order, id).not.toContain(id);
      expect(s.use!.why.length, id).toBeGreaterThan(300);
    }
    expect(new Set(fieldIds.map((id) => style(id).use!.name)).size).toBe(fieldIds.length);
  });

  it('Auto walks the line one neighbour at a time, and never leaves the Field engine', () => {
    const { states } = drive(arrangerFor(fx, 'still', { introScale: 0, mode: 'auto' }), barsFor(240, 60), 13);
    let prev = 'still';
    const visited = new Set<string>();
    for (const d of states) {
      if (d.styleId !== prev) {
        expect(fieldIds, d.styleId).toContain(d.styleId);
        expect(Math.abs(fieldIds.indexOf(d.styleId) - fieldIds.indexOf(prev)), `${prev} -> ${d.styleId}`).toBe(1);
        visited.add(d.styleId);
        prev = d.styleId;
      }
    }
    expect(visited.size).toBeGreaterThanOrEqual(3);
  });
});

describe('Drift (Still, Ink, Tide): no beat; nothing starts or stops', () => {
  it('no struck tones and no lattice ever play', () => {
    for (const id of byWorld('Drift')) for (const el of ['bloom', 'lattice', 'phase']) expect(neverPlays(style(id), el), `${id} ${el}`).toBe(true);
  });

  it('Still is the stillest place: the longest gap between changes, no colour shifts, only its voices move', () => {
    const still = style('still');
    for (const id of fieldIds) expect(still.arrangement.minSecondsBetweenChanges).toBeGreaterThanOrEqual(style(id).arrangement.minSecondsBetweenChanges);
    expect(Object.keys(still.arrangement.shifts)).toEqual([]);
    expect(Object.keys(still.arrangement.variations).every((k) => /^bank\/v[1-4]$/.test(k))).toBe(true);
  });

  it('in the sound: nothing stands out of the bed, and the speech band flutters at the rate of syllables less than half as much as Unbroken, the most continuous Pulse study', async () => {
    const body = async (id: string) => (await renderVariation(fx, id, { seconds: 40, seed: 9 })).outputs.slice(0, 2).map((c) => c.subarray(8 * 48000));
    const unbroken = modulationIndex(await body('unbroken'), 300, 3000, 3, 8);
    for (const id of byWorld('Drift')) {
      const b = await body(id);
      expect(bandSpike(b), id).toBeLessThanOrEqual(4); // the kept five: 5–17
      expect(modulationIndex(b, 300, 3000, 3, 8), id).toBeLessThan(0.5 * unbroken);
    }
  }, 600_000);
});

describe('Bloom (Garden, Wander): loops that never line up', () => {
  it('the six loop periods are pairwise incommensurate: no ratio within 1.5% of a simple one (up to fifths)', () => {
    const ratios = constants('blRatio');
    expect(ratios).toHaveLength(6);
    const simple: number[] = [];
    for (let p = 1; p <= 5; p++) for (let q = 1; q <= 5; q++) simple.push(p / q);
    for (let i = 0; i < ratios.length; i++) {
      for (let j = i + 1; j < ratios.length; j++) {
        const r = ratios[j] / ratios[i];
        const nearest = Math.min(...simple.map((s) => Math.abs(Math.log(r / s))));
        expect(nearest, `${ratios[i]} : ${ratios[j]}`).toBeGreaterThan(Math.log(1.015));
      }
    }
  });

  it('Garden is the quieter garden: fewer loops, longer gaps, a darker colour than Wander', () => {
    const [g, w] = [style('garden'), style('wander')];
    expect(g.params['bloom/voices']).toBeLessThan(w.params['bloom/voices']);
    expect(g.params['bloom/every']).toBeGreaterThan(w.params['bloom/every']);
    expect(Math.max(...g.arrangement.shifts['tonal/mode'])).toBeLessThan(Math.min(...w.arrangement.shifts['tonal/mode']));
  });

  it('in the sound: a struck tone never stands out of the bed', async () => {
    for (const id of byWorld('Bloom')) {
      const r = await renderVariation(fx, id, { seconds: 60, seed: 4 });
      const b = r.outputs.slice(0, 2).map((c) => c.subarray(8 * 48000));
      expect(bandSpike(b), id).toBeLessThanOrEqual(6);
      expect(deviantOnsets(onsets(b)), id).toEqual([]);
    }
  }, 600_000);
});

describe('Lattice (Build, Run): two lines, one figure; the offset only ever slides', () => {
  it('the phase is a ladder the arranger slides along, never a jump: continuous, without unison, a slide of at least half a minute', () => {
    for (const id of byWorld('Lattice')) {
      const s = style(id);
      const ladder = s.arrangement.shifts['lattice/lag'];
      expect(ladder, id).toBeDefined();
      expect(ladder).not.toContain(0); // in unison the two lines would sum into one, louder
      expect(ladder).toContain(s.params['lattice/lag']);
      expect('lattice/lag' in s.arrangement.variations || 'lattice/lag' in s.arrangement.drift).toBe(false);
      expect(s.arrangement.shiftRampBars * barSeconds(s.params.bpm)).toBeGreaterThanOrEqual(30);
      expect('lattice/pattern' in s.arrangement.variations).toBe(false); // the figure itself holds
    }
  });

  it('over two hours, every move of the phase is one step, as a slide', () => {
    for (const id of byWorld('Lattice')) {
      const s = style(id);
      const { evs } = drive(arrangerFor(fx, id, { introScale: 0 }), barsFor(120, s.params.bpm), 21);
      const lags = evs.filter((e) => e.changes.some((c) => c.param === 'lattice/lag'));
      expect(lags.length, id).toBeGreaterThan(3);
      let at = s.params['lattice/lag'];
      for (const e of lags) {
        const v = e.changes.find((c) => c.param === 'lattice/lag')!.value;
        expect(Math.abs(v - at), id).toBe(1);
        expect(e.rampSec).toBeGreaterThanOrEqual(30);
        at = v;
      }
    }
  });
});

describe('the colour ladder: every rung changes exactly one note', () => {
  it('neighbouring modes, as the engine holds them, differ in exactly one degree, by one semitone (in every octave)', () => {
    expect(LADDER).toHaveLength(6);
    for (const row of LADDER) for (let d = 7; d < 28; d++) expect(row[d]).toBe(row[d - 7] + 12);
    for (let m = 0; m < 5; m++) {
      const [a, b] = [scaleOf(m), scaleOf(m + 1)];
      const diff = a.map((x, i) => b[i] - x).filter((d) => d !== 0);
      expect(diff, `mode ${m} -> ${m + 1}`).toEqual([1]);
    }
    expect(scaleOf(1)).toEqual([0, 2, 3, 5, 7, 8, 10]); // Aeolian
    expect(scaleOf(4)).toEqual([0, 2, 4, 5, 7, 9, 11]); // Ionian
  });

  it('over two hours, every colour shift is one rung', () => {
    for (const id of fieldIds) {
      const s = style(id);
      const ladder = s.arrangement.shifts['tonal/mode'];
      if (!ladder) continue;
      const { evs } = drive(arrangerFor(fx, id, { introScale: 0 }), barsFor(120, s.params.bpm), 5);
      let at = s.params['tonal/mode'];
      for (const e of evs.filter((x) => x.ruleId === 'arranger.shift' && x.changes[0].param === 'tonal/mode')) {
        const v = e.changes[0].value;
        expect(Math.abs(v - at), id).toBe(1);
        at = v;
      }
    }
  });

  it('every chord the bed can reach, in every colour it can take, is free of rubs (no unison, minor second or minor ninth)', () => {
    for (const id of fieldIds) {
      const s = style(id);
      const opts = (k: string) => s.arrangement.variations[k] ?? [s.params[k]];
      for (const mode of s.arrangement.shifts['tonal/mode'] ?? [s.params['tonal/mode']]) {
        for (const a of opts('bank/v1')) for (const b of opts('bank/v2')) for (const c of opts('bank/v3')) for (const d of opts('bank/v4')) {
          const notes = [a, b, c, d].map((x) => semis(x, mode));
          for (let i = 0; i < 4; i++) {
            for (let j = i + 1; j < 4; j++) expect([0, 1, 13], `${id} mode ${mode}: ${notes.join(' ')}`).not.toContain(Math.abs(notes[i] - notes[j]));
          }
        }
      }
    }
  });
});

describe('Auto across worlds: a blend, never a cut', () => {
  for (const [from, to] of [
    ['still', 'garden'],
    ['wander', 'build']
  ]) {
    it(`${from} → ${to}: no loudness jump and no deviant onset across the whole blend`, async () => {
      const s = style(from);
      const bpm = s.params.bpm;
      const morph = walkBars(to);
      const c = withActionAt(arrangerFor(fx, from, { introScale: 0 }), 4, (st) => requestVariation(st, to));
      const seconds = Math.ceil((8 + morph) * barSeconds(Math.min(bpm, style(to).params.bpm))) + 20;
      const r = await renderVariation(fx, from, { seconds, seed: 3, conductor: c });
      expect(r.decisions.some((d) => d.ruleId === 'arranger.morph')).toBe(true);
      const b = r.outputs.slice(0, 2).map((x) => x.subarray(8 * 48000));
      expect(maxShortTermStep(b).maxStep).toBeLessThanOrEqual(3);
      expect(deviantOnsets(onsets(b))).toEqual([]);
    }, 900_000);
  }
});

function walkBars(_to: string): number {
  return fx.family.lines.find((l) => l.id === 'field')!.morphBars;
}
