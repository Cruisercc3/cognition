// Live audio host: loads a precompiled Faust program, runs it in an AudioWorklet,
// routes only the two audio channels to the output, and delivers conductor batches
// through the shared CommitQueue (identical delivery logic to the offline renderer).
// One AudioContext for the app's life; the program (the live engine, or the frozen
// First Listen engine) can be swapped in place while the context is suspended or fading,
// so the output device and level path never change.

import { FaustMonoDspGenerator, type LooseFaustDspFactory } from '@grame/faustwasm/dist/esm/index.js';
import { CommitQueue } from '../../shared/commit-queue.ts';
import { SYS, type ConductorEvent, type DecisionLogEntry } from '../../shared/contract.ts';
import { FAUST } from '../../shared/faust-args.ts';

export interface HostCallbacks {
  onBar(program: string, bar: number, latchedCommit: number, audioTime: number): void;
  onLanded(entry: DecisionLogEntry): void;
}

export async function loadFactory(program: string): Promise<LooseFaustDspFactory> {
  const get = async (ext: string) => {
    const r = await fetch(`dsp/${program}.${ext}`);
    if (!r.ok) throw new Error(`fetch dsp/${program}.${ext}: ${r.status}`);
    return r;
  };
  const [wasm, json] = await Promise.all([get('wasm').then((r) => r.arrayBuffer()), get('json').then((r) => r.text())]);
  const module = await WebAssembly.compile(wasm);
  return { module, json, code: new Uint8Array(wasm) };
}

type FaustNode = NonNullable<Awaited<ReturnType<FaustMonoDspGenerator['createNode']>>>;
type SinkContext = AudioContext & { sinkId?: string; setSinkId?: (id: string) => Promise<void> };

export class AudioHost {
  program = '';
  readonly ctx: SinkContext;
  private factory: LooseFaustDspFactory | null = null;
  private factories = new Map<string, LooseFaustDspFactory>();
  private generator = new FaustMonoDspGenerator();
  private node: FaustNode | null = null;
  private wiring: AudioNode[] = [];
  private outGain: GainNode;
  private analyser: AnalyserNode;
  private queue: CommitQueue | null = null;
  private cb: HostCallbacks;
  bar = -1;
  latchedCommit = 0;
  loudnessDb = -120;
  gainReductionDb = 0;
  playing = false;
  engineAudible = true;

  constructor(cb: HostCallbacks) {
    this.cb = cb;
    this.ctx = new AudioContext({ sampleRate: FAUST.sampleRate, latencyHint: 'playback' }) as SinkContext;
    this.outGain = this.ctx.createGain();
    this.outGain.gain.value = 0;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
  }

  private addr(p: string): string {
    return `/${this.program}/${p}`;
  }

  async init(program: string): Promise<void> {
    await this.ctx.suspend();
    this.outGain.connect(this.ctx.destination);
    await this.useProgram(program);
  }

  /** Load (once) and switch to a program. The previous node is disconnected and destroyed. */
  async useProgram(program: string): Promise<void> {
    if (this.node && this.program === program) return;
    let factory = this.factories.get(program);
    if (!factory) {
      factory = await loadFactory(program);
      this.factories.set(program, factory);
    }
    const node = await this.generator.createNode(this.ctx, program, factory);
    if (!node) throw new Error(`createNode returned null for ${program}`);
    const old = this.node;
    const oldWiring = this.wiring;
    this.program = program;
    this.factory = factory;
    this.node = node;
    this.bar = -1;
    this.latchedCommit = 0;
    this.wiring = [];
    const nOut = node.getNumOutputs();
    if (nOut > 2) {
      const split = this.ctx.createChannelSplitter(nOut);
      const merge = this.ctx.createChannelMerger(2);
      node.connect(split);
      split.connect(merge, 0, 0);
      split.connect(merge, 1, 1);
      merge.connect(this.analyser);
      merge.connect(this.outGain);
      this.wiring = [split, merge];
    } else {
      node.connect(this.analyser);
      node.connect(this.outGain);
    }
    if (old) {
      old.disconnect();
      for (const n of oldWiring) n.disconnect();
      (old as unknown as { destroy?: () => void }).destroy?.();
    }

    const queue = new CommitQueue({ set: (p, v) => node.setParamValue(this.addr(p), v) }, (e) => this.cb.onLanded(e));
    this.queue = queue;

    const barAddr = this.addr(SYS.bar);
    const latchAddr = this.addr(SYS.latchedCommit);
    const loudAddr = this.addr('meter/loudness');
    const grAddr = this.addr('meter/gainReduction');
    node.setOutputParamHandler((path: string, value: number) => {
      if (this.node !== node || this.queue !== queue) return; // a replaced node's last messages
      if (path === latchAddr) {
        if (value !== this.latchedCommit) {
          this.latchedCommit = value;
          this.queue?.onLatched(value, this.bar);
        }
      } else if (path === barAddr) {
        if (value !== this.bar) {
          this.bar = value;
          this.cb.onBar(program, value, this.latchedCommit, this.ctx.currentTime);
          this.queue?.onBar(value);
        }
      } else if (path === loudAddr) this.loudnessDb = value;
      else if (path === grAddr) this.gainReductionDb = value;
    });
  }

