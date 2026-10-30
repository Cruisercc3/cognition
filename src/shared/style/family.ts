// The variation family: which styles make up the Deeper Focus family, in what order,
// and how Auto moves between them. Lives in styles/family.json.

import { z } from 'zod';

/**
 * A line of another engine's styles (the Field engine's worlds): ordered so that each
 * neighbour is one dimension away, with its own Auto. Auto never leaves a line; a pick in
 * another engine fades across.
 */
export const LineSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  name: z.string().min(1),
  /** One line for the main screen. */
  about: z.string().default(''),
  order: z.array(z.string()).min(1),
  start: z.string(),
  roamMinutes: z.tuple([z.number().min(3), z.number().max(120)]).default([12, 20]),
  morphBars: z.number().int().min(4).max(128).default(32)
});
export type Line = z.infer<typeof LineSchema>;

export const FamilySchema = z.object({
  /**
   * Variation ids from the ambient end to the techno end. Auto only ever moves to a
   * neighbour in this line, so each change of character is a small one.
   */
  order: z.array(z.string()).min(1),
  /** Auto (and the first session) starts here. */
  start: z.string(),
  /** Auto stays in a variation for a seeded time in this range, in minutes. */
  roamMinutes: z.tuple([z.number().min(3), z.number().max(120)]).default([10, 18]),
  /** A morph between variations takes this many bars. */
  morphBars: z.number().int().min(4).max(128).default(32),
  /**
   * Deep Work studies: experiments on Deep Work, each built around one finding about sound
   * and cognition. Picked on their own, never part of Auto (Auto from a study returns to
   * the family at its start).
   */
  studies: z.array(z.string()).default([]),
  /** The frozen reference variation (not part of Auto). */
  reference: z.string().optional(),
  /** Lines of the other engines (Field), each with its own Auto. */
  lines: z.array(LineSchema).default([])
});
export type Family = z.infer<typeof FamilySchema>;

/** Auto inside a line is selected as `auto:<line id>`; plain `auto` is the family's. */
export const autoOf = (lineId: string): string => `auto:${lineId}`;
export const lineOfAuto = (selection: string): string | null => (selection.startsWith('auto:') ? selection.slice(5) : null);

/**
 * The family-shaped view the arranger walks for a style: its line (order, start, timing) if
 * it belongs to one, otherwise the family itself.
 */
export function walkFor(family: Family, styleId: string): Family {
  const line = family.lines.find((l) => l.order.includes(styleId));
  if (!line) return family;
  return { ...family, order: line.order, start: line.start, roamMinutes: line.roamMinutes, morphBars: line.morphBars, studies: [] };
}

/** Where a variation sits on the main screen. */
export type VariationGroup = 'family' | 'study' | 'reference' | 'line';

/** What the panel shows for one variation. */
export interface VariationInfo {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** The cognitive job it is tuned for (absent on the reference). */
  use?: { name: string; for: string; why: string };
  frozen: boolean;
  program: string;
  group: VariationGroup;
  /** The line it belongs to (group 'line'). */
  line?: string;
}

export type Selection = 'auto' | string;
