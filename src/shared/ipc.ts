// IPC channel names and payloads. One place, so main, preload and renderers agree.

import type { ConductorEvent, DecisionLogEntry } from './contract.ts';
import type { Macros, Style } from './style/schema.ts';
import type { Selection, VariationInfo } from './style/family.ts';

/** renderer -> main (fire and forget) */
export const TO_MAIN = [
  'audio:ready',
  'audio:status',
  'audio:bar',
  'audio:landed',
  'audio:devices',
  'audio:sinkLost',
  'audio:error',
  'selftest:result',
  'panel:command'
] as const;

/** main -> renderer */
export const TO_RENDERER = ['audio:command', 'conductor:events', 'selftest:run', 'status:update', 'panel:focus'] as const;

/** renderer -> main (request/response) */
export const INVOKE = ['panel:init'] as const;

export type ToMainChannel = (typeof TO_MAIN)[number];
export type ToRendererChannel = (typeof TO_RENDERER)[number];
export type InvokeChannel = (typeof INVOKE)[number];

/** An AudioContext's state, spelled out so the main process can type it without the DOM lib. */
export type AudioState = 'suspended' | 'running' | 'closed' | 'interrupted';

export interface AudioReady {
  sampleRate: number;
  baseLatency: number;
  outputLatency: number;
  state: AudioState;
  program: string;
}

export interface AudioStatus {
  state: AudioState;
  playing: boolean;
  engineAudible: boolean;
  bar: number;
  latchedCommit: number;
  pending: number;
  rms: number;
  loudnessDb: number;
  gainReductionDb: number;
  sinkId: string;
}

export interface BarTick {
  /** The program whose bar clock this is (ticks from a replaced node are ignored). */
  program: string;
  bar: number;
  latchedCommit: number;
  audioTime: number;
}

export interface OutputDevice {
  deviceId: string;
  label: string;
}

export type AudioCommand =
  | { type: 'start'; program: string; seed: number; params: Record<string, number> }
  | { type: 'stop'; fadeSec: number }
  | { type: 'events'; events: ConductorEvent[] }
  | { type: 'ab'; engineAudible: boolean; fadeSec: number }
  | { type: 'setSink'; sinkId: string }
  | { type: 'enumerate' };

export type PanelCommand =
  | { type: 'play' }
  | { type: 'stop' }
  | { type: 'setParam'; param: string; value: number }
  | { type: 'setParams'; params: Record<string, number> }
  | { type: 'setMacro'; name: keyof Macros; value: number }
  | { type: 'ab' }
  | { type: 'saveStyle' }
  | { type: 'revertStyle' }
  | { type: 'snapshotSave'; slot: string }
  | { type: 'snapshotRecall'; slot: string }
  | { type: 'note'; text: string }
  | { type: 'check'; item: string; verdict: 'closer' | 'further' | 'same' }
  | { type: 'reference'; reference: Record<string, unknown> }
  | { type: 'setSink'; sinkId: string }
  | { type: 'setIntroScale'; value: number }
  | { type: 'milestone'; name: 'good-enough-to-work-to' | 'deep-work-accepted' }
  /** Choose a variation, or Auto (roam the family). Morphs while playing. */
  | { type: 'select'; selection: Selection }
  /** The one global Ambient (0) <-> Techno (1) slider; 0.5 = each variation as authored. */
  | { type: 'setPulse'; value: number }
  /** Volume trim in dB for the current output device (0 = calibrated level). */
  | { type: 'setVolume'; value: number };

export interface ParamMeta {
  /** The engine the param belongs to (deepwork = Pulse, field = Field). */
  program: string;
  param: string;
  group: string;
  name: string;
  type: string;
  min: number;
  max: number;
  step: number;
  init: number;
  unit: string;
}

export interface PanelInit {
  params: ParamMeta[];
  hotkeys: { action: string; accelerator: string; registered: boolean }[];
}

export interface SessionInfo {
  playing: boolean;
  seed: number;
  startedAt: string | null;
  sessionBar: number;
  phase: 'idle' | 'ramp-in' | 'body' | 'morph';
  /** The program playing (deepwork, or firstlisten for the frozen reference). */
  program: string;
  introScale: number;
  decisions: DecisionLogEntry[];
}

export interface StatusUpdate {
  audio: AudioStatus | null;
  session: SessionInfo;
  /** The family in picker order, then the frozen reference. */
  variations: VariationInfo[];
  /** The other engines' lines (Field), in main-screen order. */
  lines: { id: string; name: string; about: string }[];
  selection: Selection;
  /** The variation playing now (or that Play will start). */
  activeId: string;
  /** Set while a morph is under way. */
  morph: { fromId: string; toId: string } | null;
  /** Where the build stands (live engine only): the elements playing, out of how many. */
  build: { phase: 'build' | 'body' | 'ebb' | 'flow'; present: string[]; top: number } | null;
  pulse: number;
  /** Volume trim (dB) for the current output device. */
  volumeDb: number;
  style: Style | null;
  styleDirty: boolean;
  styleError: string | null;
  diskChanged: boolean;
  liveParams: Record<string, number>;
  devices: OutputDevice[];
  sinkId: string;
  reference: Record<string, unknown>;
  milestones: string[];
  hotkeys: { action: string; accelerator: string; registered: boolean }[];
}

export interface CogBridge {
  send(channel: ToMainChannel, data?: unknown): void;
  on(channel: ToRendererChannel, cb: (data: any) => void): () => void;
  invoke<T = unknown>(channel: InvokeChannel, data?: unknown): Promise<T>;
}
