// Host-side batch delivery, shared by the live audio host and the offline renderer so
// both paths deliver changes identically.
//
//  * Events are held until the bar before they are due, then sent so they latch on
//    the next bar line. Immediate events go out as soon as nothing is in flight.
//  * Exactly one batch is in flight at a time; it is "landed" once the DSP reports a
//    latchedCommit >= its commit number.

import { SYS, type ConductorEvent, type DecisionLogEntry, type ParamSink } from './contract.ts';

interface InFlight {
  commit: number;
  event: ConductorEvent;
}

export class CommitQueue {
  private sink: ParamSink;
  private pending: ConductorEvent[] = [];
  private inFlight: InFlight | null = null;
  private commitCounter = 0;
  private currentBar = -1;
  private onLanded: (entry: DecisionLogEntry) => void;

  constructor(sink: ParamSink, onLanded: (entry: DecisionLogEntry) => void) {
    this.sink = sink;
    this.onLanded = onLanded;
  }

  /** Add events (from the conductor or from manual control). */
  schedule(events: ConductorEvent[]): void {
    for (const ev of events) {
      // Coalesce consecutive manual (immediate) changes: later values win, one batch.
      const last = this.pending[this.pending.length - 1];
      if (ev.immediate && last?.immediate && last.rampSec === ev.rampSec) {
        const merged = new Map(last.changes.map((c) => [c.param, c.value]));
        for (const c of ev.changes) merged.set(c.param, c.value);
        last.changes = [...merged].map(([param, value]) => ({ param, value }));
        last.ruleId = last.ruleId === ev.ruleId ? last.ruleId : 'manual.coalesced';
        continue;
      }
      this.pending.push({ ...ev, changes: [...ev.changes] });
    }
    // Immediate first, then by due bar; stable within equal keys.
    this.pending.sort((a, b) => {
      const ai = a.immediate ? 0 : 1;
      const bi = b.immediate ? 0 : 1;
      if (ai !== bi) return ai - bi;
      return a.applyAtBar - b.applyAtBar;
    });
    this.pump();
  }

  /** Call whenever the DSP reports its bar index (on change or periodically). */
  onBar(bar: number): void {
    this.currentBar = bar;
    this.pump();
  }

  /** Call whenever the DSP reports latchedCommit. */
  onLatched(latchedCommit: number, bar: number): void {
    this.currentBar = Math.max(this.currentBar, bar);
    if (this.inFlight && latchedCommit >= this.inFlight.commit) {
      const { commit, event } = this.inFlight;
      this.inFlight = null;
      this.onLanded({
        commit,
        ruleId: event.ruleId,
        note: event.note,
        requestedBar: event.applyAtBar,
        landedBar: bar,
        immediate: !!event.immediate,
        rampSec: event.rampSec,
        changes: event.changes
      });
    }
    this.pump();
  }

  get pendingCount(): number {
    return this.pending.length + (this.inFlight ? 1 : 0);
  }

  get lastCommit(): number {
    return this.commitCounter;
  }

  private pump(): void {
    if (this.inFlight || this.pending.length === 0) return;
    const next = this.pending[0];
    // A bar-latched event is sent during the bar before it is due (or late, if overdue).
    const due = next.immediate || this.currentBar >= next.applyAtBar - 1;
    if (!due) return;
    this.pending.shift();
    this.send(next);
  }

  private send(event: ConductorEvent): void {
    for (const ch of event.changes) this.sink.set(ch.param, ch.value);
    this.sink.set(SYS.rampSec, Math.max(0, event.rampSec));
    this.sink.set(SYS.immediate, event.immediate ? 1 : 0);
    this.commitCounter += 1;
    this.sink.set(SYS.commit, this.commitCounter); // LAST
    this.inFlight = { commit: this.commitCounter, event };
  }
}
