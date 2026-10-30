// Small persistent settings file (data/settings.json).

import fs from 'node:fs';
import path from 'node:path';
import { dataDir } from './paths.ts';

export interface ReferenceRecord {
  endelEdition: string;
  slider: string;
  heartRateConnected: boolean;
  endelVolume: string;
  windowsVolume: string;
  fxSoundOff: boolean;
}

export interface Settings {
  /** Last variation played (Auto starts from the family's start instead). */
  styleId: string;
  /** 'auto' roams the family; otherwise a variation id. */
  selection: string;
  /** The global Ambient (0) <-> Techno (1) slider; 0.5 = each variation as authored. */
  pulse: number;
  sinkId: string;
  sinkLabel: string;
  /**
   * Volume trim (dB) per output device, on top of each variation's calibrated level:
   * the by-ear level match lives here. Capped by the Sensory Guard.
   */
  volumeDbByDevice: Record<string, number>;
  /** 1 = full ramp-in; 0 = start at full texture (useful while tuning). */
  introScale: number;
  reference: ReferenceRecord;
}

const DEFAULTS: Settings = {
  styleId: 'deep-work',
  selection: 'auto',
  pulse: 0.5,
  sinkId: '',
  sinkLabel: '',
  volumeDbByDevice: {},
  introScale: 1,
  reference: {
    endelEdition: 'Plastikman: Deeper Focus — Remastered & Reduced (2026)',
    slider: 'app default',
    heartRateConnected: false,
    endelVolume: '',
    windowsVolume: '',
    fxSoundOff: true
  }
};

const file = path.join(dataDir, 'settings.json');

export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { ...DEFAULTS, ...raw, reference: { ...DEFAULTS.reference, ...(raw.reference ?? {}) } };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function saveSettings(s: Settings): void {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(s, null, 2) + '\n');
}
