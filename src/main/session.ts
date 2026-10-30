// Session controller (main process): owns the variation family and its working styles,
// the conductor for the session (the arranger, or the frozen First Listen conductor),
// live parameters, the Bench, and the logs. Talks to the audio window only through
// AudioCommand messages and conductor events.

import fs from 'node:fs';
import path from 'node:path';
import type { ConductorEvent, DecisionLogEntry } from '../shared/contract.ts';
import type { AudioStatus, BarTick, OutputDevice, PanelCommand, SessionInfo, StatusUpdate } from '../shared/ipc.ts';
import { freshSeed } from '../shared/prng.ts';
import { effectiveParams, diffParams, type Params } from '../shared/style/macros.ts';
import { isLive, type DeepWorkStyle, type ParamTable, type Program, type Style } from '../shared/style/schema.ts';
import { lineOfAuto, walkFor, type Family, type VariationGroup, type VariationInfo } from '../shared/style/family.ts';
import { loadFamilyFile, loadStyleDir, saveStyleFile, styleHash } from '../shared/style/store-node.ts';
import {
  arrangerPhase,
  buildView,
  makeArranger,
  requestVariation,
  setArrangerMode,
  startOwned,
  type ArrangerData
} from '../shared/conductor/arranger.ts';
import { firstListenStartValues, makeFirstListenConductor, type FirstListenData } from '../shared/conductor/firstlisten-conductor.ts';
import type { Conductor, ConductorState } from '../shared/conductor/types.ts';
import { log } from './logger.ts';
import { loadSettings, saveSettings, type Settings } from './settings.ts';
import { dataDir, stylesDir } from './paths.ts';

/** Ramp for manual (Workshop/macro) changes: fast, but never a click. */
const MANUAL_RAMP_SEC = 0.15;
/** Ramp for the main-screen sliders (Ambient <-> Techno, volume). */
const SLIDER_RAMP_SEC = 0.4;
/** Ramp when a style file is hot-reloaded from disk. */
const RELOAD_RAMP_SEC = 1.5;
/** Fade used when a pick needs a different engine (Pulse, Field, or the frozen reference). */
const SWITCH_FADE_SEC = 0.8;

export interface SessionDeps {
  tables: Record<Program, ParamTable>;
  sendAudio(cmd: unknown): void;
  sendEvents(events: ConductorEvent[]): void;
  appGitSha: string;
  onChange(): void;
  setKeepAwake(on: boolean): void;
}

export class SessionController {
  private deps: SessionDeps;
  settings: Settings;
  family: Family = { order: ['deep-work'], start: 'deep-work', roamMinutes: [10, 18], morphBars: 32, studies: [], lines: [] };
  /** Working copies (Studio edits land here until saved). */
  private styles = new Map<string, Style>();
  /** The styles as last loaded/saved from disk (for dirty tracking and revert). */
  private diskStyles = new Map<string, Style>();
  styleError: string | null = null;
  /** The active file changed on disk while it had unsaved edits (never overwritten silently). */
  diskChanged = false;
  /** The variation playing now, or the one Play will start. */
  activeId = 'deep-work';
  /** Program of the current (or last) session; the audio window has this program loaded. */
  program: Program = 'deepwork';
  private audioProgram: string | null = null;
  private arranger: Conductor<ArrangerData> | null = null;
  private aState: ConductorState<ArrangerData> | null = null;
  private flConductor: Conductor<FirstListenData> | null = null;
  private flState: ConductorState<FirstListenData> | null = null;
  liveParams: Params = {};
  /** Session-only tuning aids (mute/solo): never written into a style. */
  private sessionOverrides: Params = {};
  audio: AudioStatus | null = null;
  devices: OutputDevice[] = [];
  playing = false;
  seed = 0;
  startedAt: string | null = null;
  /** DSP bar index that is session bar 0. */
  private startBar = 0;
  private lastDspBar = -1;
  decisions: DecisionLogEntry[] = [];
  milestones: string[] = [];
  private audioReady = false;
  private restartTimer: NodeJS.Timeout | null = null;

  constructor(deps: SessionDeps) {
    this.deps = deps;
    this.settings = loadSettings();
    this.loadAll();
    this.activeId = this.selectionStartId();
    this.milestones = this.readMilestones();
  }

  // --- styles -------------------------------------------------------------------------

  private tableFor(program: Program): ParamTable {
    return this.deps.tables[program];
  }

