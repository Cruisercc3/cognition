// Render each variation at full texture through the real arranger and print the harness
// report (loudness, peaks, steps, width, tilt, bands, the moves made). For tuning rounds.
//   node tools/render/family-report.ts [ids,comma,separated | "" for all] [seconds] [wavDir]
import path from 'node:path';
import { compileDsp, createOffline, repoRoot } from '../dsp/faust-node.ts';
import { renderOffline, writeWav } from './render.ts';
import { paramTableFromMeta } from '../../src/shared/style/table.ts';
import { loadStyleDir, loadFamilyFile } from '../../src/shared/style/store-node.ts';
import { effectiveParams } from '../../src/shared/style/macros.ts';
import { makeArranger, startOwned } from '../../src/shared/conductor/arranger.ts';
import type { DeepWorkStyle } from '../../src/shared/style/schema.ts';
import { report } from '../harness/metrics.ts';

const dsp = await compileDsp('deepwork');
const table = paramTableFromMeta(dsp.json);
const { styles } = loadStyleDir(path.join(repoRoot, 'styles'), (p) => (p === 'deepwork' ? table : undefined));
const family = loadFamilyFile(path.join(repoRoot, 'styles/family.json'));
const byId = new Map(styles.filter((s) => s.program === 'deepwork').map((s) => [s.id, s as DeepWorkStyle]));
const ids = (process.argv[2] || family.order.join(',')).split(',');
const seconds = Number(process.argv[3] ?? 90);
const wavDir = process.argv[4];
const resolve = (s: DeepWorkStyle, owned: Record<string, number>) => effectiveParams(s, table, owned);

for (const id of ids) {
  const style = byId.get(id)!;
  const arranger = makeArranger({ family, getStyle: (x) => byId.get(x), resolve, startId: id, mode: 'fixed', introScale: 0 });
  const proc = await createOffline(dsp);
  const t0 = performance.now();
  const r = renderOffline({ proc, root: 'deepwork', seconds, seed: 21, initialParams: resolve(style, startOwned(style, 0)), conductor: arranger });
  const ms = performance.now() - t0;
  const rep = report(r.outputs.slice(0, 2), { skipSec: 10 });
  const f = (x: number) => x.toFixed(1);
  console.log(
    `${id.padEnd(12)} lufs=${f(rep.integratedLufs)} tp=${f(rep.truePeakDb)} lra=${f(rep.lra)} step=${f(rep.maxStStep.maxStep)} hiCorr=${rep.highCorrelation.toFixed(2)} tilt=${rep.tiltDbPerOct.toFixed(2)} onsets/min=${rep.onsetsPerMin.toFixed(0)} dev=${rep.deviants.length} speed=${(seconds / (ms / 1000)).toFixed(1)}x`
  );
  console.log(`             bands ${rep.bands.map((b) => `${b.hz}:${f(b.db)}`).join(' ')}`);
  console.log(`             moves ${r.decisions.map((d) => `${d.landedBar}:${d.note ?? d.ruleId}`).join(' | ')}`);
  if (wavDir) writeWav(path.join(repoRoot, wavDir, `${id}.wav`), r.outputs.slice(0, 2), r.sampleRate);
}
