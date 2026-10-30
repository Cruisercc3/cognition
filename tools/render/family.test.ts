// The variation family: style documents, macros / guard / safety, and the arranger's
// rules (pure — no audio rendered here).

import { describe, it, expect, beforeAll } from 'vitest';
import { familyOrder, studyIds, fieldIds, loadFixture, arrangerFor, type Fixture } from './fixture.ts';
import { effectiveParams, PRE_CALIBRATION_CEILING_DB } from '../../src/shared/style/macros.ts';
import { validateStyle, type DeepWorkStyle } from '../../src/shared/style/schema.ts';
import {
  isDiscreteParam,
  requestVariation,
  setArrangerMode,
  startOwned,
  type ArrangerData
} from '../../src/shared/conductor/arranger.ts';
import { barSeconds } from '../../src/shared/conductor/bars.ts';
import type { ConductorEvent } from '../../src/shared/contract.ts';
import type { Conductor, ConductorState } from '../../src/shared/conductor/types.ts';

let fx: Fixture;
let dw: DeepWorkStyle;

beforeAll(async () => {
  fx = await loadFixture();
  dw = fx.getStyle('deep-work')!;
}, 120_000);

const SYSTEM = new Set(['seed', 'commit', 'immediate', 'rampSec', 'guard/ceiling']);

describe('style documents', () => {
  it('the family file names ten live variations and the frozen reference', () => {
    expect(fx.family.order).toHaveLength(10);
    expect(new Set(fx.family.order).size).toBe(10);
    for (const id of fx.family.order) expect(fx.getStyle(id), id).toBeDefined();
    expect(fx.family.order).toContain(fx.family.start);
    const ref = fx.styles.get(fx.family.reference!)!;
    expect(ref.frozen).toBe(true);
    expect(ref.program).toBe('firstlisten');
  });

  it('every variation is a complete document over its live engine (Pulse or Field)', () => {
    for (const [styles, table] of [
      [fx.deepwork, fx.tables.deepwork],
      [fx.field, fx.tables.field]
    ] as const) {
      const keys = Object.keys(table).filter((k) => !SYSTEM.has(k) && !/\/(mute|solo)$/.test(k));
      for (const s of styles.values()) {
        const missing = keys.filter((k) => !(k in s.params));
        expect(missing, s.id).toEqual([]);
        expect(s.frozen, s.id).toBe(false);
      }
    }
  });

  it('rejects unknown params, unplayable builds and out-of-schema values', () => {
    const bad = structuredClone(dw);
    bad.params['kick/levle'] = -8;
    expect(validateStyle(bad, fx.tables.deepwork).ok).toBe(false);
    const fadesAPattern = structuredClone(dw);
    fadesAPattern.arrangement.build.rungs[0].set['hats/mask'] = 21845;
    fadesAPattern.arrangement.start['hats/mask'] = 17476;
    expect(validateStyle(fadesAPattern, fx.tables.deepwork).ok).toBe(false);
    const twoOwners = structuredClone(dw);
    twoOwners.arrangement.build.rungs[1].set['pad/on'] = 1;
    expect(validateStyle(twoOwners, fx.tables.deepwork).ok).toBe(false);
    const noStart = structuredClone(dw);
    delete noStart.arrangement.start['kick/on'];
    expect(validateStyle(noStart, fx.tables.deepwork).ok).toBe(false);
    const tooTall = structuredClone(dw);
    tooTall.arrangement.build.top = tooTall.arrangement.build.rungs.length + 1;
    expect(validateStyle(tooTall, fx.tables.deepwork).ok).toBe(false);
    const bad3 = JSON.parse(JSON.stringify(dw));
    bad3.safety.amRateMaxHz = 32;
    expect(validateStyle(bad3, fx.tables.deepwork).ok).toBe(false);
  });

  it('a variation never changes the tonal centre (morphs stay in key)', () => {
    const roots = new Set([...fx.deepwork.values()].map((s) => s.params['tonal/root']));
    expect(roots.size).toBe(1);
  });

  it('every variation names a different cognitive job, and why the sound fits it', () => {
    const uses = familyOrder.map((id) => fx.getStyle(id)!.use);
    for (const [i, u] of uses.entries()) {
      expect(u, familyOrder[i]).toBeDefined();
      expect(u!.for.length, familyOrder[i]).toBeGreaterThan(10);
      expect(u!.why.length, familyOrder[i]).toBeGreaterThan(40);
    }
    expect(new Set(uses.map((u) => u!.name)).size).toBe(familyOrder.length);
  });

  it('every variation opens in a place of its own: its first element differs from all the others', () => {
    const first = familyOrder.map((id) => fx.getStyle(id)!.arrangement.build.rungs[0].name);
    expect(new Set(first).size).toBe(familyOrder.length);
  });

  it('Read keeps to the Read gate: no pitched sequences, every repeated sound the same token', () => {
    const read = [...fx.deepwork.values()].find((s) => s.use?.name === 'Read')!;
    expect(read).toBeDefined();
    const built = new Set(read.arrangement.build.rungs.flatMap((r) => Object.keys(r.set)));
    for (const l of ['acid', 'stab', 'glass', 'perc', 'clap', 'ohat']) {
      expect(read.params[`${l}/on`], l).toBe(0);
      expect(built.has(`${l}/on`), l).toBe(false);
    }
    expect(read.params['sub/motion']).toBe(0); // one bass note
    expect(read.params['hats/velocity']).toBeLessThanOrEqual(1.5); // identical ticks
    expect(Object.keys(read.arrangement.variations).every((k) => k.endsWith('/mask'))).toBe(true);
  });

  it('Settle changes least and Sprint is the fastest', () => {
    const all = [...fx.deepwork.values()];
    const settle = all.find((s) => s.use?.name === 'Settle')!;
    const sprint = all.find((s) => s.use?.name === 'Sprint')!;
    expect(settle.arrangement.build.tide).toBeNull();
    expect(settle.arrangement.minSecondsBetweenChanges).toBe(Math.max(...all.map((s) => s.arrangement.minSecondsBetweenChanges)));
    expect(settle.params.bpm).toBe(Math.min(...all.map((s) => s.params.bpm)));
    expect(sprint.params.bpm).toBe(Math.max(...all.map((s) => s.params.bpm)));
  });

  it('a warm tonal bed carries everything: every foundation has a pad, chords, an acid line, a hum, a study bed or the Field bank', () => {
    const BED = ['pad/on', 'stab/on', 'acid/on', 'hum/on', 'series/on', 'parts/on', 'veil/on', 'bank/on'];
    for (const id of [...familyOrder, ...studyIds, ...fieldIds]) {
      const b = fx.getStyle(id)!.arrangement.build;
      const foundation = b.rungs.slice(0, b.fixed).flatMap((r) => Object.keys(r.set));
      expect(foundation.some((k) => BED.includes(k)), id).toBe(true);
    }
  });

  it('the family runs from slowest to fastest, so every Auto step is a small change of tempo', () => {
    const bpms = fx.family.order.map((id) => fx.getStyle(id)!.params.bpm);
    for (let i = 1; i < bpms.length; i++) {
      expect(bpms[i], fx.family.order[i]).toBeGreaterThan(bpms[i - 1]);
      expect(bpms[i] - bpms[i - 1], fx.family.order[i]).toBeLessThanOrEqual(8);
    }
  });
});

