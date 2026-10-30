// Shared test fixture: every program compiled (Pulse, Field, the frozen reference), their
// param tables, the family and every style, and helpers to render a variation through the
// real arranger on its own engine.

import path from 'node:path';
import { compileDsp, createOffline, repoRoot, type CompiledDsp } from '../dsp/faust-node.ts';
import { renderOffline } from './render.ts';
import { paramTableFromMeta } from '../../src/shared/style/table.ts';
import { loadFamilyFile, loadStyleDir } from '../../src/shared/style/store-node.ts';
import { effectiveParams } from '../../src/shared/style/macros.ts';
import { makeArranger, startOwned, type ArrangerData, type ArrangerOptions } from '../../src/shared/conductor/arranger.ts';
import type { Conductor, ConductorState } from '../../src/shared/conductor/types.ts';
import type { DeepWorkStyle, ParamTable, Program, Style } from '../../src/shared/style/schema.ts';
import { walkFor, type Family } from '../../src/shared/style/family.ts';

export const stylesDir = path.join(repoRoot, 'styles');

/** The family order (ambient end first), read up front so tests can be made per variation. */
export const familyOrder: string[] = loadFamilyFile(path.join(stylesDir, 'family.json')).order;
/** The Deep Work studies (experiments outside the family line). */
export const studyIds: string[] = loadFamilyFile(path.join(stylesDir, 'family.json')).studies;
/** The Field engine's line (Drift, Bloom, Lattice), in Auto's order. */
export const fieldIds: string[] = loadFamilyFile(path.join(stylesDir, 'family.json')).lines.find((l) => l.id === 'field')?.order ?? [];

export interface Fixture {
  dsp: Record<Program, CompiledDsp>;
  tables: Record<Program, ParamTable>;
  family: Family;
  styles: Map<string, Style>;
  /** The Pulse engine's styles (the family and the studies). */
  deepwork: Map<string, DeepWorkStyle>;
  /** The Field engine's styles. */
  field: Map<string, DeepWorkStyle>;
  /** Any live style (Pulse or Field). */
  getStyle(id: string): DeepWorkStyle | undefined;
  resolve(style: DeepWorkStyle, owned: Record<string, number>): Record<string, number>;
}

let cached: Promise<Fixture> | null = null;

export function loadFixture(): Promise<Fixture> {
  if (!cached) {
    cached = (async () => {
      const dsp = { deepwork: await compileDsp('deepwork'), firstlisten: await compileDsp('firstlisten'), field: await compileDsp('field') };
      const tables = {
        deepwork: paramTableFromMeta(dsp.deepwork.json),
        firstlisten: paramTableFromMeta(dsp.firstlisten.json),
        field: paramTableFromMeta(dsp.field.json)
      };
      const { styles, errors } = loadStyleDir(stylesDir, (p) => tables[p]);
      if (Object.keys(errors).length) throw new Error(`style errors: ${JSON.stringify(errors)}`);
      const family = loadFamilyFile(path.join(stylesDir, 'family.json'));
      const all = new Map(styles.map((s) => [s.id, s]));
      const deepwork = new Map(styles.filter((s): s is DeepWorkStyle => s.program === 'deepwork').map((s) => [s.id, s]));
      const field = new Map(styles.filter((s): s is DeepWorkStyle => s.program === 'field').map((s) => [s.id, s]));
      return {
        dsp,
        tables,
        family,
        styles: all,
        deepwork,
        field,
        getStyle: (id: string) => deepwork.get(id) ?? field.get(id),
        resolve: (s: DeepWorkStyle, owned: Record<string, number>) => effectiveParams(s, tables[s.program], owned)
      };
    })();
  }
  return cached;
}

/** The arranger as the app runs it: walking the style's own line, inside its own engine. */
export function arrangerFor(fx: Fixture, startId: string, opts: Partial<ArrangerOptions> = {}): Conductor<ArrangerData> {
  const program = fx.getStyle(startId)?.program;
  const getStyle = (id: string) => {
    const s = fx.getStyle(id);
    return s && s.program === program ? s : undefined;
  };
  return makeArranger({ family: walkFor(fx.family, startId), getStyle, resolve: fx.resolve, startId, mode: 'fixed', introScale: 1, ...opts });
}

/** Wrap a conductor so a host action happens at a given session bar (e.g. a pick). */
export function withActionAt<S>(
  c: Conductor<S>,
  bar: number,
  act: (st: ConductorState<S>) => ConductorState<S>
): Conductor<S> {
  return {
    id: c.id,
    init: (seed) => c.init(seed),
    onBar: (st, inputs) => c.onBar(inputs.bar === bar ? act(st) : st, inputs)
  };
}

/** Render a variation through the arranger from its start state. */
export async function renderVariation(
  fx: Fixture,
  id: string,
  opts: { seconds: number; seed: number; introScale?: number; conductor?: Conductor<ArrangerData>; mode?: 'auto' | 'fixed' }
) {
  const style = fx.getStyle(id)!;
  const introScale = opts.introScale ?? 0;
  const proc = await createOffline(fx.dsp[style.program]);
  const conductor = opts.conductor ?? arrangerFor(fx, id, { introScale, mode: opts.mode ?? 'fixed' });
  return renderOffline({
    proc,
    root: style.program,
    seconds: opts.seconds,
    seed: opts.seed,
    initialParams: fx.resolve(style, startOwned(style, introScale)),
    conductor
  });
}
