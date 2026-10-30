// Style schema. A style is a parameter document over one program's address space, plus
// macros, an arrangement, the Sensory Guard and a non-mutable safety block.
//
// Three programs exist:
//  * deepwork    — the Pulse engine (schema v3): the Deeper Focus family and its studies.
//  * field       — the Field engine (schema v3): the beatless and tonal worlds (Drift, Bloom,
//                  Lattice). Same document shape and arranger as Pulse; its own address space.
//  * firstlisten — the frozen reference engine (schema v1): the First Listen sound, kept
//                  exactly as heard. Its styles are `frozen` and never edited.
//
// Files live in styles/*.style.json (canonical, in git) and data/styles/ (generated).

import { z } from 'zod';

export const SCHEMA_VERSION = 3;
export const PROGRAMS = ['deepwork', 'firstlisten', 'field'] as const;
export type Program = (typeof PROGRAMS)[number];
/** The live engines: their styles share the v3 document and the arranger. */
export const LIVE_PROGRAMS = ['deepwork', 'field'] as const;
export type LiveProgram = (typeof LIVE_PROGRAMS)[number];

const unit = z.number().min(0).max(1);

export const MacroSchema = z.object({
  /** Techno (1) <-> Ambient (0): kick/hat/perc level, onset density, transient sharpness. */
  pulse: unit.default(0.5),
  /** Stimulation: beat-locked AM depth and noise-bed level. */
  intensity: unit.default(0.5),
  /** Higher = darker: filter cutoffs of pad, stab, acid, hats, kick tone. */
  warmth: unit.default(0.5),
  /** Event density: hit probabilities and ghosts. */
  density: unit.default(0.5),
  /** Room, dub delay and stereo width. */
  space: unit.default(0.5),
  /** Harmonic complexity: fifths (low) .. style chord .. min9 (high); bass and acid motion. */
  tonality: unit.default(0.5)
});
export type Macros = z.infer<typeof MacroSchema>;
export const MACRO_NAMES = ['pulse', 'intensity', 'warmth', 'density', 'space', 'tonality'] as const;
export type MacroName = (typeof MACRO_NAMES)[number];

export const IntroStepSchema = z.object({
  atBar: z.number().int().min(1),
  rampBars: z.number().min(0).max(64),
  set: z.record(z.string(), z.number())
});

/** v1 arrangement — the frozen First Listen engine's conductor reads this. */
export const ArrangementV1Schema = z.object({
  start: z.record(z.string(), z.number()).default({}),
  intro: z.array(IntroStepSchema).default([]),
  reshuffleMinutes: z.number().min(3).max(15).default(8),
  variations: z.record(z.string(), z.array(z.number()).min(1)).default({}),
  drift: z.record(z.string(), z.tuple([z.number(), z.number()])).default({}),
  driftRampBars: z.number().min(1).max(128).default(16),
  budget: z
    .object({
      maxDiscretePerReshuffle: z.number().int().min(0).max(2).default(1),
      maxDriftPerReshuffle: z.number().int().min(0).max(3).default(1),
      minSecondsBetweenChanges: z.number().min(30).default(120)
    })
    .default({ maxDiscretePerReshuffle: 1, maxDriftPerReshuffle: 1, minSecondsBetweenChanges: 120 })
});

/**
 * Params that switch on the latch: patterns, octaves, tonal centre and mode, delay division,
 * the parts' and the bank's notes, the bloom's palette, the lattice's figure and rate,
 * mute/solo.
 */
const DISCRETE =
  /\/(mask|octave|root|chord|mode|dubDiv|sweepBars|mute|solo)$|^parts\/(low|inner1|inner2|top)$|^bank\/v[1-4]$|^bloom\/(span|scale|voices)$|^lattice\/(pattern|rate)$/;
export const isDiscreteParam = (k: string): boolean => DISCRETE.test(k);

/** Relative weights of the arranger's section moves. */
export const MovesSchema = z.object({
  /** Bring in one element of the build that is not playing (a slow fade). */
  add: z.number().min(0).default(0.2),
  /** Take one free element out (a slow fade); the foundation never leaves this way. */
  drop: z.number().min(0).default(0.15),
  /** Switch one discrete element (a pattern) to another of its listed values. */
  vary: z.number().min(0).default(0.25),
  /** Move one continuous value inside its band. */
  drift: z.number().min(0).default(0.3),
  /** Step one dimension one rung along its ladder (`arrangement.shifts`). */
  shift: z.number().min(0).default(0),
  /** Leave the section as it is. */
  rest: z.number().min(0).default(0.1)
});

/** One element of a variation's build: what it adds, and how slowly it fades in and out. */
export const RungSchema = z.object({
  /** A short name, shown while the variation builds ("pulse", "ticks", "glass"). */
  name: z.string().min(1),
  /** Values while the element plays (continuous params only); `arrangement.start` holds the values without it. */
  set: z.record(z.string(), z.number()),
  fadeBars: z.number().min(1).max(64).default(16)
});

