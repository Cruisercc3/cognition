// Param table (ranges) derived from a compiled program's JSON description.

import type { ParamTable } from './schema.ts';

interface UiItem {
  type: string;
  address?: string;
  init?: number;
  min?: number;
  max?: number;
  step?: number;
  items?: UiItem[];
}

export function paramTableFromMeta(metaJson: string | { name: string; ui: UiItem[] }): ParamTable {
  const meta = typeof metaJson === 'string' ? JSON.parse(metaJson) : metaJson;
  const table: ParamTable = {};
  const walk = (items: UiItem[]) => {
    for (const it of items) {
      if (it.items) walk(it.items);
      else if (it.address && it.type !== 'hbargraph' && it.type !== 'vbargraph') {
        const key = it.address.replace(`/${meta.name}/`, '');
        table[key] = {
          min: it.min ?? (it.type === 'checkbox' ? 0 : 0),
          max: it.max ?? 1,
          init: it.init ?? 0,
          step: it.step
        };
      }
    }
  };
  walk(meta.ui);
  return table;
}
