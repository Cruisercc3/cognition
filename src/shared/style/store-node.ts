// Node-side style file IO (main process, tools, tests).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { canonicalJson, validateStyle, type Style, type TableSource } from './schema.ts';
import { FamilySchema, type Family } from './family.ts';

export class StyleError extends Error {
  readonly errors: string[];
  constructor(file: string, errors: string[]) {
    super(`${file}: ${errors.join('; ')}`);
    this.errors = errors;
  }
}

export function loadStyleFile(file: string, tables?: TableSource): Style {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new StyleError(file, [`invalid JSON: ${(err as Error).message}`]);
  }
  const res = validateStyle(raw, tables);
  if (!res.ok) throw new StyleError(file, res.errors);
  return res.style;
}

/** Every *.style.json in a directory; a bad file is reported, never fatal to the others. */
export function loadStyleDir(dir: string, tables?: TableSource): { styles: Style[]; errors: Record<string, string[]> } {
  const styles: Style[] = [];
  const errors: Record<string, string[]> = {};
  for (const f of fs.readdirSync(dir).sort()) {
    if (!f.endsWith('.style.json')) continue;
    try {
      styles.push(loadStyleFile(path.join(dir, f), tables));
    } catch (err) {
      errors[f] = err instanceof StyleError ? err.errors : [String(err)];
    }
  }
  return { styles, errors };
}

export function loadFamilyFile(file: string): Family {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new StyleError(file, [`invalid JSON: ${(err as Error).message}`]);
  }
  const res = FamilySchema.safeParse(raw);
  if (!res.success) throw new StyleError(file, res.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`));
  return res.data;
}

export function saveStyleFile(file: string, style: Style): void {
  fs.writeFileSync(file, JSON.stringify(style, null, 2) + '\n');
}

export function styleHash(style: Style): string {
  return crypto.createHash('sha256').update(canonicalJson(style)).digest('hex').slice(0, 16);
}
