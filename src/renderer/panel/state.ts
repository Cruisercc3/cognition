import { useEffect, useRef, useState } from 'react';
import type { PanelCommand, PanelInit, ParamMeta, StatusUpdate } from '../../shared/ipc.ts';

export function send(cmd: PanelCommand): void {
  window.cog.send('panel:command', cmd);
}

/** Per-param rAF throttle so slider drags send at most one change per frame. */
const pending = new Map<string, number>();
let raf = 0;
export function sendParam(param: string, value: number): void {
  pending.set(param, value);
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    const params = Object.fromEntries(pending);
    pending.clear();
    send({ type: 'setParams', params });
  });
}

/** Param metadata of the engine the active style plays on (Pulse unless it is a Field style). */
export function usePanel(): { init: PanelInit | null; status: StatusUpdate | null; meta: Map<string, ParamMeta> } {
  const [init, setInit] = useState<PanelInit | null>(null);
  const [status, setStatus] = useState<StatusUpdate | null>(null);
  const byProgram = useRef(new Map<string, Map<string, ParamMeta>>());
  useEffect(() => {
    window.cog.invoke<PanelInit>('panel:init').then((i) => {
      const m = new Map<string, Map<string, ParamMeta>>();
      for (const p of i.params) {
        if (!m.has(p.program)) m.set(p.program, new Map());
        m.get(p.program)!.set(p.param, p);
      }
      byProgram.current = m;
      setInit(i);
    });
    return window.cog.on('status:update', (s: StatusUpdate) => setStatus(s));
  }, []);
  const program = status?.style?.program === 'field' ? 'field' : 'deepwork';
  return { init, status, meta: byProgram.current.get(program) ?? new Map() };
}

export function fmt(v: number | undefined, unit = '', step = 0.01): string {
  if (v === undefined || Number.isNaN(v)) return '–';
  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3;
  const s = Math.abs(v) >= 1000 ? Math.round(v).toString() : v.toFixed(Math.min(decimals, 3));
  return unit ? `${s}` : s;
}
