// Phase 0 spike conductor: exercises the contract, nothing musical.
// Every `everyBars` bars it schedules one batch for the next bar that changes two
// discrete probes together (they must latch on the same sample) and ramps `glide`.

import type { Conductor, ConductorState } from './types.ts';
import type { ConductorEvent } from '../contract.ts';
import { seedPrng, nextInt, nextRange } from '../prng.ts';

interface SpikeData {
  everyBars: number;
  count: number;
}

export function makeSpikeConductor(everyBars = 2): Conductor<SpikeData> {
  return {
    id: 'spike',
    init(seed: number): ConductorState<SpikeData> {
      return { rng: seedPrng(seed), data: { everyBars, count: 0 } };
    },
    onBar(state, inputs) {
      const rng = [...state.rng] as typeof state.rng;
      const data = { ...state.data };
      const events: ConductorEvent[] = [];
      if (inputs.bar > 0 && inputs.bar % data.everyBars === 0) {
        data.count += 1;
        const v = 1 + nextInt(rng, 1000);
        events.push({
          applyAtBar: inputs.bar + 1,
          changes: [
            { param: 'probeA', value: v },
            { param: 'probeB', value: -v }
          ],
          rampSec: 0,
          ruleId: 'spike.probes',
          note: `batch ${data.count}`
        });
        events.push({
          applyAtBar: inputs.bar + 2,
          changes: [{ param: 'glide', value: nextRange(rng, 0.5, 1.5) }],
          rampSec: 1,
          ruleId: 'spike.glide'
        });
      }
      return { state: { rng, data }, events };
    }
  };
}
