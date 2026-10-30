// Offline renderer: the same compiled Faust program + the same pure conductor + the same
// commit queue as the live app, driven by a virtual clock. Deterministic: the same
// program, seed, initial params and signal trace always produce the same samples.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { FaustMonoOfflineProcessor } from '@grame/faustwasm/dist/esm/index.js';
import { CommitQueue } from '../../src/shared/commit-queue.ts';
import { SYS, type ConductorEvent, type DecisionLogEntry } from '../../src/shared/contract.ts';
import type { Conductor, ConductorState } from '../../src/shared/conductor/types.ts';
import { FAUST as faustArgs } from '../../src/shared/faust-args.ts';

export interface RenderOptions {
  proc: FaustMonoOfflineProcessor;
  /** Program root name, e.g. "spike" — param paths are `/${root}/${param}`. */
  root: string;
  seconds: number;
  seed: number;
  /** Params applied before the first sample (staged, then latched at sample 0). */
  initialParams?: Record<string, number>;
  conductor?: Conductor<any>;
  /** Extra events scheduled up front (e.g. a test batch). */
  events?: ConductorEvent[];
  /** Signal trace: returns the conductor signals for a given bar. */
  signals?: (bar: number) => Record<string, number>;
  /** Which output channels to keep (default all). */
  channels?: number[];
}

export interface RenderResult {
  outputs: Float32Array[];
  sampleRate: number;
  decisions: DecisionLogEntry[];
  /** Bar index and first sample of the block in which the DSP reported it. */
  barStarts: { bar: number; sample: number }[];
}

export function renderOffline(opts: RenderOptions): RenderResult {
  const { proc, root, seconds, seed } = opts;
  const sr = faustArgs.sampleRate;
  const block = faustArgs.blockSize;
  const total = Math.ceil((seconds * sr) / block) * block;
  const nOut = proc.getNumOutputs();
  const keep = opts.channels ?? Array.from({ length: nOut }, (_, i) => i);
  const outputs = keep.map(() => new Float32Array(total));
  const addr = (p: string) => `/${root}/${p}`;

  // Live parameters travel as float32 AudioParams; quantise identically so both paths agree.
  const setP = (p: string, v: number) => proc.setParamValue(addr(p), Math.fround(v));
  setP(SYS.seed, seed);
  for (const [k, v] of Object.entries(opts.initialParams ?? {})) setP(k, v);

  const decisions: DecisionLogEntry[] = [];
  const queue = new CommitQueue({ set: setP }, (e) => decisions.push(e));
  if (opts.events?.length) queue.schedule(opts.events);

  let cState: ConductorState<any> | null = opts.conductor ? opts.conductor.init(seed) : null;
  let lastBar = -1;
  const barStarts: { bar: number; sample: number }[] = [];

  for (let pos = 0; pos < total; pos += block) {
    const chunk = proc.render([], block);
    for (let i = 0; i < keep.length; i++) outputs[i].set(chunk[keep[i]], pos);

    // Host-side reads after the block, as the live host does from bargraph messages.
    const bar = proc.getParamValue(addr(SYS.bar));
    const latched = proc.getParamValue(addr(SYS.latchedCommit));
    queue.onLatched(latched, bar);
    if (bar !== lastBar) {
      lastBar = bar;
      barStarts.push({ bar, sample: pos });
      if (opts.conductor && cState) {
        const res = opts.conductor.onBar(cState, {
          bar,
          audioSec: (pos + block) / sr,
          signals: opts.signals?.(bar) ?? {}
        });
        cState = res.state;
        if (res.events.length) queue.schedule(res.events);
      }
      queue.onBar(bar);
    }
  }
  return { outputs, sampleRate: sr, decisions, barStarts };
}

export function hashOutputs(outputs: Float32Array[]): string {
  const h = crypto.createHash('sha256');
  for (const ch of outputs) h.update(Buffer.from(ch.buffer, ch.byteOffset, ch.byteLength));
  return h.digest('hex');
}

/** 32-bit float WAV writer (interleaved). */
export function writeWav(file: string, outputs: Float32Array[], sampleRate: number): void {
  const nCh = outputs.length;
  const n = outputs[0].length;
  const dataBytes = n * nCh * 4;
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(3, 20); // IEEE float
  buf.writeUInt16LE(nCh, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * nCh * 4, 28);
  buf.writeUInt16LE(nCh * 4, 32);
  buf.writeUInt16LE(32, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataBytes, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nCh; c++) {
      buf.writeFloatLE(outputs[c][i], o);
      o += 4;
    }
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
}