  private loadAll(): void {
    const errors: string[] = [];
    try {
      this.family = loadFamilyFile(path.join(stylesDir, 'family.json'));
    } catch (err) {
      errors.push(`family.json: ${String(err)}`);
    }
    const { styles, errors: fileErrors } = loadStyleDir(stylesDir, (p) => this.tableFor(p));
    for (const s of styles) {
      this.styles.set(s.id, structuredClone(s));
      this.diskStyles.set(s.id, structuredClone(s));
    }
    for (const [f, e] of Object.entries(fileErrors)) errors.push(`${f}: ${e.join('; ')}`);
    for (const id of [...this.family.order, ...this.family.studies, this.family.start]) if (!this.styles.has(id)) errors.push(`family: no style "${id}"`);
    for (const line of this.family.lines) {
      for (const id of [...line.order, line.start]) if (!this.styles.has(id)) errors.push(`family line ${line.id}: no style "${id}"`);
    }
    this.styleError = errors.length ? errors.join('\n') : null;
  }

  get style(): Style | null {
    return this.styles.get(this.activeId) ?? null;
  }

  styleById(id: string): Style | null {
    return this.styles.get(id) ?? null;
  }

  /** A style of a live engine (Pulse or Field). */
  private deepWorkStyle(id: string): DeepWorkStyle | undefined {
    const s = this.styles.get(id);
    return s && isLive(s) ? s : undefined;
  }

  styleFile(id: string): string {
    return path.join(stylesDir, `${id}.style.json`);
  }

  /** The variation a selection starts in. */
  private selectionStartId(): string {
    const sel = this.settings.selection;
    const line = this.family.lines.find((l) => l.id === lineOfAuto(sel));
    if (line && this.styles.has(line.start)) return line.start;
    if (sel !== 'auto' && this.styles.has(sel)) return sel;
    return this.styles.has(this.family.start) ? this.family.start : ([...this.styles.keys()][0] ?? 'deep-work');
  }

  /** Called by the file watcher. A bad file never replaces a playing style. */
  reloadFromDisk(): void {
    const { styles, errors } = loadStyleDir(stylesDir, (p) => this.tableFor(p));
    const errs = Object.entries(errors).map(([f, e]) => `${f}: ${e.join('; ')}`);
    this.styleError = errs.length ? errs.join('\n') : null;
    for (const s of styles) {
      const disk = this.diskStyles.get(s.id);
      if (disk && JSON.stringify(s) === JSON.stringify(disk)) continue; // unchanged (or our own save)
      const working = this.styles.get(s.id);
      const dirty = !!working && !!disk && JSON.stringify(working) !== JSON.stringify(disk);
      this.diskStyles.set(s.id, structuredClone(s));
      if (dirty) {
        if (s.id === this.activeId) this.diskChanged = true;
        continue;
      }
      this.styles.set(s.id, structuredClone(s));
      log('app', { type: 'style.reload', styleId: s.id, hash: styleHash(s) });
      if (s.id === this.activeId) this.applyStyleChange(RELOAD_RAMP_SEC, 'style.reload');
    }
    this.deps.onChange();
  }

  get styleDirty(): boolean {
    const s = this.style;
    const d = s ? this.diskStyles.get(s.id) : undefined;
    return !!s && !!d && JSON.stringify(s) !== JSON.stringify(d);
  }

  // --- parameters ---------------------------------------------------------------------

  /** Arrangement-owned values of the active variation. */
  private owned(): Params {
    if (this.aState) return this.aState.data.owned;
    if (this.flState) return this.flState.data.owned;
    const s = this.style;
    if (!s) return {};
    return s.program === 'firstlisten'
      ? firstListenStartValues(s, { introScale: this.settings.introScale })
      : startOwned(s, this.settings.introScale);
  }

  /**
   * Effective params of a variation: the style with the global Ambient <-> Techno value
   * (frozen styles stay exactly as authored), the session's mute/solo, and the
   * device's volume trim — all still under the Sensory Guard.
   */
  private resolveFor(style: Style, owned: Params): Params {
    const table = this.tableFor(style.program);
    const s = style.frozen ? style : ({ ...style, macros: { ...style.macros, pulse: this.settings.pulse } } as Style);
    const p = effectiveParams(s, table, owned);
    for (const [k, v] of Object.entries(this.sessionOverrides)) if (k in table) p[k] = v;
    const trim = this.volumeDb;
    if (trim !== 0 && 'master/level' in p) {
      p['master/level'] = Math.min(p['master/level'] + trim, style.guard.maxMasterDb);
    }
    return p;
  }

