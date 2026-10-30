// Bar arithmetic shared by every conductor (4/4 throughout).

export function barSeconds(bpm: number): number {
  return (60 / bpm) * 4;
}

/** Whole bars in `seconds` at `bpm` (at least 1). */
export function barsIn(seconds: number, bpm: number): number {
  return Math.max(1, Math.round(seconds / barSeconds(bpm)));
}