describe('macros, Sensory Guard, safety', () => {
  const withMacros = (m: Partial<DeepWorkStyle['macros']>, params: Record<string, number> = {}): DeepWorkStyle => ({
    ...dw,
    params: { ...dw.params, ...params },
    macros: { ...dw.macros, ...m }
  });

  it('neutral macros leave every variation as authored', () => {
    for (const s of fx.deepwork.values()) {
      const p = effectiveParams(s, fx.tables.deepwork);
      for (const k of ['kick/level', 'hats/ghost', 'pad/bright', 'space/room', 'acid/cutoff', 'ohat/level']) {
        expect(p[k], `${s.id} ${k}`).toBeCloseTo(s.params[k], 9);
      }
    }
  });

  it('the output ceiling never exceeds the pre-calibration ceiling', () => {
    const s = { ...dw, guard: { ...dw.guard, ceilingDb: -1 } };
    expect(effectiveParams(s, fx.tables.deepwork)['guard/ceiling']).toBe(PRE_CALIBRATION_CEILING_DB);
  });

  it('the techno pole cannot push levels past the guard', () => {
    const p = effectiveParams(withMacros({ pulse: 1 }, { 'kick/level': -2, 'hats/level': -3, 'ohat/level': -2 }), fx.tables.deepwork);
    expect(p['kick/level']).toBeLessThanOrEqual(dw.guard.maxKickDb);
    expect(p['hats/level']).toBeLessThanOrEqual(dw.guard.maxHatDb);
    expect(p['ohat/level']).toBeLessThanOrEqual(dw.guard.maxHatDb);
  });

  it('the ambient pole removes the pulse and softens the acid', () => {
    const p = effectiveParams(withMacros({ pulse: 0 }), fx.tables.deepwork);
    for (const k of ['kick/level', 'hats/level', 'ohat/level', 'clap/level']) expect(p[k], k).toBeLessThanOrEqual(dw.params[k] - 29);
    expect(p['acid/level']).toBeLessThanOrEqual(dw.params['acid/level'] - 13);
    expect(p['pad/level']).toBeGreaterThan(dw.params['pad/level']);
  });

  it('AM depth is capped by the safety block even at full intensity', () => {
    const p = effectiveParams(withMacros({ intensity: 1 }, { 'beta/depth': 0.5 }), fx.tables.deepwork);
    expect(p['beta/depth']).toBeLessThanOrEqual(dw.safety.maxAmDepth);
  });

  it('probabilities stay in [0, 1] at full density', () => {
    const p = effectiveParams(withMacros({ density: 1 }, { 'sub/prob': 0.9, 'stab/prob': 0.8, 'ohat/prob': 0.9 }), fx.tables.deepwork);
    for (const k of ['sub/prob', 'stab/prob', 'perc/prob', 'hats/ghost', 'ohat/prob', 'acid/ghost']) {
      expect(p[k], k).toBeGreaterThanOrEqual(0);
      expect(p[k], k).toBeLessThanOrEqual(1);
    }
  });
});

