// JSONL logs under data/: one file per day per stream, flushed per line.
// Streams: sessions (start/stop, decisions), feedback (notes), bench (checklist,
// reference records). Never keystroke content, never audio.

import fs from 'node:fs';
import path from 'node:path';
import { dataDir } from './paths.ts';

export type Stream = 'sessions' | 'feedback' | 'bench' | 'app';

function day(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function log(stream: Stream, entry: Record<string, unknown>): void {
  const dir = path.join(dataDir, stream);
  fs.mkdirSync(dir, { recursive: true });
  const line = JSON.stringify({ t: new Date().toISOString(), ...entry });
  fs.appendFileSync(path.join(dir, `${day()}.jsonl`), line + '\n');
}
