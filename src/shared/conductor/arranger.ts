// The arranger (pure): the live engine's conductor. Bar-clocked and seeded, so an
// offline render reproduces a live session exactly. Its jobs:
//  1. Build-up and addition — a session starts from nothing and adds the variation's
//     elements one at a time: the foundation within a few minutes, the rest across the
//     minutes after. Only `top` elements play at once; the others wait for a later cycle.
//  2. Sections — at most one move per section, inside the change budget: add an element
//     that is not playing, take a free one out, vary one pattern, drift one value, or shift
//     one dimension a rung along its ladder (the colour ladder, the lattice's phase).
//  3. Tides — every so often the build breathes out, one element at a time (newest
//     first), down to its floor, then builds back up in a new order.
//  4. Morphs — moving to another variation (a pick, or Auto roaming to a neighbour): as
//     many elements carry over as were playing; continuous values ramp together across
//     the morph; discrete values switch one at a time across it — silent layers first,
//     leaving layers last. Then the new variation keeps building to its top.
// Every addition and removal is a slow fade.

import type { ConductorEvent, ParamChange } from '../contract.ts';
import { nextFloat, nextInt, nextRange, seedPrng, type PrngState } from '../prng.ts';
import { isDiscreteParam, type DeepWorkStyle } from '../style/schema.ts';
import type { Family } from '../style/family.ts';
import type { Conductor, ConductorState } from './types.ts';
import { barSeconds, barsIn } from './bars.ts';

export { isDiscreteParam };
export type Params = Record<string, number>;

export interface ArrangerOptions {
  family: Family;
  /** Current working copy of a variation (the host may edit styles while playing). */
  getStyle(id: string): DeepWorkStyle | undefined;
  /** Effective params for a variation with these arrangement-owned values (host overrides included). */
  resolve(style: DeepWorkStyle, owned: Params): Params;
  /** The variation the session starts in. */
  startId: string;
  mode: 'auto' | 'fixed';
  /** Scales the initial build's timing (0 = no build: start with the full texture). */
  introScale?: number;
}

export interface MorphState {
  fromId: string;
  toId: string;
  endBar: number;
  steps: { atBar: number; changes: ParamChange[] }[];
}

/** build: the initial build-up; body: full, with small moves; ebb / flow: a tide going out / coming back. */
export type BuildPhase = 'build' | 'body' | 'ebb' | 'flow';

export interface ArrangerData {
  mode: 'auto' | 'fixed';
  /** The variation playing (the morph target once a morph has begun). */
  styleId: string;
  /** Current values of arrangement-owned params (elements, moves, morph target). */
  owned: Params;
  /** Elements playing, in the order they arrived. */
  present: string[];
  /** The order the free elements come in this cycle (the foundation always comes first). */
  order: string[];
  build: BuildPhase;
  /** The initial build: the bar each element still to come arrives on. */
  schedule: { name: string; bar: number }[];
  /** The bar the initial build completes on (Auto's clock starts here). */
  bodyStartBar: number;
  nextTideBar: number;
  lastChangeBar: number;
  nextSectionBar: number;
  nextRoamBar: number;
  sections: number;
  morph: MorphState | null;
  prevStyleId: string | null;
  pendingPick: string | null;
  /** Set when Auto is switched on mid-session: the roam timer restarts from the next bar. */
  restartRoam: boolean;
}

export const layerOf = (k: string): string => k.split('/')[0];

const rungOf = (style: DeepWorkStyle, name: string) => style.arrangement.build.rungs.find((r) => r.name === name);
const foundationOf = (style: DeepWorkStyle) => style.arrangement.build.rungs.slice(0, style.arrangement.build.fixed).map((r) => r.name);
const freeOf = (style: DeepWorkStyle) => style.arrangement.build.rungs.slice(style.arrangement.build.fixed).map((r) => r.name);

/** The elements a variation plays at full texture, as authored (foundation, then the free ones as listed). */
export function defaultPresent(style: DeepWorkStyle): string[] {
  return style.arrangement.build.rungs.slice(0, style.arrangement.build.top).map((r) => r.name);
}