// --- the arranger ---------------------------------------------------------------------

function drive(c: Conductor<ArrangerData>, bars: number, seed: number, act?: (bar: number, st: ConductorState<ArrangerData>) => ConductorState<ArrangerData>) {
  let st = c.init(seed);
  const evs: ConductorEvent[] = [];
  const states: ArrangerData[] = [];
  for (let bar = 0; bar < bars; bar++) {
    if (act) st = act(bar, st);
    const r = c.onBar(st, { bar, audioSec: 0, signals: {} });
    st = r.state;
    evs.push(...r.events);
    states.push(st.data);
  }
  return { evs, states, final: st };
}

const barsFor = (minutes: number, bpm = 120) => Math.round((minutes * 60) / barSeconds(bpm));

/** The element a set of changes belongs to (every change in a build move belongs to one). */
function elementOf(s: DeepWorkStyle, params: string[]): string | undefined {
  return s.arrangement.build.rungs.find((r) => params.every((p) => p in r.set))?.name;
}

describe('arranger: build-up and addition', () => {
  for (const id of [...familyOrder, ...studyIds, ...fieldIds]) {
    it(`${id}: builds from nothing, one element at a time — the foundation first, the rest over the minutes after`, () => {
      const s = fx.getStyle(id)!;
      const b = s.arrangement.build;
      const bpm = s.params.bpm;
      const { evs, states } = drive(arrangerFor(fx, id), barsFor(b.minutes + 2, bpm), 1);
      const built = evs.filter((e) => e.ruleId === 'arc.build');
      expect(built).toHaveLength(b.top);
      const names = built.map((e) => elementOf(s, e.changes.map((c) => c.param)));
      expect(names.slice(0, b.fixed)).toEqual(b.rungs.slice(0, b.fixed).map((r) => r.name));
      expect(new Set(names).size).toBe(b.top);
      expect(built[0].applyAtBar).toBe(1);
      for (let i = 1; i < built.length; i++) expect(built[i].applyAtBar).toBeGreaterThan(built[i - 1].applyAtBar);
      expect(built[b.fixed - 1].applyAtBar).toBeLessThanOrEqual(barsFor(b.foundationMinutes, bpm) + 1);
      expect(built[b.top - 1].applyAtBar).toBeLessThanOrEqual(barsFor(b.minutes, bpm) + 1);
      expect(built[b.top - 1].applyAtBar).toBeGreaterThan(barsFor(b.minutes * 0.8, bpm));
      for (const e of built) expect(e.rampSec).toBeGreaterThanOrEqual(8 * barSeconds(bpm)); // fades, never cuts
      // it reaches its top (after which the body may already have taken one free element out)
      expect(Math.max(...states.map((d) => d.present.length))).toBe(b.top);
    });
  }

  it('introScale 0 starts at full texture with no build', () => {
    expect(startOwned(dw, 0)['kick/on']).toBe(1);
    expect(drive(arrangerFor(fx, 'deep-work', { introScale: 0 }), 40, 1).evs.filter((e) => e.ruleId === 'arc.build')).toHaveLength(0);
  });

  for (const id of [...familyOrder, ...studyIds, ...fieldIds]) {
    it(`${id}: one small move at a time, inside the change budget, for an hour`, () => {
      const s = fx.getStyle(id)!;
      const b = s.arrangement.build;
      const bpm = s.params.bpm;
      const { evs, states } = drive(arrangerFor(fx, id, { introScale: 0 }), barsFor(60, bpm), 7);
      const moves = evs.filter((e) => e.ruleId.startsWith('arranger.') && !e.ruleId.startsWith('arranger.morph'));
      // more dynamic than First Listen (one change per 8 minutes), still far from busy
      expect(moves.length).toBeGreaterThanOrEqual(20);
      expect(moves.length).toBeLessThanOrEqual(90);
      const minGap = Math.ceil(s.arrangement.minSecondsBetweenChanges / barSeconds(bpm));
      for (let i = 1; i < moves.length; i++) expect(moves[i].applyAtBar - moves[i - 1].applyAtBar).toBeGreaterThanOrEqual(minGap);
      for (const e of moves) {
        if (/add|drop|ebb|flow/.test(e.ruleId)) {
          expect(elementOf(s, e.changes.map((c) => c.param)), e.note).toBeDefined();
          expect(e.rampSec).toBeGreaterThanOrEqual(8 * barSeconds(bpm)); // a fade, never a cut
          continue;
        }
        expect(e.changes, e.note).toHaveLength(1);
        const c = e.changes[0];
        if (e.ruleId === 'arranger.drift') {
          const [lo, hi] = s.arrangement.drift[c.param];
          expect(c.value).toBeGreaterThanOrEqual(lo);
          expect(c.value).toBeLessThanOrEqual(hi);
        } else if (e.ruleId === 'arranger.vary') {
          expect(s.arrangement.variations[c.param]).toContain(c.value);
        } else if (e.ruleId === 'arranger.shift') {
          expect(s.arrangement.shifts[c.param]).toContain(c.value);
        }
      }
      // the build stays inside its bounds; outside a tide the foundation always plays
      const foundation = b.rungs.slice(0, b.fixed).map((r) => r.name);
      for (const d of states) {
        expect(d.present.length).toBeLessThanOrEqual(b.top);
        expect(d.present.length).toBeGreaterThanOrEqual(b.tide ? Math.min(b.tide.floor, b.top - b.wobble) : b.top - b.wobble);
        if (d.build === 'body') for (const f of foundation) expect(d.present, f).toContain(f);
        for (const r of b.rungs) {
          for (const [k, v] of Object.entries(r.set)) expect(d.owned[k], `${r.name} ${k}`).toBe(d.present.includes(r.name) ? v : s.arrangement.start[k]);
        }
      }
      // a fixed variation never roams
      expect(evs.some((e) => e.ruleId === 'arranger.morph')).toBe(false);
    });
  }

  it('a tide breathes out to its floor, newest first, and builds back up in a new order', () => {
    const s = fx.getStyle('deep-work')!;
    const b = s.arrangement.build;
    const { evs, states } = drive(arrangerFor(fx, 'deep-work', { introScale: 0 }), barsFor(150), 4);
    const ebbs = evs.filter((e) => e.ruleId === 'arranger.ebb');
    const flows = evs.filter((e) => e.ruleId === 'arranger.flow');
    expect(ebbs.length).toBeGreaterThan(0);
    expect(flows.length).toBeGreaterThan(0);
    expect(Math.min(...states.map((d) => d.present.length))).toBe(b.tide!.floor);
    // after each low point the build returns to its top
    const low = states.findIndex((d) => d.present.length === b.tide!.floor);
    expect(states.slice(low).some((d) => d.build === 'body' && d.present.length === b.top)).toBe(true);
    // cycles differ: the free elements do not always come back in the same order
    const cycles = new Set(states.filter((d) => d.build === 'flow').map((d) => d.order.join(',')));
    expect(cycles.size).toBeGreaterThan(1);
  });

  it('is deterministic per seed and differs across seeds', () => {
    const bars = barsFor(40);
    const a = () => drive(arrangerFor(fx, 'deep-work'), bars, 3).evs;
    expect(a()).toEqual(a());
    expect(JSON.stringify(a())).not.toBe(JSON.stringify(drive(arrangerFor(fx, 'deep-work'), bars, 4).evs));
  });
});

