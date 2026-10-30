import os from 'node:os';
import path from 'node:path';

const TEST_RUN = ['--selftest', '--e2e', '--shots'].some((f) => process.argv.includes(f));

export const repoRoot = path.resolve(import.meta.dirname, '..', '..');
export const rendererDir = path.join(repoRoot, 'out', 'renderer');
export const preloadPath = path.join(import.meta.dirname, '..', 'preload', 'index.cjs');
/** Test runs (--selftest, --e2e, --shots) pass COGNITION_DATA_DIR so real logs stay clean. */
export const dataDir =
  process.env.COGNITION_DATA_DIR || (TEST_RUN ? path.join(os.tmpdir(), 'cognition-test-data') : path.join(repoRoot, 'data'));
export const stylesDir = path.join(repoRoot, 'styles');
export const generatedStylesDir = path.join(dataDir, 'styles');