/** Owned values with these elements playing. */
export function ownedFor(style: DeepWorkStyle, present: string[]): Params {
  const owned: Params = { ...style.arrangement.start };
  for (const name of present) Object.assign(owned, rungOf(style, name)?.set ?? {});
  return owned;
}

/** Owned values at full texture, as authored. */
export function fullOwned(style: DeepWorkStyle): Params {
  return ownedFor(style, defaultPresent(style));
}

/** Arrangement-owned values a session starts with (silence before the build, or full texture). */
export function startOwned(style: DeepWorkStyle, introScale = 1): Params {
  return introScale === 0 ? fullOwned(style) : { ...style.arrangement.start };
}

export function requestVariation(state: ConductorState<ArrangerData>, id: string): ConductorState<ArrangerData> {
  return { ...state, data: { ...state.data, pendingPick: id } };
}

export function setArrangerMode(state: ConductorState<ArrangerData>, mode: 'auto' | 'fixed'): ConductorState<ArrangerData> {
  if (state.data.mode === mode) return state;
  return { ...state, data: { ...state.data, mode, restartRoam: mode === 'auto' } };
}

export type ArrangerPhase = 'ramp-in' | 'body' | 'morph';

export function arrangerPhase(data: ArrangerData, sessionBar: number): ArrangerPhase {
  if (data.morph && sessionBar < data.morph.endBar) return 'morph';
  return data.build === 'build' || sessionBar < data.bodyStartBar ? 'ramp-in' : 'body';
}

/** Where the build stands, for the panel. */
export interface BuildView {
  phase: BuildPhase;
  present: string[];
  top: number;
}

export function buildView(data: ArrangerData, style: DeepWorkStyle | undefined): BuildView {
  return { phase: data.build, present: [...data.present], top: style?.arrangement.build.top ?? data.present.length };
}

type MoveKind = 'add' | 'drop' | 'vary' | 'drift' | 'shift' | 'rest';