  get volumeDb(): number {
    return this.settings.volumeDbByDevice[this.settings.sinkId] ?? 0;
  }

  private computeLive(): Params {
    const s = this.style;
    return s ? this.resolveFor(s, this.owned()) : {};
  }

  /** Recompute effective params and send only what changed, as one immediate batch. */
  private applyStyleChange(rampSec: number, ruleId: string): void {
    const next = this.computeLive();
    const changed = diffParams(this.liveParams, next);
    this.liveParams = next;
    if (this.playing && Object.keys(changed).length) {
      this.deps.sendEvents([
        {
          applyAtBar: -1,
          immediate: true,
          rampSec,
          ruleId,
          changes: Object.entries(changed).map(([param, value]) => ({ param, value }))
        }
      ]);
    }
  }

  // --- audio events -------------------------------------------------------------------

  onAudioReady(program: string): void {
    this.audioReady = true;
    this.audioProgram = program;
    this.lastDspBar = -1;
    if (this.settings.sinkId) this.deps.sendAudio({ type: 'setSink', sinkId: this.settings.sinkId });
  }

  onDevices(devices: OutputDevice[]): void {
    this.devices = devices;
    // First run: pin the Realtek output (bypasses FxSound, per the listening-chain decision).
    if (!this.settings.sinkId) {
      const realtek = devices.find((d) => /realtek/i.test(d.label) && !/fxsound/i.test(d.label));
      if (realtek) this.setSink(realtek.deviceId, realtek.label);
    }
    this.deps.onChange();
  }

  onSinkLost(sinkId: string): void {
    if (this.playing) this.stop('sink-lost');
    log('sessions', { type: 'sink.lost', sinkId });
  }

  onBar(tick: BarTick): void {
    if (tick.program !== this.audioProgram) return; // a replaced node's last ticks
    this.lastDspBar = tick.bar;
    if (!this.playing) return;
    const sessionBar = tick.bar - this.startBar;
    if (sessionBar < 0) return;
    const inputs = { bar: sessionBar, audioSec: 0, signals: {} };
    let events: ConductorEvent[] = [];
    if (this.arranger && this.aState) {
      const res = this.arranger.onBar(this.aState, inputs);
      this.aState = res.state;
      events = res.events;
      if (this.aState.data.styleId !== this.activeId) {
        this.activeId = this.aState.data.styleId;
        this.diskChanged = false;
        this.settings.styleId = this.activeId;
        saveSettings(this.settings);
      }
    } else if (this.flConductor && this.flState) {
      const res = this.flConductor.onBar(this.flState, inputs);
      this.flState = res.state;
      events = res.events;
    }
    if (events.length) {
      this.deps.sendEvents(events.map((e) => ({ ...e, applyAtBar: e.applyAtBar + this.startBar })));
      this.liveParams = this.computeLive();
      this.deps.onChange();
    }
  }

  onLanded(entry: DecisionLogEntry): void {
    if (entry.ruleId.startsWith('manual') || entry.ruleId === 'session.start') return;
    const rel = { ...entry, requestedBar: entry.requestedBar - this.startBar, landedBar: entry.landedBar - this.startBar };
    this.decisions.push(rel);
    if (this.decisions.length > 200) this.decisions.shift();
    log('sessions', { type: 'decision', seed: this.seed, styleId: this.activeId, ...rel });
    this.deps.onChange();
  }

  // --- session ------------------------------------------------------------------------

