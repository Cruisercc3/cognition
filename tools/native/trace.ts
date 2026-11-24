// Record every parameter write the offline renderer makes (block index, path, value) and
// write the reference render, so a native build of the same engine can be fed the identical
// stream and null-tested against it. See docs/computation.md.
//   node tools/native/trace.ts [styleId] [seconds] [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { compileDsp, createOffline, repoRoot } from '../dsp/faust-node.ts';
import { renderOffline, writeWav } from '../render/render.ts';
import { loadStyleFile } from '../../src/shared/style/store-node.ts';
import { effectiveParams } from '../../src/shared/style/macros.ts';
import { fullOwned } from '../../src/shared/conductor/arranger.ts';

const [styleId = 'low-light', secs = '20', outDir = path.join(repoRoot, 'renders', 'native')] = process.argv.slice(2);
const seconds = Number(secs);
const style = loadStyleFile(path.join(repoRoot, 'styles', `${styleId}.style.json`));
const proc = await createOffline(await compileDsp(style.program));

let block = 0;
const lines: string[] = [];
const set = proc.setParamValue.bind(proc);
const render = proc.render.bind(proc);
proc.setParamValue = (p: string, v: number) => {
  lines.push(`${block} ${p} ${v}`);
  set(p, v);
};
proc.render = (...a: Parameters<typeof render>) => {
  const r = render(...a);
  block++;
  return r;
};

const t0 = performance.now();
const res = renderOffline({
  proc,
  root: style.program,
  seconds,
  seed: 1,
  initialParams: effectiveParams(style, undefined, fullOwned(style))
});
const ms = performance.now() - t0;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, `${styleId}.trace.txt`), lines.join('\n') + '\n');
writeWav(path.join(outDir, `${styleId}.wasm.wav`), res.outputs, res.sampleRate);
console.log(
  `${styleId} (${style.program}): ${lines.length} parameter writes over ${block} blocks; ` +
    `WebAssembly render ${((ms / 1000 / seconds) * 100).toFixed(1)}% of one core -> ${outDir}`
);