export function makeArranger(opts: ArrangerOptions): Conductor<ArrangerData> {
  const { family } = opts;
  const scale = opts.introScale ?? 1;
  const startStyle = opts.getStyle(opts.startId);
  if (!startStyle) throw new Error(`arranger: unknown start variation "${opts.startId}"`);

  const bpmOf = (s: DeepWorkStyle) => s.params.bpm ?? 120;
  const sectionLen = (rng: PrngState, s: DeepWorkStyle) =>
    Math.max(4, Math.round(s.arrangement.sectionBars * nextRange(rng, 0.75, 1.25)));
  const roamLen = (rng: PrngState, s: DeepWorkStyle) =>
    barsIn(nextRange(rng, family.roamMinutes[0], family.roamMinutes[1]) * 60, bpmOf(s));
  const tideLen = (rng: PrngState, s: DeepWorkStyle) => {
    const t = s.arrangement.build.tide;
    return t ? barsIn(nextRange(rng, t.everyMinutes[0], t.everyMinutes[1]) * 60, bpmOf(s)) : Number.MAX_SAFE_INTEGER;
  };
  const minGapBars = (s: DeepWorkStyle) => Math.ceil(s.arrangement.minSecondsBetweenChanges / barSeconds(bpmOf(s)));
  /** A tide moves one element per step: no faster than the change budget, nor than half a section. */
  const tideStepBars = (s: DeepWorkStyle) => Math.max(minGapBars(s), Math.round(s.arrangement.sectionBars / 2));

  /** This cycle's arrival order of the free elements (seeded). */
  function shuffledFree(rng: PrngState, s: DeepWorkStyle): string[] {
    const free = freeOf(s);
    for (let i = free.length - 1; i > 0; i--) {
      const j = nextInt(rng, i + 1);
      [free[i], free[j]] = [free[j], free[i]];
    }
    return free;
  }

  /** The initial build's timetable: the foundation within foundationMinutes, the rest by minutes. */
  function schedule(s: DeepWorkStyle, free: string[]): { name: string; bar: number }[] {
    const b = s.arrangement.build;
    const names = [...foundationOf(s), ...free].slice(0, b.top);
    const f = Math.min(b.fixed, names.length);
    const foundSec = b.foundationMinutes * 60 * scale;
    const totalSec = b.minutes * 60 * scale;
    const barSec = barSeconds(bpmOf(s));
    let last = 1;
    return names.map((name, i) => {
      const t = i < f ? (foundSec * i) / Math.max(1, f) : foundSec + ((totalSec - foundSec) * (i - f + 1)) / Math.max(1, names.length - f);
      last = Math.max(last, 1 + Math.round(t / barSec));
      return { name, bar: last };
    });
  }

  function addElement(data: ArrangerData, s: DeepWorkStyle, name: string, due: number, ruleId: string, fadeScale = 1): ConductorEvent {
    const r = rungOf(s, name)!;
    Object.assign(data.owned, r.set);
    data.present = [...data.present, name];
    return {
      applyAtBar: due,
      changes: Object.entries(r.set).map(([param, value]) => ({ param, value })),
      rampSec: r.fadeBars * fadeScale * barSeconds(bpmOf(s)),
      ruleId,
      note: `+ ${name} (${data.present.length}/${s.arrangement.build.top})`
    };
  }

  function dropElement(data: ArrangerData, s: DeepWorkStyle, name: string, due: number, ruleId: string): ConductorEvent {
    const r = rungOf(s, name)!;
    const changes = Object.keys(r.set).map((param) => ({ param, value: s.arrangement.start[param] }));
    for (const c of changes) data.owned[c.param] = c.value;
    data.present = data.present.filter((n) => n !== name);
    return {
      applyAtBar: due,
      changes,
      rampSec: r.fadeBars * barSeconds(bpmOf(s)),
      ruleId,
      note: `− ${name} (${data.present.length}/${s.arrangement.build.top})`
    };
  }

  /** The next element a rebuild brings back: the foundation first (in order), then this cycle's free order. */
  function nextToAdd(data: ArrangerData, s: DeepWorkStyle): string | null {
    for (const name of [...foundationOf(s), ...data.order]) if (!data.present.includes(name)) return name;
    return null;
  }

  /** Auto moves to a neighbour in the family line, preferring not to go straight back. */
  function chooseNeighbour(rng: PrngState, data: ArrangerData): string | null {
    const order = family.order.filter((id) => {
      const s = opts.getStyle(id);
      return !!s && !s.frozen;
    });
    const i = order.indexOf(data.styleId);
    if (i < 0) return order.includes(family.start) ? family.start : (order[0] ?? null);
    const nb = [order[i - 1], order[i + 1]].filter((x): x is string => !!x);
    if (!nb.length) return null;
    if (nb.length === 2 && data.prevStyleId && nb.includes(data.prevStyleId) && nextFloat(rng) < 0.7) {
      return nb.find((x) => x !== data.prevStyleId)!;
    }
    return nb[nextInt(rng, nb.length)];
  }

  function startMorph(rng: PrngState, data: ArrangerData, targetId: string, due: number, reason: string): ConductorEvent[] {
    const cur = opts.getStyle(data.styleId);
    const target = opts.getStyle(targetId);
    if (!cur || !target || target.frozen) return [];
    const from = opts.resolve(cur, data.owned);
    // as many elements as were playing carry over, in the target's own order for this cycle
    const tb = target.arrangement.build;
    const order = shuffledFree(rng, target);
    const present = [...foundationOf(target), ...order].slice(0, Math.min(Math.max(1, data.present.length), tb.top));
    const toOwned = ownedFor(target, present);
    const to = opts.resolve(target, toOwned);
    const morphBars = family.morphBars;
    const barSec = barSeconds(bpmOf(target));

    const now: ParamChange[] = [];
    const middle: ParamChange[] = [];
    const last: ParamChange[] = [];
    for (const k of Object.keys(to).sort()) {
      if (from[k] === to[k]) continue;
      const change = { param: k, value: to[k] };
      if (!isDiscreteParam(k)) {
        now.push(change);
        continue;
      }
      const onKey = `${layerOf(k)}/on`;
      const silentNow = onKey in from && from[onKey] < 0.05;
      const silentAfter = onKey in to && to[onKey] < 0.05;
      if (silentNow) now.push(change); // nothing audible to change: switch it before it fades in
      else if (silentAfter) last.push(change); // leaving: switch once it has faded out
      else middle.push(change);
    }
    // a seeded order for the audible switches, spread evenly across the morph
    for (let i = middle.length - 1; i > 0; i--) {
      const j = nextInt(rng, i + 1);
      [middle[i], middle[j]] = [middle[j], middle[i]];
    }
    const steps: MorphState['steps'] = middle.map((c, i) => ({
      atBar: due + Math.max(1, Math.round(((i + 1) * morphBars) / (middle.length + 1))),
      changes: [c]
    }));
    if (last.length) steps.push({ atBar: due + morphBars, changes: last });

    data.prevStyleId = data.styleId;
    data.styleId = target.id;
    data.owned = toOwned;
    data.present = present;
    data.order = order;
    data.schedule = [];
    data.build = present.length < tb.top ? 'flow' : 'body';
    data.bodyStartBar = Math.min(data.bodyStartBar, due);
    data.morph = { fromId: cur.id, toId: target.id, endBar: due + morphBars, steps };
    data.lastChangeBar = due + morphBars;
    data.nextSectionBar = due + morphBars + sectionLen(rng, target);
    data.nextRoamBar = due + morphBars + roamLen(rng, target);
    data.nextTideBar = due + morphBars + tideLen(rng, target);
    if (!now.length) return [];
    return [
      {
        applyAtBar: due,
        changes: now,
        rampSec: morphBars * barSec,
        ruleId: 'arranger.morph',
        note: `${reason}: ${cur.name} → ${target.name}`
      }
    ];
  }

  function tryMove(kind: MoveKind, rng: PrngState, data: ArrangerData, style: DeepWorkStyle, due: number): ConductorEvent | null {
    const arr = style.arrangement;
    const b = arr.build;
    const barSec = barSeconds(bpmOf(style));
    if (kind === 'add') {
      if (data.present.length >= b.top) return null;
      const absent = freeOf(style).filter((n) => !data.present.includes(n));
      if (!absent.length) return null;
      return addElement(data, style, absent[nextInt(rng, absent.length)], due, 'arranger.add');
    }
    if (kind === 'drop') {
      if (data.present.length <= b.top - b.wobble) return null;
      const free = freeOf(style).filter((n) => data.present.includes(n));
      if (!free.length) return null;
      return dropElement(data, style, free[nextInt(rng, free.length)], due, 'arranger.drop');
    }
    if (kind === 'vary') {
      const keys = Object.keys(arr.variations);
      if (!keys.length) return null;
      const k = keys[nextInt(rng, keys.length)];
      const current = data.owned[k] ?? style.params[k];
      const options = arr.variations[k].filter((v) => v !== current);
      if (!options.length) return null;
      const value = options[nextInt(rng, options.length)];
      data.owned[k] = value;
      return { applyAtBar: due, changes: [{ param: k, value }], rampSec: 0, ruleId: 'arranger.vary', note: k };
    }
    if (kind === 'drift') {
      const keys = Object.keys(arr.drift);
      if (!keys.length) return null;
      const k = keys[nextInt(rng, keys.length)];
      const [lo, hi] = arr.drift[k];
      // toward a new point in the band, never more than half the band at once
      const current = data.owned[k] ?? style.params[k] ?? (lo + hi) / 2;
      const target = nextRange(rng, lo, hi);
      const maxStep = (hi - lo) * 0.5;
      const value = Math.min(hi, Math.max(lo, current + Math.max(-maxStep, Math.min(maxStep, target - current))));
      data.owned[k] = value;
      return { applyAtBar: due, changes: [{ param: k, value }], rampSec: arr.driftRampBars * barSec, ruleId: 'arranger.drift', note: k };
    }
    if (kind === 'shift') {
      const keys = Object.keys(arr.shifts);
      if (!keys.length) return null;
      const k = keys[nextInt(rng, keys.length)];
      const ladder = arr.shifts[k];
      const current = data.owned[k] ?? style.params[k] ?? ladder[0];
      // the rung nearest where it stands, then one rung up or down (inward at either end)
      let at = 0;
      for (let i = 1; i < ladder.length; i++) if (Math.abs(ladder[i] - current) < Math.abs(ladder[at] - current)) at = i;
      const up = at === 0 ? true : at === ladder.length - 1 ? false : nextFloat(rng) < 0.5;
      const value = ladder[at + (up ? 1 : -1)];
      data.owned[k] = value;
      const rampSec = isDiscreteParam(k) ? 0 : arr.shiftRampBars * barSec;
      return { applyAtBar: due, changes: [{ param: k, value }], rampSec, ruleId: 'arranger.shift', note: `${k} → ${value}` };
    }
    return null;
  }

  /** One section move. While the initial build is under way only vary, drift and shift are allowed. */
  function sectionMove(rng: PrngState, data: ArrangerData, style: DeepWorkStyle, due: number): ConductorEvent | null {
    const w = { ...style.arrangement.moves };
    if (data.build === 'build') w.add = w.drop = 0;
    const kinds = ['add', 'drop', 'vary', 'drift', 'shift', 'rest'] as const;
    const total = kinds.reduce((t, k) => t + w[k], 0);
    if (total <= 0) return null;
    let r = nextFloat(rng) * total;
    let kind: MoveKind = 'rest';
    for (const k of kinds) {
      if (r < w[k]) {
        kind = k;
        break;
      }
      r -= w[k];
    }
    if (kind === 'rest') return null;
    // a chosen move with nothing to do falls back to the others, in a fixed order
    for (const k of [kind, 'drift', 'vary', 'add', 'drop', 'shift'] as const) {
      if (w[k] <= 0) continue;
      const ev = tryMove(k, rng, data, style, due);
      if (ev) return ev;
    }
    return null;
  }

  /** One step of a tide: out to the floor (newest first), a step's rest there, then back up in a new order. */
  function tideStep(rng: PrngState, data: ArrangerData, style: DeepWorkStyle, due: number): ConductorEvent | null {
    const b = style.arrangement.build;
    const floor = b.tide?.floor ?? b.top;
    if (data.build === 'ebb') {
      if (data.present.length > floor) {
        const ev = dropElement(data, style, data.present[data.present.length - 1], due, 'arranger.ebb');
        if (data.present.length <= floor) {
          data.build = 'flow';
          data.order = shuffledFree(rng, style);
        }
        return ev;
      }
      data.build = 'flow';
      data.order = shuffledFree(rng, style);
    }
    const name = data.present.length < b.top ? nextToAdd(data, style) : null;
    const ev = name ? addElement(data, style, name, due, 'arranger.flow') : null;
    if (data.present.length >= b.top || !name) {
      data.build = 'body';
      data.nextTideBar = due + tideLen(rng, style);
      data.nextSectionBar = due + sectionLen(rng, style);
    }
    return ev;
  }

  return {
    id: 'arranger',
    init(seed: number): ConductorState<ArrangerData> {
      const rng = seedPrng(seed ^ 0xa22a);
      const s = startStyle;
      if (scale === 0) {
        // no build: the full texture as authored, from the first bar
        return {
          rng,
          data: {
            mode: opts.mode,
            styleId: s.id,
            owned: fullOwned(s),
            present: defaultPresent(s),
            order: freeOf(s),
            build: 'body',
            schedule: [],
            bodyStartBar: 0,
            nextTideBar: tideLen(rng, s),
            lastChangeBar: 0,
            nextSectionBar: sectionLen(rng, s),
            nextRoamBar: roamLen(rng, s),
            sections: 0,
            morph: null,
            prevStyleId: null,
            pendingPick: null,
            restartRoam: false
          }
        };
      }
      const order = shuffledFree(rng, s);
      const sched = schedule(s, order);
      const lastStep = sched[sched.length - 1];
      const bodyStart = lastStep.bar + Math.round(rungOf(s, lastStep.name)!.fadeBars * scale);
      return {
        rng,
        data: {
          mode: opts.mode,
          styleId: s.id,
          owned: startOwned(s, scale),
          present: [],
          order,
          build: 'build',
          schedule: sched,
          bodyStartBar: bodyStart,
          nextTideBar: bodyStart + tideLen(rng, s),
          lastChangeBar: 0,
          nextSectionBar: sectionLen(rng, s),
          nextRoamBar: bodyStart + roamLen(rng, s),
          sections: 0,
          morph: null,
          prevStyleId: null,
          pendingPick: null,
          restartRoam: false
        }
      };
    },
    onBar(state, inputs) {
      const rng = [...state.rng] as PrngState;
      const data: ArrangerData = { ...state.data, owned: { ...state.data.owned }, present: [...state.data.present] };
      const events: ConductorEvent[] = [];
      const due = inputs.bar + 1; // schedule for the next bar line

      if (data.restartRoam) {
        const s = opts.getStyle(data.styleId);
        if (s) data.nextRoamBar = due + roamLen(rng, s);
        data.restartRoam = false;
      }

      // 1) a pick: a morph, whatever the build is doing (it carries over)
      if (data.pendingPick && !data.morph) {
        const pick = data.pendingPick;
        data.pendingPick = null;
        if (pick !== data.styleId) events.push(...startMorph(rng, data, pick, due, 'pick'));
      }

      // 2) a morph in progress: its discrete steps, then it ends
      if (data.morph) {
        const m = data.morph;
        const dueSteps = m.steps.filter((s) => s.atBar <= due);
        if (dueSteps.length) {
          events.push({
            applyAtBar: due,
            changes: dueSteps.flatMap((s) => s.changes),
            rampSec: 0,
            ruleId: 'arranger.morph.step',
            note: dueSteps
              .flatMap((s) => s.changes)
              .map((c) => c.param)
              .join(', ')
          });
          data.morph = { ...m, steps: m.steps.filter((s) => s.atBar > due) };
        }
        if (due >= m.endBar && !data.morph.steps.length) data.morph = null;
        return { state: { rng, data }, events };
      }

      const style = opts.getStyle(data.styleId);
      if (!style) return { state: { rng, data }, events };

      // 3) the initial build: elements arrive on their timetable (exempt from the change budget)
      if (data.build === 'build') {
        const arriving = data.schedule.filter((s) => s.bar <= due);
        if (arriving.length) {
          data.schedule = data.schedule.filter((s) => s.bar > due);
          for (const a of arriving) events.push(addElement(data, style, a.name, due, 'arc.build', scale));
          data.lastChangeBar = due;
        }
        if (!data.schedule.length && due >= data.bodyStartBar) {
          data.build = 'body';
          data.nextSectionBar = Math.max(data.nextSectionBar, due + sectionLen(rng, style));
        } else if (!arriving.length && data.present.length >= style.arrangement.build.fixed) {
          // once the foundation is in, the sections may vary and drift between arrivals
          if (due >= data.nextSectionBar && due - data.lastChangeBar >= minGapBars(style)) {
            data.sections += 1;
            const ev = sectionMove(rng, data, style, due);
            if (ev) {
              events.push(ev);
              data.lastChangeBar = due;
            }
            data.nextSectionBar = due + sectionLen(rng, style);
          }
        }
        return { state: { rng, data }, events };
      }

      // 4) Auto roams to a neighbour (from the body)
      if (data.mode === 'auto' && data.build === 'body' && due >= data.nextRoamBar) {
        const target = chooseNeighbour(rng, data);
        if (target && target !== data.styleId) events.push(...startMorph(rng, data, target, due, 'auto'));
        else data.nextRoamBar = due + roamLen(rng, style);
        return { state: { rng, data }, events };
      }

      // 5) a tide: starts from the body, then one element per step
      if (data.build === 'body' && style.arrangement.build.tide && due >= data.nextTideBar && due - data.lastChangeBar >= minGapBars(style)) {
        data.build = 'ebb';
      }
      if (data.build === 'ebb' || data.build === 'flow') {
        if (due - data.lastChangeBar >= tideStepBars(style)) {
          const ev = tideStep(rng, data, style, due);
          if (ev) {
            events.push(ev);
            data.lastChangeBar = due;
          }
        }
        return { state: { rng, data }, events };
      }

      // 6) the body: one move per section, inside the change budget
      if (due >= data.nextSectionBar && due - data.lastChangeBar >= minGapBars(style)) {
        data.sections += 1;
        const ev = sectionMove(rng, data, style, due);
        if (ev) {
          events.push(ev);
          data.lastChangeBar = due;
        }
        data.nextSectionBar = due + sectionLen(rng, style);
      }
      return { state: { rng, data }, events };
    }
  };
}
