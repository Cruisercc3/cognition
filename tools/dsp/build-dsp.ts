// Precompile every program in dsp/programs.json with the shared args.
// Output: src/renderer/public/dsp/<name>.wasm + <name>.json (git-ignored build artefacts),
// plus <name>.params.json listing every host-settable parameter (the generated half of
// the parameter contract).

import fs from 'node:fs';
import path from 'node:path';
import { compileDsp, dspDir, repoRoot } from './faust-node.ts';

interface UiItem {
  type: string;
  label: string;
  address?: string;
  init?: number;
  min?: number;
  max?: number;
  step?: number;
  meta?: Record<string, string>[];
  items?: UiItem[];
}

export interface ParamInfo {
  address: string;
  /** Path relative to the program root, e.g. "kick/level". */
  param: string;
  kind: 'input' | 'output';
  type: string;
  init?: number;
  min?: number;
  max?: number;
  step?: number;
  meta: Record<string, string>;
}

function collect(items: UiItem[], root: string, out: ParamInfo[]): void {
  for (const it of items) {
    if (it.items) {
      collect(it.items, root, out);
      continue;
    }
    if (!it.address) continue;
    const meta: Record<string, string> = {};
    for (const m of it.meta ?? []) Object.assign(meta, m);
    const isOutput = it.type === 'hbargraph' || it.type === 'vbargraph';
    out.push({
      address: it.address,
      param: it.address.replace(`/${root}/`, ''),
      kind: isOutput ? 'output' : 'input',
      type: it.type,
      init: it.init,
      min: it.min,
      max: it.max,
      step: it.step,
      meta
    });
  }
}

const outDir = path.join(repoRoot, 'src', 'renderer', 'public', 'dsp');

async function main(): Promise<void> {
  const programs: string[] = JSON.parse(fs.readFileSync(path.join(dspDir, 'programs.json'), 'utf8')).programs;
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of programs) {
    const c = await compileDsp(name);
    const meta = JSON.parse(c.json);
    const params: ParamInfo[] = [];
    collect(meta.ui, meta.name, params);
    fs.writeFileSync(path.join(outDir, `${name}.wasm`), c.wasm);
    fs.writeFileSync(path.join(outDir, `${name}.json`), c.json);
    fs.writeFileSync(path.join(outDir, `${name}.params.json`), JSON.stringify({ root: meta.name, params }, null, 2));
    console.log(
      `dsp: ${name} -> ${c.wasm.length} bytes wasm, ${params.length} params, ${meta.outputs} outputs, compiled in ${c.compileMs.toFixed(0)} ms`
    );
  }
}

await main();