  /**
   * Start a session. `skipIntro` starts at full texture regardless of Gentle start — used
   * when a pick switches engine mid-session (A/B with the reference must be immediate).
   */
  play(opts: { skipIntro?: boolean } = {}): void {
    if (!this.audioReady || this.playing) return;
    const introScale = opts.skipIntro ? 0 : this.settings.introScale;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    const auto = this.settings.selection === 'auto' || lineOfAuto(this.settings.selection) !== null;
    this.activeId = this.selectionStartId();
    const style = this.style;
    if (!style) return;
    this.seed = freshSeed();
    this.program = style.program;
    this.arranger = null;
    this.aState = null;
    this.flConductor = null;
    this.flState = null;
    if (style.program === 'firstlisten') {
      this.flConductor = makeFirstListenConductor(style, { introScale });
      this.flState = this.flConductor.init(this.seed);
    } else {
      // the arranger walks the style's own line (or the family), and only inside its engine
      const program = style.program;
      this.arranger = makeArranger({
        family: walkFor(this.family, style.id),
        getStyle: (id) => {
          const s = this.deepWorkStyle(id);
          return s && s.program === program ? s : undefined;
        },
        resolve: (s, owned) => this.resolveFor(s, owned),
        startId: style.id,
        mode: auto ? 'auto' : 'fixed',
        introScale
      });
      this.aState = this.arranger.init(this.seed);
    }
    this.liveParams = this.computeLive();
    // Session bar 0 is the next bar line after the start batch latches; a freshly loaded
    // program starts its bar clock at 0 with the start batch.
    const switching = this.audioProgram !== style.program;
    this.startBar = switching ? 0 : Math.max(0, this.lastDspBar + 1);
    if (switching) this.lastDspBar = -1;
    this.audioProgram = style.program;
    this.decisions = [];
    this.playing = true;
    this.startedAt = new Date().toISOString();
    this.settings.styleId = style.id;
    saveSettings(this.settings);
    this.deps.sendAudio({ type: 'start', program: style.program, seed: this.seed, params: this.liveParams });
    this.deps.setKeepAwake(true);
    log('sessions', {
      type: 'session.start',
      seed: this.seed,
      program: style.program,
      selection: this.settings.selection,
      styleId: style.id,
      styleHash: styleHash(style),
      appGitSha: this.deps.appGitSha,
      outputDeviceId: this.settings.sinkId,
      outputDeviceLabel: this.settings.sinkLabel,
      introScale,
      pulse: this.settings.pulse,
      volumeDb: this.volumeDb,
      reference: this.settings.reference
    });
  }

