// The parameter / event contract between the conductor (pure TS) and the DSP (Faust).
//
// Rules (mirrored in dsp/cog.lib):
//  1. Every host write is *staged*. A batch is: all staged values, then rampSec and
//     immediate, then `commit` bumped LAST. Nothing is heard until the DSP latches.
//  2. A batch latches on the first bar line after its commit (or at the next sample
//     when `immediate` = 1, used for manual control). All values of one batch latch on
//     the same sample.
//  3. Continuous params then ramp linearly to their new target over the batch's
//     rampSec (exact arrival, double precision). Discrete params switch on the latch.
//  4. At most one batch is in flight. The DSP reports `latchedCommit` and `bar`; the
//     host logs the bar a batch was actually heard on. A late batch lands on the next
//     bar and the log says so.

export interface ParamChange {
  /** Faust parameter path relative to the program root, e.g. "kick/level". */
  param: string;
  value: number;
}

export interface ConductorEvent {
  /** Bar index the batch should be heard on. Immediate events use -1. */
  applyAtBar: number;
  changes: ParamChange[];
  /** Ramp duration for continuous params in this batch (seconds). */
  rampSec: number;
  /** Latch at the next sample instead of the next bar line (manual control). */
  immediate?: boolean;
  /** Which rule/decision produced this batch (for the decision log). */
  ruleId: string;
  note?: string;
}

/** What the host reports for every batch once the DSP has latched it. */
export interface DecisionLogEntry {
  commit: number;
  ruleId: string;
  note?: string;
  requestedBar: number;
  landedBar: number;
  immediate: boolean;
  rampSec: number;
  changes: ParamChange[];
}

/** System parameters every cognition DSP program exposes (relative paths). */
export const SYS = {
  seed: 'seed',
  commit: 'commit',
  immediate: 'immediate',
  rampSec: 'rampSec',
  bpm: 'bpm',
  bar: 'bar',
  latchedCommit: 'latchedCommit'
} as const;

/** Minimal sink the commit queue writes into (AudioWorklet node or offline processor). */
export interface ParamSink {
  set(param: string, value: number): void;
}