  setParam(param: string, value: number): void {
    this.node?.setParamValue(this.addr(param), value);
  }

  schedule(events: ConductorEvent[]): void {
    this.queue?.schedule(events);
  }

  private fadeTo(target: number, sec: number): void {
    const t = this.ctx.currentTime;
    const g = this.outGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(target, t + Math.max(0.01, sec));
  }

  /** Start a session on a program: seed + every param as one immediate batch, then fade in. */
  async start(program: string, seed: number, params: Record<string, number>): Promise<void> {
    await this.useProgram(program);
    this.setParam(SYS.seed, seed);
    this.schedule([
      {
        applyAtBar: -1,
        immediate: true,
        rampSec: 0,
        ruleId: 'session.start',
        changes: Object.entries(params).map(([param, value]) => ({ param, value }))
      }
    ]);
    const ok = await Promise.race([this.ctx.resume().then(() => true), new Promise<boolean>((r) => setTimeout(() => r(false), 5000))]);
    if (!ok) throw new Error(`AudioContext did not resume (state ${this.ctx.state})`);
    // Chromium: setSinkId on a suspended context wedges resume(), so sink changes made
    // while suspended are applied here, after resume and before the fade-in.
    if (this.pendingSink !== null && this.ctx.setSinkId) {
      await this.ctx.setSinkId(this.pendingSink);
      this.pendingSink = null;
    }
    this.playing = true;
    if (this.engineAudible) this.fadeTo(1, 1.5);
  }

  /** Fade out, then suspend. */
  async stop(sec = 2.5): Promise<void> {
    this.fadeTo(0, sec);
    this.playing = false;
    await new Promise((r) => setTimeout(r, sec * 1000 + 100));
    if (!this.playing) await this.ctx.suspend();
  }

  /** A/B: fade the engine out/in without touching the DSP. */
  setEngineAudible(audible: boolean, sec = 1): void {
    this.engineAudible = audible;
    if (this.playing) this.fadeTo(audible ? 1 : 0, sec);
  }

  private pendingSink: string | null = null;

  async setSink(sinkId: string): Promise<void> {
    if (this.ctx.state === 'running' && this.ctx.setSinkId) await this.ctx.setSinkId(sinkId);
    else this.pendingSink = sinkId;
  }

  get sinkId(): string {
    return this.pendingSink ?? this.ctx.sinkId ?? '';
  }

  rms(): number {
    const buf = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buf);
    let s = 0;
    for (const v of buf) s += v * v;
    return Math.sqrt(s / buf.length);
  }

  setMuted(muted: boolean): void {
    this.outGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.outGain.gain.value = muted ? 0 : 1;
  }

  get pending(): number {
    return this.queue?.pendingCount ?? 0;
  }

  /** Render the same program in an OfflineAudioContext (for live-vs-offline parity). */
  async renderOfflineInBrowser(seconds: number, params: Record<string, number>): Promise<Float32Array[]> {
    const nOut = this.node?.getNumOutputs() ?? 2;
    const length = Math.round(seconds * FAUST.sampleRate);
    const octx = new OfflineAudioContext({ numberOfChannels: nOut, length, sampleRate: FAUST.sampleRate });
    const gen = new FaustMonoDspGenerator();
    if (!this.factory) throw new Error('no program loaded');
    const onode = await gen.createNode(octx, this.program, this.factory);
    if (!onode) throw new Error('offline createNode returned null');
    for (const [k, v] of Object.entries(params)) onode.setParamValue(this.addr(k), v, 0);
    onode.connect(octx.destination);
    const buf = await octx.startRendering();
    return Array.from({ length: nOut }, (_, i) => buf.getChannelData(i).slice());
  }
}