  stop(reason = 'user', fadeSec = 2.5): void {
    if (this.restartTimer && reason === 'user') {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (!this.playing) return;
    this.playing = false;
    this.deps.sendAudio({ type: 'stop', fadeSec });
    this.deps.setKeepAwake(false);
    log('sessions', { type: 'session.stop', seed: this.seed, reason, styleId: this.activeId, decisions: this.decisions.length });
    this.arranger = null;
    this.aState = null;
    this.flConductor = null;
    this.flState = null;
    this.startedAt = null;
  }

  /** Choose a variation or Auto. Morphs while playing; a change of engine restarts. */
  private select(selection: string): void {
    const autoLine = lineOfAuto(selection);
    const line = autoLine ? this.family.lines.find((l) => l.id === autoLine) : undefined;
    if (autoLine && !line) return;
    if (selection !== 'auto' && !line && !this.styles.has(selection)) return;
    this.settings.selection = selection;
    saveSettings(this.settings);
    log('sessions', { type: 'select', selection, playing: this.playing, from: this.activeId });
    if (!this.playing) {
      this.activeId = this.selectionStartId();
      this.diskChanged = false;
      this.liveParams = this.computeLive();
      return;
    }
    // Auto keeps playing where it is if that is inside its walk; otherwise it starts at the start
    const walk = line ? line.order : this.family.order;
    const here = this.style;
    const autoSel = selection === 'auto' || !!line;
    const stay = autoSel && !!here && (walk.includes(here.id) || (!line && this.family.studies.includes(here.id)));
    const target = autoSel ? (stay ? here : this.styles.get(line ? line.start : this.family.start)) : this.styles.get(selection);
    if (!target) return;
    const sameWalk = !!here && walkFor(this.family, here.id).order.join() === walkFor(this.family, target.id).order.join();
    if (target.program !== this.program || (autoSel && !stay && !sameWalk)) {
      // another engine (Pulse, Field, the frozen reference): a short fade, then a fresh session there
      this.stop('switch', SWITCH_FADE_SEC);
      this.restartTimer = setTimeout(() => {
        this.restartTimer = null;
        this.play({ skipIntro: true });
        this.deps.onChange();
      }, SWITCH_FADE_SEC * 1000 + 150);
      return;
    }
    if (this.aState) {
      if (autoSel) {
        this.aState = setArrangerMode(this.aState, 'auto');
        if (!stay) this.aState = requestVariation(this.aState, target.id);
      } else this.aState = requestVariation(setArrangerMode(this.aState, 'fixed'), selection);
    }
  }

  // --- panel commands -----------------------------------------------------------------

  private engineAudible = true;

  command(cmd: PanelCommand): void {
    const s = this.style;
    const editable = !!s && !s.frozen;
    switch (cmd.type) {
      case 'play':
        this.play();
        break;
      case 'stop':
        this.stop();
        break;
      case 'select':
        this.select(cmd.selection);
        break;
      case 'setPulse':
        this.settings.pulse = Math.min(1, Math.max(0, cmd.value));
        saveSettings(this.settings);
        this.applyStyleChange(SLIDER_RAMP_SEC, 'manual.pulse');
        break;
      case 'setVolume':
        if (!this.settings.sinkId) break;
        this.settings.volumeDbByDevice[this.settings.sinkId] = Math.min(6, Math.max(-30, cmd.value));
        saveSettings(this.settings);
        this.applyStyleChange(SLIDER_RAMP_SEC, 'manual.volume');
        break;
      case 'setParam':
      case 'setParams': {
        if (!s) break;
        const table = this.tableFor(s.program);
        const entries = cmd.type === 'setParam' ? { [cmd.param]: cmd.value } : cmd.params;
        for (const [k, v] of Object.entries(entries)) {
          if (!(k in table)) continue;
          if (k.endsWith('/mute') || k.endsWith('/solo')) {
            this.sessionOverrides[k] = v > 0.5 ? 1 : 0;
            continue;
          }
          if (!editable) continue; // the reference is frozen
          s.params[k] = v;
          // a manual edit always wins over the arranger
          if (this.aState && k in this.aState.data.owned && !k.endsWith('/on')) {
            const owned = { ...this.aState.data.owned };
            delete owned[k];
            this.aState = { ...this.aState, data: { ...this.aState.data, owned } };
          }
        }
        this.applyStyleChange(MANUAL_RAMP_SEC, 'manual.param');
        break;
      }
      case 'setMacro':
        if (!s) break;
        if (cmd.name === 'pulse') {
          this.settings.pulse = Math.min(1, Math.max(0, cmd.value));
          saveSettings(this.settings);
        } else if (editable) {
          s.macros[cmd.name] = Math.min(1, Math.max(0, cmd.value));
        }
        this.applyStyleChange(MANUAL_RAMP_SEC, 'manual.macro');
        break;
      case 'ab':
        this.engineAudible = !this.engineAudible;
        this.deps.sendAudio({ type: 'ab', engineAudible: this.engineAudible, fadeSec: 1 });
        log('bench', { type: 'ab', engineAudible: this.engineAudible, sessionBar: this.sessionBar, styleId: this.activeId });
        break;
      case 'saveStyle':
        if (!s || !editable) break;
        saveStyleFile(this.styleFile(s.id), s);
        this.diskStyles.set(s.id, structuredClone(s));
        this.diskChanged = false;
        log('app', { type: 'style.save', styleId: s.id, hash: styleHash(s) });
        break;
      case 'revertStyle': {
        const disk = s ? this.diskStyles.get(s.id) : undefined;
        if (!s || !disk) break;
        this.diskChanged = false;
        this.styles.set(s.id, structuredClone(disk));
        this.applyStyleChange(RELOAD_RAMP_SEC, 'manual.revert');
        break;
      }
      case 'snapshotSave': {
        if (!s || !editable) break;
        const snap = { name: cmd.slot, params: { ...s.params }, macros: { ...s.macros } };
        s.snapshots = [...s.snapshots.filter((x) => x.name !== cmd.slot), snap];
        log('bench', { type: 'snapshot.save', slot: cmd.slot, styleId: s.id, styleHash: styleHash(s) });
        break;
      }
      case 'snapshotRecall': {
        if (!s || !editable) break;
        const snap = s.snapshots.find((x) => x.name === cmd.slot);
        if (!snap) break;
        s.params = { ...snap.params };
        s.macros = { ...snap.macros };
        this.applyStyleChange(0.5, 'manual.snapshot');
        log('bench', { type: 'snapshot.recall', slot: cmd.slot, styleId: s.id });
        break;
      }
      case 'note':
        log('feedback', {
          type: 'note',
          note: cmd.text,
          sessionBar: this.sessionBar,
          playing: this.playing,
          engineAudible: this.engineAudible,
          seed: this.seed,
          program: this.program,
          selection: this.settings.selection,
          styleId: s?.id,
          styleHash: s ? styleHash(s) : null,
          pulse: this.settings.pulse,
          macros: s?.macros,
          params: this.liveParams,
          reference: this.settings.reference
        });
        break;
      case 'check':
        log('bench', {
          type: 'check',
          item: cmd.item,
          verdict: cmd.verdict,
          sessionBar: this.sessionBar,
          styleId: s?.id,
          styleHash: s ? styleHash(s) : null,
          params: this.liveParams,
          reference: this.settings.reference
        });
        break;
      case 'reference':
        this.settings.reference = { ...this.settings.reference, ...cmd.reference } as Settings['reference'];
        saveSettings(this.settings);
        log('bench', { type: 'reference', reference: this.settings.reference });
        break;
      case 'setSink': {
        const d = this.devices.find((x) => x.deviceId === cmd.sinkId);
        this.setSink(cmd.sinkId, d?.label ?? '');
        break;
      }
      case 'setIntroScale':
        this.settings.introScale = Math.max(0, Math.min(1, cmd.value));
        saveSettings(this.settings);
        break;
      case 'milestone':
        if (!this.milestones.includes(cmd.name)) this.milestones.push(cmd.name);
        log('app', { type: 'milestone', name: cmd.name, styleId: s?.id, styleHash: s ? styleHash(s) : null, appGitSha: this.deps.appGitSha });
        break;
    }
    this.deps.onChange();
  }

  private setSink(sinkId: string, label: string): void {
    if (this.playing) this.stop('device-change'); // never jump devices at level
    this.settings.sinkId = sinkId;
    this.settings.sinkLabel = label;
    saveSettings(this.settings);
    this.deps.sendAudio({ type: 'setSink', sinkId });
    this.liveParams = this.computeLive();
    log('app', { type: 'sink.set', sinkId, label });
  }

  private readMilestones(): string[] {
    const dir = path.join(dataDir, 'app');
    const out = new Set<string>();
    try {
      for (const f of fs.readdirSync(dir)) {
        for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
          if (line.includes('"milestone"')) {
            try {
              out.add(JSON.parse(line).name);
            } catch {
              /* ignore */
            }
          }
        }
      }
    } catch {
      /* no logs yet */
    }
    return [...out];
  }

