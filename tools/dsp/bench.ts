// Engine cost: render a style offline and report the share of one core it needs in real time.
//   node tools/dsp/bench.ts [styleId] [seconds] [--variant name]
// Variants rewrite the source in memory to show where the time goes (profiling only).

import fs from 'node:fs';
import path from 'node:path';
import { compileDsp, compileDspSource, createOffline, dspDir, repoRoot } from './faust-node.ts';
import { renderOffline } from '../render/render.ts';
import { loadStyleFile } from '../../src/shared/style/store-node.ts';
import { effectiveParams } from '../../src/shared/style/macros.ts';
import { fullOwned } from '../../src/shared/conductor/arranger.ts';

const args = process.argv.slice(2);
const vi = args.indexOf('--variant');
const variant = vi >= 0 ? args.splice(vi, 2)[1] : '';
const styleId = args[0] ?? 'low-light';
const seconds = Number(args[1] ?? 20);

const VARIANTS: Record<string, (src: string) => string> = {
  // every continuous control read at block rate: the ceiling for control-rate work
  'control-rate': (s) => s.replace('C(x) = rampTo(lt, rampSec, x);', 'C(x) = x;'),
  // held, not ramped: audio-rate still, so this isolates the cost of the ramp itself
  'held': (s) => s.replace('C(x) = rampTo(lt, rampSec, x);', 'C(x) = latched(lt, x);'),
  'no-room': (s) => s.replace(/re\.zita_rev1_stereo\([^)]*\)/, '(_, _)')
};

const style = loadStyleFile(path.join(repoRoot, 'styles', `${styleId}.style.json`));
if (style.program === 'firstlisten') throw new Error('bench a live style');
const program = style.program;
let dsp;
if (variant) {
  const fn = VARIANTS[variant];
  if (!fn) throw new Error(`unknown variant ${variant}`);
  const src = fs.readFileSync(path.join(dspDir, `${program}.dsp`), 'utf8');
  const out = fn(src);
  if (out === src) throw new Error(`variant ${variant} changed nothing`);
  dsp = await compileDspSource(program, out);
} else dsp = await compileDsp(program);

const proc = await createOffline(dsp);
const initialParams = effectiveParams(style, undefined, fullOwned(style));
const t0 = performance.now();
renderOffline({ proc, root: program, seconds, seed: 1, initialParams });
const ms = performance.now() - t0;
console.log(
  `${styleId} (${program}${variant ? `, ${variant}` : ''}): ${((ms / 1000 / seconds) * 100).toFixed(1)}% of one core, wasm ${dsp.wasm.length} bytes`
);