/**
 * Build-up and addition. A session starts from nothing and adds elements one at a time:
 * the foundation (the first `fixed` elements, always in this order) within
 * `foundationMinutes`, the rest by `minutes`. Only `top` elements play at once, so the
 * free elements beyond it wait for a later cycle. Every so often the build breathes out —
 * one element at a time, newest first, down to `floor` — and builds back up in a new order.
 */
export const BuildSchema = z.object({
  rungs: z.array(RungSchema).min(1),
  fixed: z.number().int().min(0),
  top: z.number().int().min(1),
  foundationMinutes: z.number().min(0.5).max(10).default(3),
  minutes: z.number().min(1).max(60).default(12),
  /** How far below `top` the body may dip between tides (drop moves). */
  wobble: z.number().int().min(0).default(1),
  tide: z
    .object({
      everyMinutes: z.tuple([z.number().min(5), z.number().min(5)]),
      floor: z.number().int().min(0)
    })
    .nullable()
    .default(null)
});
export type Build = z.infer<typeof BuildSchema>;

/** v3 arrangement: a build, then one move per section inside the change budget. */
export const ArrangementSchema = z.object({
  /** Values of every element's params before it plays (e.g. layer `on` = 0). */
  start: z.record(z.string(), z.number()).default({}),
  build: BuildSchema,
  /** A section is the arranger's unit of time: at most one move per section. */
  sectionBars: z.number().int().min(8).max(512).default(32),
  moves: MovesSchema.default({ add: 0.2, drop: 0.15, vary: 0.25, drift: 0.3, shift: 0, rest: 0.1 }),
  /** Discrete params the arranger may switch between (one per move). */
  variations: z.record(z.string(), z.array(z.number()).min(1)).default({}),
  /** Continuous params the arranger may move within [lo, hi]. */
  drift: z.record(z.string(), z.tuple([z.number(), z.number()])).default({}),
  /** Ramp length for drift moves, in bars. */
  driftRampBars: z.number().min(1).max(128).default(16),
  /**
   * Ladders: the values a dimension can take, in order (the colour ladder of modes, the
   * lattice's phase offsets). A shift move steps one rung up or down. A discrete param
   * switches on the bar line (the engine crossfades the voices it moves); a continuous one
   * slides there over `shiftRampBars`.
   */
  shifts: z.record(z.string(), z.array(z.number()).min(2)).default({}),
  shiftRampBars: z.number().min(1).max(256).default(32),
  /** The change budget's floor: no two moves closer than this. */
  minSecondsBetweenChanges: z.number().min(20).default(40)
});
export type Arrangement = z.infer<typeof ArrangementSchema>;

/** Sensory Guard: absolute ceilings every style, macro and morph is clamped to. */
export const GuardSchema = z.object({
  ceilingDb: z.number().min(-60).max(-1).default(-18),
  maxMasterDb: z.number().min(-60).max(0).default(-6),
  maxKickDb: z.number().min(-60).max(0).default(-4),
  maxBassDb: z.number().min(-60).max(0).default(-3),
  maxHatDb: z.number().min(-60).max(0).default(-4),
  maxBrightnessDb: z.number().min(-40).max(0).default(-12),
  maxWidth: z.number().min(0).max(1.2).default(1.0)
});
export type Guard = z.infer<typeof GuardSchema>;

/** Non-mutable safety block (research: AM only 8–20 Hz, never >= 32 Hz; bounded depth). */
export const SafetySchema = z.object({
  amRateMinHz: z.literal(8),
  amRateMaxHz: z.literal(20),
  maxAmDepth: z.number().min(0).max(0.5)
});

export const SnapshotSchema = z.object({
  name: z.string(),
  params: z.record(z.string(), z.number()),
  macros: MacroSchema
});

/** The cognitive job a variation is tuned for. */
export const UseSchema = z.object({
  /** One word, from the plan's states where one fits (Settle, Read, Fuse, Deep…). */
  name: z.string().min(1),
  /** What it is for, in a line. */
  for: z.string().default(''),
  /** Why the sound fits that job: the mechanism, and how strong the evidence is. */
  why: z.string().default('')
});
export type Use = z.infer<typeof UseSchema>;

const base = {
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  name: z.string().min(1),
  /** One line for the variation picker. */
  tagline: z.string().default(''),
  description: z.string().default(''),
  use: UseSchema.optional(),
  /** A frozen style is a reference point: it plays, but is never edited or saved. */
  frozen: z.boolean().default(false),
  origin: z.enum(['authored', 'morph', 'mutation', 'merge', 'explore-bookmark']).default('authored'),
  parentIds: z.array(z.string()).default([]),
  /** Base values for low-level params (paths relative to the program root). */
  params: z.record(z.string(), z.number()),
  macros: MacroSchema.default({ pulse: 0.5, intensity: 0.5, warmth: 0.5, density: 0.5, space: 0.5, tonality: 0.5 }),
  guard: GuardSchema,
  safety: SafetySchema,
  snapshots: z.array(SnapshotSchema).default([])
};