  get sessionBar(): number {
    return this.playing ? Math.max(0, this.lastDspBar - this.startBar) : 0;
  }

  get phase(): SessionInfo['phase'] {
    if (!this.playing) return 'idle';
    if (this.aState) return arrangerPhase(this.aState.data, this.sessionBar);
    if (this.flState) return this.sessionBar < this.flState.data.bodyStartBar ? 'ramp-in' : 'body';
    return 'idle';
  }

  get variations(): VariationInfo[] {
    const groups: [string[], VariationGroup, string | undefined][] = [
      [this.family.order, 'family', undefined],
      [this.family.studies, 'study', undefined],
      ...this.family.lines.map((l): [string[], VariationGroup, string] => [l.order, 'line', l.id]),
      [this.family.reference ? [this.family.reference] : [], 'reference', undefined]
    ];
    return groups.flatMap(([ids, group, line]) =>
      ids
        .map((id) => this.styles.get(id))
        .filter((s): s is Style => !!s)
        .map((s) => ({ id: s.id, name: s.name, tagline: s.tagline, description: s.description, use: s.use, frozen: s.frozen, program: s.program, group, line }))
    );
  }

  status(hotkeys: StatusUpdate['hotkeys']): StatusUpdate {
    const m = this.aState?.data.morph;
    return {
      audio: this.audio,
      session: {
        playing: this.playing,
        seed: this.seed,
        startedAt: this.startedAt,
        sessionBar: this.sessionBar,
        phase: this.phase,
        program: this.program,
        introScale: this.settings.introScale,
        decisions: this.decisions.slice(-60)
      },
      variations: this.variations,
      lines: this.family.lines.map((l) => ({ id: l.id, name: l.name, about: l.about })),
      selection: this.settings.selection,
      activeId: this.activeId,
      morph: this.playing && m && this.sessionBar < m.endBar ? { fromId: m.fromId, toId: m.toId } : null,
      build: this.playing && this.aState ? buildView(this.aState.data, this.deepWorkStyle(this.aState.data.styleId)) : null,
      pulse: this.settings.pulse,
      volumeDb: this.volumeDb,
      style: this.style,
      styleDirty: this.styleDirty,
      styleError: this.styleError,
      diskChanged: this.diskChanged,
      liveParams: Object.keys(this.liveParams).length ? this.liveParams : this.computeLive(),
      devices: this.devices,
      sinkId: this.settings.sinkId,
      reference: this.settings.reference as unknown as Record<string, unknown>,
      milestones: this.milestones,
      hotkeys
    };
  }
}
