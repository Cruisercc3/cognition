// Hidden audio window entry. Lives as long as the app; no React, no UI.

import { AudioHost } from './engine-host.ts';
import type { AudioCommand, AudioStatus, OutputDevice } from '../../shared/ipc.ts';
import type { DecisionLogEntry } from '../../shared/contract.ts';

/** The program loaded at boot; sessions may switch (e.g. to the frozen firstlisten engine). */
const BOOT_PROGRAM = 'deepwork';
const cog = window.cog;

const cspViolations: string[] = [];
document.addEventListener('securitypolicyviolation', (e) => {
  cspViolations.push(`${e.violatedDirective} blocked ${e.blockedURI}`);
});

let host: AudioHost | null = null;
const landed: DecisionLogEntry[] = [];
let devices: OutputDevice[] = [];

function status(): AudioStatus | null {
  if (!host) return null;
  return {
    state: host.ctx.state,
    playing: host.playing,
    engineAudible: host.engineAudible,
    bar: host.bar,
    latchedCommit: host.latchedCommit,
    pending: host.pending,
    rms: host.rms(),
    loudnessDb: host.loudnessDb,
    gainReductionDb: host.gainReductionDb,
    sinkId: host.sinkId
  };
}

async function enumerate(): Promise<void> {
  const all = await navigator.mediaDevices.enumerateDevices();
  devices = all.filter((d) => d.kind === 'audiooutput').map((d) => ({ deviceId: d.deviceId, label: d.label }));
  cog.send('audio:devices', devices);
  // Lost the pinned output (unplugged, BT switch): fade and hold. Never resume at
  // level on a different device.
  if (host && host.playing && host.sinkId && !devices.some((d) => d.deviceId === host!.sinkId)) {
    await host.stop(1.5);
    cog.send('audio:sinkLost', host.sinkId);
  }
}

async function boot(): Promise<void> {
  host = new AudioHost({
    onBar: (program, bar, latchedCommit, audioTime) => cog.send('audio:bar', { program, bar, latchedCommit, audioTime }),
    onLanded: (entry) => {
      landed.push(entry);
      if (landed.length > 500) landed.shift();
      cog.send('audio:landed', entry);
    }
  });
  await host.init(BOOT_PROGRAM);
  navigator.mediaDevices.addEventListener('devicechange', () => void enumerate());
  await enumerate();
  cog.send('audio:ready', {
    sampleRate: host.ctx.sampleRate,
    baseLatency: host.ctx.baseLatency,
    outputLatency: host.ctx.outputLatency,
    state: host.ctx.state,
    program: host.program
  });
  setInterval(() => cog.send('audio:status', status()), 500);
}

cog.on('audio:command', async (cmd: AudioCommand) => {
  if (!host) return;
  try {
    if (cmd.type === 'start') await host.start(cmd.program, cmd.seed, cmd.params);
    else if (cmd.type === 'stop') await host.stop(cmd.fadeSec);
    else if (cmd.type === 'events') host.schedule(cmd.events);
    else if (cmd.type === 'ab') host.setEngineAudible(cmd.engineAudible, cmd.fadeSec);
    else if (cmd.type === 'setSink') await host.setSink(cmd.sinkId);
    else if (cmd.type === 'enumerate') await enumerate();
  } catch (err) {
    cog.send('audio:error', String(err instanceof Error ? err.message : err));
  }
});

cog.on('conductor:events', (events) => host?.schedule(events));

// ---------------------------------------------------------------------------------
// Self-test (silent: output gain stays 0, signal is measured pre-gain)
// ---------------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sha256(chans: Float32Array[]): Promise<string> {
  const total = chans.reduce((n, c) => n + c.byteLength, 0);
  const all = new Uint8Array(total);
  let o = 0;
  for (const c of chans) {
    all.set(new Uint8Array(c.buffer, c.byteOffset, c.byteLength), o);
    o += c.byteLength;
  }
  const d = await crypto.subtle.digest('SHA-256', all);
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}

cog.on(
  'selftest:run',
  async (opts: {
    paritySeconds: number;
    paritySeed: number;
    params: Record<string, number>;
    referenceParams: Record<string, number> | null;
    fieldParams: Record<string, number> | null;
  }) => {
    const result: Record<string, unknown> = {};
    try {
      if (!host) throw new Error('host not ready');
      host.engineAudible = false; // silent
      await host.start(BOOT_PROGRAM, 777, { ...opts.params, 'kick/on': 1, 'sub/on': 1, 'pad/on': 1, 'hats/on': 1 });
      host.setMuted(true);
      await sleep(1500);
      result.contextState = host.ctx.state;
      result.sampleRate = host.ctx.sampleRate;
      result.baseLatency = host.ctx.baseLatency;
      result.liveRms = host.rms();
      result.meters = { loudnessDb: host.loudnessDb, gainReductionDb: host.gainReductionDb };

      const barsBefore = host.bar;
      await sleep(4300);
      result.barTicks = { before: barsBefore, after: host.bar };

      const want = host.bar + 2;
      const nBefore = landed.length;
      host.schedule([
        {
          applyAtBar: want,
          rampSec: 4,
          ruleId: 'selftest.batch',
          changes: [
            { param: 'hats/mask', value: 21845 },
            { param: 'pad/bright', value: 800 }
          ]
        }
      ]);
      for (let i = 0; i < 60 && !landed.slice(nBefore).some((e) => e.ruleId === 'selftest.batch'); i++) await sleep(100);
      const entry = landed.slice(nBefore).find((e) => e.ruleId === 'selftest.batch');
      result.batch = entry ? { requested: entry.requestedBar, landed: entry.landedBar } : null;

      result.devices = devices.map((d) => d.label);

      const chans = await host.renderOfflineInBrowser(opts.paritySeconds, { seed: opts.paritySeed, ...opts.params });
      result.parity = {
        hash: await sha256(chans),
        channels: chans.length,
        length: chans[0].length,
        data: chans.map((c) => Array.from(c.subarray(48000, 48000 + 4096)))
      };

      // switch to the frozen reference engine in place, still silent
      if (opts.referenceParams) {
        await host.start('firstlisten', 779, opts.referenceParams);
        host.setMuted(true);
        const barsBefore = host.bar;
        await sleep(4500);
        result.programSwitch = { program: host.program, rms: host.rms(), barsBefore, barsAfter: host.bar };
      }
      // and to the Field engine (its start style at full texture; slow bars, so a longer wait)
      if (opts.fieldParams) {
        await host.start('field', 781, opts.fieldParams);
        host.setMuted(true);
        const barsBefore = host.bar;
        await sleep(9000);
        result.fieldSwitch = { program: host.program, rms: host.rms(), barsBefore, barsAfter: host.bar };
      }
      await host.stop(0.05);
    } catch (err) {
      result.error = String(err instanceof Error ? err.stack ?? err.message : err);
    }
    result.cspViolations = cspViolations;
    cog.send('selftest:result', result);
  }
);

boot().catch((err) => cog.send('audio:error', String(err instanceof Error ? err.stack ?? err.message : err)));
