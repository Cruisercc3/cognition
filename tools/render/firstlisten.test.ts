// The First Listen reference must stay exactly as it was heard. This pins the frozen
// engine + frozen conductor + frozen style to the hash the v1 engine produced on
// 2026-10-13 (git tag first-listen) for the same seed and settings.

import { describe, it, expect, beforeAll } from 'vitest';
import { createOffline } from '../dsp/faust-node.ts';
import { renderOffline, hashOutputs } from './render.ts';
import { loadFixture, type Fixture } from './fixture.ts';
import { effectiveParams } from '../../src/shared/style/macros.ts';
import { makeFirstListenConductor, firstListenStartValues } from '../../src/shared/conductor/firstlisten-conductor.ts';
import type { FirstListenStyle } from '../../src/shared/style/schema.ts';

/** v1 deepwork.dsp + deep-work.style.json @ first-listen: 45 s, seed 11, introScale 0.25. */
const FIRST_LISTEN_HASH = '37b651a0b2033f6c9bea2da1785befbf0de3634487389a29ceae05e916b86420';

let fx: Fixture;
beforeAll(async () => {
  fx = await loadFixture();
}, 120_000);

describe('First Listen reference (frozen)', () => {
  it('is frozen and runs on its own engine', () => {
    const s = fx.styles.get('first-listen')!;
    expect(s.frozen).toBe(true);
    expect(s.program).toBe('firstlisten');
  });

  it('renders bit-identically to the version heard at the First Listen', async () => {
    const style = fx.styles.get('first-listen') as FirstListenStyle;
    const proc = await createOffline(fx.dsp.firstlisten);
    const initialParams = effectiveParams(style, undefined, firstListenStartValues(style, { introScale: 0.25 }));
    const r = renderOffline({
      proc,
      root: 'firstlisten',
      seconds: 45,
      seed: 11,
      initialParams,
      conductor: makeFirstListenConductor(style, { introScale: 0.25 })
    });
    expect(r.decisions.length).toBe(5);
    expect(hashOutputs(r.outputs.slice(0, 2))).toBe(FIRST_LISTEN_HASH);
  }, 120_000);
});