describe('arranger: morphs and Auto', () => {
  it('a pick morphs: continuous values glide together, discrete ones switch one at a time', () => {
    const { evs, final } = drive(arrangerFor(fx, 'deep-work', { introScale: 0 }), 80, 5, (bar, st) => (bar === 10 ? requestVariation(st, 'acid-drift') : st));
    const start = evs.find((e) => e.ruleId === 'arranger.morph')!;
    expect(start).toBeDefined();
    expect(start.applyAtBar).toBe(11);
    expect(start.rampSec).toBeCloseTo(fx.family.morphBars * barSeconds(122), 6);
    expect(start.changes.some((c) => c.param === 'acid/level')).toBe(true);
    expect(start.changes.some((c) => c.param === 'stab/on' && c.value === 0)).toBe(true); // stab leaves as a fade
    const steps = evs.filter((e) => e.ruleId === 'arranger.morph.step');
    const audibleSteps = steps.filter((e) => e.applyAtBar < 11 + fx.family.morphBars);
    for (const e of audibleSteps) expect(e.changes).toHaveLength(1);
    for (const e of steps) for (const c of e.changes) expect(isDiscreteParam(c.param)).toBe(true);
    // the leaving layer's pattern switches only once it has faded out
    const stabMask = steps.find((e) => e.changes.some((c) => c.param === 'stab/mask'));
    if (stabMask) expect(stabMask.applyAtBar).toBe(11 + fx.family.morphBars);
    expect(final.data.styleId).toBe('acid-drift');
    expect(final.data.morph).toBeNull();
    // after the morph, the new variation carries on with its own moves
    expect(evs.some((e) => e.applyAtBar > 11 + fx.family.morphBars && e.ruleId.startsWith('arranger.') && !e.ruleId.startsWith('arranger.morph'))).toBe(true);
  });

  it('a pick during the build carries the build over, and the new variation keeps building', () => {
    const target = fx.getStyle('dub-chamber')!;
    const { evs, states, final } = drive(arrangerFor(fx, 'deep-work', { introScale: 1 }), 260, 5, (bar, st) => (bar === 40 ? requestVariation(st, 'dub-chamber') : st));
    const built = evs.filter((e) => e.ruleId === 'arc.build');
    expect(built.every((e) => e.applyAtBar <= 41)).toBe(true);
    const m = evs.find((e) => e.ruleId === 'arranger.morph')!;
    expect(m.applyAtBar).toBe(41);
    // nothing jumps to full texture: as many elements as were playing carry over
    expect(m.changes.find((c) => c.param === 'stab/on')?.value ?? 0).toBe(target.arrangement.build.rungs.slice(0, built.length).some((r) => 'stab/on' in r.set) ? 1 : 0);
    expect(evs.filter((e) => e.ruleId === 'arranger.flow').length).toBeGreaterThan(0);
    expect(final.data.styleId).toBe('dub-chamber');
    expect(Math.max(...states.filter((d) => d.styleId === 'dub-chamber').map((d) => d.present.length))).toBe(target.arrangement.build.top);
  });

  it('Auto roams to a neighbour every roamMinutes, never jumping across the family', () => {
    const bars = barsFor(120);
    const { evs, states } = drive(arrangerFor(fx, 'deep-work', { introScale: 0, mode: 'auto' }), bars, 11);
    const morphs = evs.filter((e) => e.ruleId === 'arranger.morph');
    const [lo, hi] = fx.family.roamMinutes;
    expect(morphs.length).toBeGreaterThanOrEqual(Math.floor(120 / (hi + 1)) - 1);
    expect(morphs.length).toBeLessThanOrEqual(Math.ceil(120 / lo) + 1);
    const order = fx.family.order;
    let prev = 'deep-work';
    const visited: string[] = [];
    for (const d of states) {
      if (d.styleId !== prev) {
        expect(Math.abs(order.indexOf(d.styleId) - order.indexOf(prev)), `${prev} -> ${d.styleId}`).toBe(1);
        visited.push(d.styleId);
        prev = d.styleId;
      }
    }
    expect(new Set(visited).size).toBeGreaterThanOrEqual(2);
    expect(visited).not.toContain('first-listen');
  });

  it('switching to Auto mid-session restarts the roam timer; fixed mode never roams', () => {
    const c = arrangerFor(fx, 'deep-work', { introScale: 0, mode: 'fixed' });
    const switchBar = barsFor(30);
    const { evs } = drive(c, barsFor(60), 2, (bar, st) => (bar === switchBar ? setArrangerMode(st, 'auto') : st));
    const morphs = evs.filter((e) => e.ruleId === 'arranger.morph');
    expect(morphs.length).toBeGreaterThanOrEqual(1);
    expect(morphs[0].applyAtBar).toBeGreaterThanOrEqual(switchBar + barsFor(fx.family.roamMinutes[0]));
  });
});
