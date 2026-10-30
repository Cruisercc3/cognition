// Render a program offline and print the harness report.
//   node tools/render/cli.ts [program] [seconds] [seed] [--wav out.wav] [--style styles/deep-work.style.json]
//   [--set param=value ...] [--skip seconds] [--intro 1|0.5|0] [--auto 1]
// A live style (Pulse or Field) runs under the arranger on its own engine (fixed, or Auto
// with --auto 1, walking its own line); the frozen first-listen style runs under its own
// conductor on the firstlisten program. With --style, the program follows the style.

import path from 'node:path';
import fs from 'node:fs';
import { compileDsp, createOffline, repoRoot } from '../dsp/faust-node.ts';
import { renderOffline, writeWav, hashOutputs } from './render.ts';
import { report } from '../harness/metrics.ts';

const argv = process.argv.slice(2);
const flags = new Map<string, string[]>();
const positional: string[] = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    const k = argv[i].slice(2);
    const v = argv[i + 1];
    flags.set(k, [...(flags.get(k) ?? []), v]);
    i++;
  } else positional.push(argv[i]);
}
let program = positional[0] ?? 'deepwork';
const seconds = Number(positional[1] ?? 60);
const seed = Number(positional[2] ?? 1);

const initialParams: Record<string, number> = {};
for (const kv of flags.get('set') ?? []) {
  const [k, v] = kv.split('=');
  initialParams[k] = Number(v);
}

let conductor;
const stylePath = flags.get('style')?.[0];
const introScale = Number(flags.get('intro')?.[0] ?? 1);
if (stylePath) {
  const { loadStyleFile, loadStyleDir, loadFamilyFile } = await import('../../src/shared/style/store-node.ts');
  const { effectiveParams } = await import('../../src/shared/style/macros.ts');
  const style = loadStyleFile(path.resolve(stylePath));
  if (style.program === 'firstlisten') {
    const { makeFirstListenConductor, firstListenStartValues } = await import('../../src/shared/conductor/firstlisten-conductor.ts');
    Object.assign(initialParams, effectiveParams(style, undefined, firstListenStartValues(style, { introScale })), { ...initialParams });
    conductor = makeFirstListenConductor(style, { introScale });
  } else {
    const { makeArranger, startOwned } = await import('../../src/shared/conductor/arranger.ts');
    const dir = path.join(repoRoot, 'styles');
    const family = loadFamilyFile(path.join(dir, 'family.json'));
    const { walkFor } = await import('../../src/shared/style/family.ts');
    const live = style;
    program = live.program;
    const all = new Map(loadStyleDir(dir).styles.filter((s) => s.program === live.program).map((s) => [s.id, s]));
    all.set(live.id, live);
    const getStyle = (id: string) => {
      const s = all.get(id);
      return s && s.program === live.program ? s : undefined;
    };
    Object.assign(initialParams, effectiveParams(style, undefined, startOwned(style, introScale)), { ...initialParams });
    conductor = makeArranger({
      family: walkFor(family, style.id),
      getStyle,
      resolve: (s, owned) => effectiveParams(s, undefined, owned),
      startId: style.id,
      mode: flags.get('auto')?.[0] === '1' ? 'auto' : 'fixed',
      introScale
    });
  }
}

const t0 = performance.now();
const dsp = await compileDsp(program);
const proc = await createOffline(dsp);
const t1 = performance.now();
const r = renderOffline({ proc, root: program, seconds, seed, initialParams, conductor });
const t2 = performance.now();
const stereo = r.outputs.slice(0, 2);
const rep = report(stereo, { skipSec: Number(flags.get('skip')?.[0] ?? 0) });

console.log(`program=${program} seconds=${seconds} seed=${seed} compile=${(t1 - t0).toFixed(0)}ms render=${(t2 - t1).toFixed(0)}ms (${(seconds / ((t2 - t1) / 1000)).toFixed(1)}x realtime)`);
console.log(`hash=${hashOutputs(stereo).slice(0, 16)} decisions=${r.decisions.length}`);
console.log(JSON.stringify({ ...rep, bands: rep.bands.map((b) => `${b.hz}:${b.db.toFixed(1)}`).join(' '), deviants: rep.deviants.slice(0, 5) }, (_k, v) => (typeof v === "number" ? Math.round(v * 100) / 100 : v), 1));
for (const d of r.decisions.slice(0, 40)) console.log(`  bar ${d.landedBar} (req ${d.requestedBar}) ${d.ruleId} ramp=${d.rampSec}s ${d.changes.map((c) => `${c.param}=${Math.round(c.value * 1000) / 1000}`).join(' ')}`);

const wav = flags.get('wav')?.[0];
if (wav) {
  const out = path.resolve(repoRoot, wav);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  writeWav(out, stereo, r.sampleRate);
  console.log(`wrote ${out}`);
}
