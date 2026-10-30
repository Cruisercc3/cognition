// Silent self-test (`electron . --selftest` on a production build).
// Checks: live worklet runs and produces signal, bar ticks arrive, a bar-latched batch
// lands on its requested bar, zero CSP violations, output devices enumerate with labels,
// the browser's AudioWorklet render of Deep Work is bit-identical to the Node render, and
// the audio window can switch to the frozen First Listen engine and to the Field engine.

import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { FaustMonoDspGenerator } from '@grame/faustwasm/dist/esm/index.js';
import { renderOffline, hashOutputs } from '../../tools/render/render.ts';
import { effectiveParams } from '../shared/style/macros.ts';
import { compileWasm } from '../shared/wasm-node.ts';
import { startOwned } from '../shared/conductor/arranger.ts';
import { firstListenStartValues } from '../shared/conductor/firstlisten-conductor.ts';
import type { AudioReady } from '../shared/ipc.ts';
import type { SessionController } from './session.ts';
import { dataDir, rendererDir } from './paths.ts';

const PARITY_SECONDS = 3; // 144000 samples = 1125 blocks of 128
const PARITY_SEED = 4242;

interface Ctx {
  sendAudio(channel: string, data: unknown): void;
  controller: SessionController;
  consoleErrors: string[];
  info: AudioReady;
}

let ctx: Ctx | null = null;
let timer: NodeJS.Timeout | null = null;
let finished = false;
let parityParams: Record<string, number> = {};

export function runSelftest(c: Ctx): void {
  ctx = c;
  timer = setTimeout(() => void selftestResult({ error: "selftest timed out" }), 90_000);
  const style = c.controller.style;
  if (!style || style.program !== 'deepwork') {
    void selftestResult({ error: `no deepwork style: ${c.controller.styleError}` });
    return;
  }
  // full texture, no ramp-in, for deterministic parity
  parityParams = effectiveParams(style, undefined, startOwned(style, 0));
  const refId = c.controller.family.reference;
  const reference = refId ? c.controller.styleById(refId) : null;
  const referenceParams =
    reference && reference.program === 'firstlisten'
      ? effectiveParams(reference, undefined, firstListenStartValues(reference, { introScale: 0 }))
      : null;
  const fieldId = c.controller.family.lines[0]?.start;
  const field = fieldId ? c.controller.styleById(fieldId) : null;
  const fieldParams = field && field.program === 'field' ? effectiveParams(field, undefined, startOwned(field, 0)) : null;
  c.sendAudio('selftest:run', { paritySeconds: PARITY_SECONDS, paritySeed: PARITY_SEED, params: parityParams, referenceParams, fieldParams });
}

async function expectedParity() {
  const wasm = fs.readFileSync(path.join(rendererDir, 'dsp', 'deepwork.wasm'));
  const json = fs.readFileSync(path.join(rendererDir, 'dsp', 'deepwork.json'), 'utf8');
  const module = await compileWasm(wasm);
  const gen = new FaustMonoDspGenerator();
  const proc = await gen.createOfflineProcessor(48000, 128, { module, json, code: new Uint8Array(wasm) });
  const r = renderOffline({ proc, root: 'deepwork', seconds: PARITY_SECONDS, seed: PARITY_SEED, initialParams: parityParams });
  return { hash: hashOutputs(r.outputs), outputs: r.outputs };
}

export async function selftestResult(result: Record<string, unknown>): Promise<void> {
  if (finished) return;
  finished = true;
  if (timer) clearTimeout(timer);
  const report: Record<string, unknown> = {
    when: new Date().toISOString(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    audioReady: ctx?.info,
    ...result
  };
  const checks: Record<string, boolean> = {};
  try {
    const parity = result.parity as { hash: string; data: number[][] } | undefined;
    if (parity) {
      const exp = await expectedParity();
      let maxDiff = 0;
      parity.data.forEach((ch, c) => ch.forEach((v, i) => (maxDiff = Math.max(maxDiff, Math.abs(v - exp.outputs[c][48000 + i])))));
      report.parity = { browserHash: parity.hash, nodeHash: exp.hash, maxDiffAt1s: maxDiff };
      checks.parityBitIdentical = parity.hash === exp.hash;
    }
  } catch (err) {
    report.parityError = String(err);
  }
  const live = result as {
    contextState?: string;
    liveRms?: number;
    barTicks?: { before: number; after: number };
    batch?: { requested: number; landed: number } | null;
    cspViolations?: string[];
    devices?: string[];
    programSwitch?: { program: string; rms: number; barsBefore: number; barsAfter: number } | null;
    fieldSwitch?: { program: string; rms: number; barsBefore: number; barsAfter: number } | null;
    error?: string;
  };
  const consoleErrors = ctx?.consoleErrors ?? [];
  checks.noError = !live.error;
  checks.contextRunning = live.contextState === 'running';
  checks.workletProducesSignal = (live.liveRms ?? 0) > 1e-4;
  checks.barTicksArrive = !!live.barTicks && live.barTicks.after >= live.barTicks.before + 2;
  checks.batchLandsOnRequestedBar = !!live.batch && live.batch.landed === live.batch.requested;
  checks.zeroCspViolations = (live.cspViolations?.length ?? 1) === 0 && !consoleErrors.some((m) => /Content Security Policy|Refused to/i.test(m));
  checks.switchesToReferenceEngine =
    !!live.programSwitch &&
    live.programSwitch.program === 'firstlisten' &&
    live.programSwitch.rms > 1e-4 &&
    live.programSwitch.barsAfter > live.programSwitch.barsBefore;
  checks.switchesToFieldEngine =
    !!live.fieldSwitch && live.fieldSwitch.program === 'field' && live.fieldSwitch.rms > 1e-4 && live.fieldSwitch.barsAfter > live.fieldSwitch.barsBefore;
  checks.outputDevicesLabelled = !!live.devices && live.devices.length > 0 && live.devices.every((l) => l.length > 0);
  report.consoleErrors = consoleErrors;
  report.checks = checks;
  report.pass = Object.values(checks).every(Boolean);
  if (report.parity === undefined) delete (report as Record<string, unknown>).parity;
  fs.mkdirSync(path.join(dataDir, 'selftest'), { recursive: true });
  const out = path.join(dataDir, 'selftest', 'latest.json');
  const slim = { ...report };
  fs.writeFileSync(out, JSON.stringify(slim, null, 2));
  console.log(`SELFTEST ${report.pass ? 'PASS' : 'FAIL'} -> ${out}`);
  console.log(JSON.stringify(checks, null, 2));
  app.exit(report.pass ? 0 : 1);
}
