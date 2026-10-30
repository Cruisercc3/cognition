// Macro mapping and clamping: style (base params + macros) -> effective DSP params.
// Macros are offsets around a neutral 0.5 (0.5 = the style exactly as authored).
// Order: base -> macros -> DSP ranges -> Sensory Guard -> safety -> pre-calibration ceiling.

import type { Macros, ParamTable, Style } from './schema.ts';

export type Params = Record<string, number>;

/** Until the user calibrates their output, the output ceiling cannot exceed this. */
export const PRE_CALIBRATION_CEILING_DB = -18;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** -1 .. +1 around the neutral point. */
const bip = (m: number) => (m - 0.5) * 2;

function applyMacros(p: Params, m: Macros): void {
  const add = (k: string, d: number) => {
    if (k in p) p[k] += d;
  };
  const mul = (k: string, f: number) => {
    if (k in p) p[k] *= f;
  };

  // Pulse: ambient (0) .. techno (1)
  const pu = bip(m.pulse);
  const pulseDb = pu < 0 ? pu * 30 : pu * 3; // -30 dB at the ambient pole, +3 dB at the techno pole
  add('kick/level', pulseDb);
  add('hats/level', pulseDb);
  add('ohat/level', pulseDb);
  add('clap/level', pulseDb);
  add('perc/level', pu < 0 ? pu * 30 : pu * 2);
  add('sub/level', pu < 0 ? pu * 6 : 0);
  add('acid/level', pu < 0 ? pu * 14 : pu * 2);
  // toward the ambient pole the pad, the room and the variation's own ambience open up a little
  if (pu < 0 && 'acid/level' in p) {
    for (const k of ['pad/level', 'series/level', 'parts/level', 'veil/level']) add(k, -pu * 3);
    mul('space/room', 1 - pu * 0.6);
    for (const k of ['rain/level', 'sea/level', 'light/level', 'glass/level', 'hum/level']) add(k, -pu * 3);
  }
  mul('hats/ghost', pu < 0 ? 1 + pu : 1 + pu);
  const soften = pu < 0 ? 1 + -pu * 3 : 1 - pu * 0.3; // attacks: softer toward ambient
  mul('kick/attack', soften);
  mul('hats/attack', soften);
  // In the Field engine the same dial reads as stillness (Ambient) .. motion (Techno): the
  // bloom's loops slow down or quicken, the lattice thins out; nothing gets louder.
  if ('bloom/every' in p) {
    mul('bloom/every', pu < 0 ? 1 - pu * 0.8 : 1 - pu * 0.35);
    mul('lattice/density', pu < 0 ? 1 + pu * 0.5 : 1);
    add('lattice/level', pu < 0 ? pu * 4 : 0);
  }

  // Intensity: beat-locked AM depth and noise-bed level (manual stimulation)
  const it = bip(m.intensity);
  add('beta/depth', it > 0 ? it * 0.3 : 0);
  if (it > 0 && 'noise/level' in p) p['noise/level'] = Math.max(p['noise/level'], -46 + it * 16);
  if (it < 0) mul('beta/depth', 1 + it);

  // Warmth: higher = darker
  const wf = Math.pow(2, -bip(m.warmth)); // 0.5x .. 2x
  mul('pad/bright', wf);
  mul('stab/cutoff', wf);
  mul('acid/cutoff', Math.pow(wf, 0.7));
  mul('ohat/bright', Math.pow(wf, 0.4));
  mul('kick/tone', Math.pow(wf, 0.6));
  mul('hats/bright', Math.pow(wf, 0.4));

  // Density: probabilities and ghosts
  const df = Math.pow(2, bip(m.density)); // 0.5x .. 2x
  for (const k of ['sub/prob', 'sub/ghost', 'hats/ghost', 'stab/prob', 'perc/prob', 'ohat/prob', 'acid/ghost']) mul(k, df);

  // Space: room, dub, width
  const sp = bip(m.space);
  const sf = Math.pow(2, sp);
  mul('space/room', sf);
  mul('space/dubMix', sf);
  add('space/width', sp * 0.2);

  // Tonality: fifths .. as authored .. min9; bass motion
  const to = bip(m.tonality);
  if ('tonal/chord' in p) {
    if (to < -0.5) p['tonal/chord'] = 3;
    else if (to > 0.5) p['tonal/chord'] = 1;
  }
  mul('sub/motion', Math.pow(2, to));
  mul('acid/motion', Math.pow(2, to));
}

function applyGuard(p: Params, style: Style): void {
  const g = style.guard;
  const cap = (k: string, hi: number) => {
    if (k in p) p[k] = Math.min(p[k], hi);
  };
  cap('master/level', g.maxMasterDb);
  cap('kick/level', g.maxKickDb);
  cap('sub/level', g.maxBassDb);
  cap('hats/level', g.maxHatDb);
  cap('ohat/level', g.maxHatDb);
  cap('space/width', g.maxWidth);
  p['guard/maxBrightness'] = Math.min(p['guard/maxBrightness'] ?? g.maxBrightnessDb, g.maxBrightnessDb);
  p['guard/ceiling'] = Math.min(g.ceilingDb, PRE_CALIBRATION_CEILING_DB);
  // safety block
  cap('beta/depth', style.safety.maxAmDepth);
}

/**
 * Effective params for a style. `overrides` are applied after macros (arrangement-owned
 * values such as layer `on` gains) and are still clamped by ranges, guard and safety.
 */
export function effectiveParams(style: Style, table?: ParamTable, overrides: Params = {}): Params {
  const p: Params = { ...style.params };
  applyMacros(p, style.macros);
  Object.assign(p, overrides);
  if (table) {
    for (const k of Object.keys(p)) {
      const r = table[k];
      if (r) p[k] = clamp(p[k], r.min, r.max);
    }
  } else {
    for (const k of ['hats/ghost', 'sub/prob', 'sub/ghost', 'stab/prob', 'perc/prob', 'kick/prob', 'hats/prob', 'ohat/prob', 'acid/ghost', 'acid/prob']) {
      if (k in p) p[k] = clamp(p[k], 0, 1);
    }
  }
  applyGuard(p, style);
  return p;
}

/** Changes between two param sets (only keys whose value differs). */
export function diffParams(prev: Params, next: Params): Params {
  const d: Params = {};
  for (const [k, v] of Object.entries(next)) if (prev[k] !== v) d[k] = v;
  return d;
}