export const DeepWorkStyleSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  program: z.literal('deepwork'),
  ...base,
  arrangement: ArrangementSchema
});

export const FieldStyleSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  program: z.literal('field'),
  ...base,
  arrangement: ArrangementSchema
});

export const FirstListenStyleSchema = z.object({
  schemaVersion: z.literal(1),
  program: z.literal('firstlisten'),
  ...base,
  arrangement: ArrangementV1Schema
});

export const StyleSchema = z.discriminatedUnion('program', [DeepWorkStyleSchema, FieldStyleSchema, FirstListenStyleSchema]);
export type Style = z.infer<typeof StyleSchema>;
/** A style of a live engine (Pulse or Field): the v3 document the arranger plays. */
export type LiveStyle = z.infer<typeof DeepWorkStyleSchema> | z.infer<typeof FieldStyleSchema>;
/** The name the arranger and the tests have always used; it covers every live engine. */
export type DeepWorkStyle = LiveStyle;
export const isLive = (s: Style): s is LiveStyle => s.program !== 'firstlisten';
export type FirstListenStyle = z.infer<typeof FirstListenStyleSchema>;

export interface ParamRange {
  min: number;
  max: number;
  init: number;
  step?: number;
}

export type ParamTable = Record<string, ParamRange>;
/** One table, or a lookup by program (styles of several programs in one place). */
export type TableSource = ParamTable | ((program: Program) => ParamTable | undefined);

/** Validate a parsed JSON value; also checks every param key against its program's table. */
export function validateStyle(raw: unknown, tables?: TableSource): { ok: true; style: Style } | { ok: false; errors: string[] } {
  const res = StyleSchema.safeParse(raw);
  if (!res.success) {
    return { ok: false, errors: res.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`) };
  }
  const style = res.data;
  const table = typeof tables === 'function' ? tables(style.program) : tables;
  if (table) {
    const errors: string[] = [];
    const check = (where: string, keys: string[]) => {
      for (const k of keys) if (!(k in table)) errors.push(`${where}: unknown param "${k}"`);
    };
    check('params', Object.keys(style.params));
    check('arrangement.start', Object.keys(style.arrangement.start));
    check('arrangement.variations', Object.keys(style.arrangement.variations));
    check('arrangement.drift', Object.keys(style.arrangement.drift));
    if (style.program !== 'firstlisten') check('arrangement.shifts', Object.keys(style.arrangement.shifts));
    if (style.program === 'firstlisten') {
      style.arrangement.intro.forEach((s, i) => check(`arrangement.intro[${i}]`, Object.keys(s.set)));
    } else {
      style.arrangement.build.rungs.forEach((r, i) => check(`arrangement.build.rungs[${i}]`, Object.keys(r.set)));
    }
    if (errors.length) return { ok: false, errors };
  }
  if (style.program !== 'firstlisten') {
    const errors = buildErrors(style.arrangement);
    if (errors.length) return { ok: false, errors };
  }
  return { ok: true, style };
}

/** A build must be playable: unique names, each param owned by one element, sane counts. */
function buildErrors(arr: Arrangement): string[] {
  const errors: string[] = [];
  const b = arr.build;
  const owner = new Map<string, string>();
  const names = new Set<string>();
  for (const r of b.rungs) {
    if (names.has(r.name)) errors.push(`arrangement.build: two elements named "${r.name}"`);
    names.add(r.name);
    for (const k of Object.keys(r.set)) {
      if (isDiscreteParam(k)) errors.push(`arrangement.build.${r.name}: "${k}" switches, it cannot fade`);
      if (owner.has(k)) errors.push(`arrangement.build: "${k}" is set by both "${owner.get(k)}" and "${r.name}"`);
      owner.set(k, r.name);
      if (!(k in arr.start)) errors.push(`arrangement.build.${r.name}: "${k}" has no value in arrangement.start`);
      if (k in arr.variations || k in arr.drift || k in arr.shifts) errors.push(`arrangement.build.${r.name}: "${k}" is also moved by the arranger`);
    }
  }
  if (b.fixed > b.top) errors.push('arrangement.build: the foundation (fixed) is larger than top');
  if (b.top > b.rungs.length) errors.push('arrangement.build: top is larger than the number of elements');
  if (b.minutes < b.foundationMinutes) errors.push('arrangement.build: minutes is shorter than foundationMinutes');
  if (b.wobble >= b.top) errors.push('arrangement.build: wobble must be below top');
  if (b.tide && b.tide.floor >= b.top) errors.push('arrangement.build.tide: floor must be below top');
  if (b.tide && b.tide.everyMinutes[0] > b.tide.everyMinutes[1]) errors.push('arrangement.build.tide: everyMinutes is [low, high]');
  for (const k of Object.keys(arr.shifts)) {
    if (k in arr.variations || k in arr.drift) errors.push(`arrangement.shifts: "${k}" is also varied or drifted`);
  }
  return errors;
}

/** Canonical JSON (sorted keys) for hashing. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
