// The conductor is a PURE module: no Electron, no timers, no Date.now(), no Math.random().
// It is driven one bar at a time — live by bar ticks reported from the audio worklet,
// offline by the renderer's virtual clock — so offline renders include everything the
// conductor does.

import type { ConductorEvent } from '../contract.ts';
import type { PrngState } from '../prng.ts';

export interface ConductorInputs {
  /** Bar index that just started. */
  bar: number;
  /** Seconds of audio rendered so far (derived from bars, never wall-clock). */
  audioSec: number;
  /** Opt-in signals (clock, idle, hotkeys, ...), already aggregated by the host. */
  signals: Record<string, number>;
}

export interface ConductorState<S = unknown> {
  rng: PrngState;
  data: S;
}

export interface Conductor<S = unknown> {
  id: string;
  init(seed: number): ConductorState<S>;
  onBar(state: ConductorState<S>, inputs: ConductorInputs): { state: ConductorState<S>; events: ConductorEvent[] };
}
