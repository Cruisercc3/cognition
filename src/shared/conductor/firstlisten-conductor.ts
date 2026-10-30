// FROZEN: the First Listen conductor (pure), exactly as heard at the First Listen
// (git tag first-listen). It drives the frozen firstlisten engine; never edit it — the
// live arranger is arranger.ts.
//
// Two jobs:
//  1. Ramp-in: arrangement intro steps, each a bar-latched batch whose continuous
//     values fade over rampBars (layers enter as fades, never as events).
//  2. Body: one reshuffle every `reshuffleMinutes`, changing at most one discrete
//     element and one drifting value, inside the style's change budget.
// Everything is bar-clocked and seeded, so offline renders reproduce sessions exactly.

import type { ConductorEvent, ParamChange } from '../contract.ts';
import { nextFloat, nextInt, nextRange, seedPrng } from '../prng.ts';
import type { FirstListenStyle as Style } from '../style/schema.ts';
import type { Conductor, ConductorState } from './types.ts';
import { barSeconds } from './bars.ts';

export interface FirstListenData {
  /** Current values of arrangement-owned params (start + intro + reshuffles). */
  owned: Record<string, number>;
  nextIntro: number;
  lastChangeBar: number;
  lastReshuffleBar: number;
  bodyStartBar: number;
  reshuffles: number;
}

export interface FirstListenOptions {
  /** Multiplies intro bar positions and ramps (0 = skip the ramp-in, start at full). */
  introScale?: number;
}

/** Arrangement-owned values a session starts with (after optional intro skipping). */
export function firstListenStartValues(style: Style, opts: FirstListenOptions = {}): Record<string, number> {
  const owned: Record<string, number> = { ...style.arrangement.start };
  if ((opts.introScale ?? 1) === 0) for (const step of style.arrangement.intro) Object.assign(owned, step.set);
  return owned;
}

export function makeFirstListenConductor(style: Style, opts: FirstListenOptions = {}): Conductor<FirstListenData> {
  const scale = opts.introScale ?? 1;
  const bpm = style.params.bpm ?? 120;
  const barSec = barSeconds(bpm);
  const arr = style.arrangement;
  const intro = scale === 0 ? [] : [...arr.intro].sort((a, b) => a.atBar - b.atBar);
  const introEnd = intro.length
    ? Math.max(...intro.map((s) => Math.round(s.atBar * scale) + Math.round(s.rampBars * scale)))
    : 0;
  const reshuffleBars = Math.max(1, Math.round((arr.reshuffleMinutes * 60) / barSec));
  const minGapBars = Math.ceil(arr.budget.minSecondsBetweenChanges / barSec);

  return {
    id: 'firstlisten',
    init(seed: number): ConductorState<FirstListenData> {
      return {
        rng: seedPrng(seed ^ 0x5eed),
        data: {
          owned: firstListenStartValues(style, opts),
          nextIntro: 0,
          lastChangeBar: -1_000_000,
          lastReshuffleBar: introEnd,
          bodyStartBar: introEnd,
          reshuffles: 0
        }
      };
    },
    onBar(state, inputs) {
      const rng = [...state.rng] as typeof state.rng;
      const data: FirstListenData = { ...state.data, owned: { ...state.data.owned } };
      const events: ConductorEvent[] = [];
      const due = inputs.bar + 1; // schedule for the next bar line

      // 1) ramp-in: arc allowance, exempt from the reshuffle budget
      while (data.nextIntro < intro.length && Math.max(1, Math.round(intro[data.nextIntro].atBar * scale)) <= due) {
        const step = intro[data.nextIntro];
        const changes: ParamChange[] = Object.entries(step.set).map(([param, value]) => ({ param, value }));
        Object.assign(data.owned, step.set);
        events.push({
          applyAtBar: Math.max(due, Math.round(step.atBar * scale)),
          changes,
          rampSec: step.rampBars * scale * barSec,
          ruleId: 'arc.intro',
          note: `intro step ${data.nextIntro + 1}/${intro.length}`
        });
        data.nextIntro += 1;
      }

      // 2) body reshuffles
      const inBody = due >= data.bodyStartBar && data.nextIntro >= intro.length;
      const reshuffleDue = inBody && due - data.lastReshuffleBar >= reshuffleBars && due - data.lastChangeBar >= minGapBars;
      if (reshuffleDue) {
        const changes: ParamChange[] = [];
        let discreteNote = '';
        const vKeys = Object.keys(arr.variations);
        for (let i = 0; i < arr.budget.maxDiscretePerReshuffle && vKeys.length; i++) {
          const k = vKeys[nextInt(rng, vKeys.length)];
          const pool = arr.variations[k];
          const current = data.owned[k] ?? style.params[k];
          const options = pool.filter((v) => v !== current);
          if (!options.length || changes.some((c) => c.param === k)) continue;
          const v = options[nextInt(rng, options.length)];
          changes.push({ param: k, value: v });
          data.owned[k] = v;
          discreteNote = `${k}`;
        }
        const dKeys = Object.keys(arr.drift);
        let driftNote = '';
        for (let i = 0; i < arr.budget.maxDriftPerReshuffle && dKeys.length; i++) {
          const k = dKeys[nextInt(rng, dKeys.length)];
          if (changes.some((c) => c.param === k)) continue;
          const [lo, hi] = arr.drift[k];
          // move toward a new point in the band, but not more than half the band at once
          const current = data.owned[k] ?? style.params[k] ?? (lo + hi) / 2;
          const target = nextRange(rng, lo, hi);
          const maxStep = (hi - lo) * 0.5;
          const v = current + Math.max(-maxStep, Math.min(maxStep, target - current));
          changes.push({ param: k, value: v });
          data.owned[k] = v;
          driftNote = k;
        }
        if (changes.length) {
          data.reshuffles += 1;
          data.lastReshuffleBar = due;
          data.lastChangeBar = due;
          events.push({
            applyAtBar: due,
            changes,
            rampSec: arr.driftRampBars * barSec,
            ruleId: 'arranger.reshuffle',
            note: `reshuffle ${data.reshuffles}: ${[discreteNote, driftNote].filter(Boolean).join(' + ')}`
          });
        }
      }
      // keep the PRNG stream advancing identically regardless of branch history
      nextFloat(rng);
      return { state: { rng, data }, events };
    }
  };
}
