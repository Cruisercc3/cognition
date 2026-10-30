// Node-side Faust helpers: one libfaust instance, our .lib files mounted into its
// in-memory filesystem, and the shared compile args from dsp/faust-args.json.
// Used by the precompile step (build-dsp.ts) and the offline renderer.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  instantiateFaustModuleFromFile,
  LibFaust,
  FaustCompiler,
  FaustMonoDspGenerator,
  type FaustMonoOfflineProcessor,
  type LooseFaustDspFactory
} from '@grame/faustwasm/dist/esm/index.js';
import { compileWasm } from '../../src/shared/wasm-node.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, '..', '..');
export const dspDir = path.join(repoRoot, 'dsp');

export { FAUST as faustArgs, type FaustArgs } from '../../src/shared/faust-args.ts';
import { FAUST as faustArgs } from '../../src/shared/faust-args.ts';

const MEMFS_LIB_DIR = '/cognition';

let compilerPromise: Promise<FaustCompiler> | null = null;

export function getCompiler(): Promise<FaustCompiler> {
  if (!compilerPromise) {
    compilerPromise = (async () => {
      const jsFile = path.join(
        repoRoot,
        'node_modules/@grame/faustwasm/libfaust-wasm/libfaust-wasm.js'
      );
      const module = await instantiateFaustModuleFromFile(jsFile);
      const compiler = new FaustCompiler(new LibFaust(module));
      return compiler;
    })();
  }
  return compilerPromise;
}

/** Copy every dsp/*.lib into the compiler's in-memory FS (fresh each call, so edits apply). */
function mountLibs(compiler: FaustCompiler): void {
  const memfs = compiler.fs();
  try {
    memfs.mkdir(MEMFS_LIB_DIR);
  } catch {
    // already exists
  }
  for (const f of fs.readdirSync(dspDir)) {
    if (f.endsWith('.lib')) {
      memfs.writeFile(`${MEMFS_LIB_DIR}/${f}`, fs.readFileSync(path.join(dspDir, f), 'utf8'));
    }
  }
}

export function compileArgString(): string {
  return [...faustArgs.args, '-I', MEMFS_LIB_DIR].join(' ');
}

export interface CompiledDsp {
  name: string;
  generator: FaustMonoDspGenerator;
  factory: LooseFaustDspFactory;
  wasm: Uint8Array;
  json: string;
  compileMs: number;
}

/** Compile dsp/<name>.dsp with the shared args. */
export async function compileDsp(name: string): Promise<CompiledDsp> {
  const code = fs.readFileSync(path.join(dspDir, `${name}.dsp`), 'utf8');
  return compileDspSource(name, code);
}

/** Compile Faust source text (tests use this for tiny probe programs). */
export async function compileDspSource(name: string, code: string): Promise<CompiledDsp> {
  const compiler = await getCompiler();
  mountLibs(compiler);
  const generator = new FaustMonoDspGenerator();
  const t0 = performance.now();
  const ok = await generator.compile(compiler, name, code, compileArgString());
  const compileMs = performance.now() - t0;
  if (!ok || !generator.factory) {
    throw new Error(`Faust compile failed for ${name}: ${compiler.getErrorMessage()}`);
  }
  const factory = generator.factory;
  return {
    name,
    generator,
    factory,
    wasm: factory.code as Uint8Array,
    json: factory.json,
    compileMs
  };
}

/** Load a precompiled program (wasm + json) produced by build-dsp.ts. */
export async function loadPrecompiled(wasm: Uint8Array<ArrayBuffer>, json: string): Promise<LooseFaustDspFactory> {
  const module = await compileWasm(wasm);
  return { module, json, code: wasm };
}

export async function createOffline(
  dsp: { generator?: FaustMonoDspGenerator; factory: LooseFaustDspFactory },
  blockSize = faustArgs.blockSize
): Promise<FaustMonoOfflineProcessor> {
  const generator = dsp.generator ?? new FaustMonoDspGenerator();
  const proc = await generator.createOfflineProcessor(faustArgs.sampleRate, blockSize, dsp.factory);
  if (!proc) throw new Error('createOfflineProcessor returned null');
  return proc;
}
