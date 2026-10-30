// Electron main: windows, tray, hotkeys, the session controller, and the self-test.
//
// Windows
//  * audio — hidden, lives with the app, backgroundThrottling off. Owns the AudioContext.
//  * panel — the control panel; closing it hides it (tray keeps the app alive).
//
// Renderer files are served over a privileged custom scheme (cog://app/...) so fetch()
// works for the precompiled DSP and each page gets its own strict CSP.

import { app, BrowserWindow, globalShortcut, ipcMain, Menu, net, powerSaveBlocker, protocol, screen, session, Tray } from 'electron';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { DecisionLogEntry } from '../shared/contract.ts';
import type { AudioReady, AudioStatus, BarTick, OutputDevice, PanelCommand, PanelInit, ParamMeta } from '../shared/ipc.ts';
import { paramTableFromMeta } from '../shared/style/table.ts';
import type { ParamTable, Program } from '../shared/style/schema.ts';
import { dataDir, preloadPath, rendererDir, repoRoot, stylesDir } from './paths.ts';
import { SessionController } from './session.ts';
import { log } from './logger.ts';
import { trayIcon } from './tray-icon.ts';
import { runSelftest, selftestResult } from './selftest.ts';

const SELFTEST = process.argv.includes('--selftest');
/** --shots: capture each panel tab to data/screenshots/ and exit (UI QA). */
const SHOTS = process.argv.includes('--shots');
/** --e2e: silent end-to-end session through the real app (engine faded out), then exit. */
const E2E = process.argv.includes('--e2e');
const devUrl = process.env.ELECTRON_RENDERER_URL;

// --- Content Security Policy -------------------------------------------------------
const CSP_AUDIO =
  "default-src 'self'; script-src 'self' blob: 'wasm-unsafe-eval'; worker-src 'self' blob:; connect-src 'self' blob: data:; style-src 'self' 'unsafe-inline'";
const CSP_PANEL = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'";

function cspFor(pathname: string, dev: boolean): string {
  const base = pathname.endsWith('audio.html') ? CSP_AUDIO : CSP_PANEL;
  if (!dev) return base;
  const u = new URL(devUrl!);
  return base
    .replace("script-src 'self'", `script-src 'self' ${u.origin} 'unsafe-inline'`)
    .replace("default-src 'self'", `default-src 'self' ${u.origin} ws://${u.host}`)
    .replace("connect-src 'self'", `connect-src 'self' ${u.origin} ws://${u.host}`);
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'cog', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

function serveRenderer(): void {
  protocol.handle('cog', async (req) => {
    const url = new URL(req.url);
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const file = path.normalize(path.join(rendererDir, rel));
    if (!file.startsWith(rendererDir)) return new Response('forbidden', { status: 403 });
    const res = await net.fetch(pathToFileURL(file).toString());
    const headers = new Headers(res.headers);
    if (file.endsWith('.html')) headers.set('Content-Security-Policy', cspFor(file, false));
    if (file.endsWith('.wasm')) headers.set('Content-Type', 'application/wasm');
    return new Response(res.body, { status: res.status, headers });
  });
  if (devUrl) {
    session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
      const headers = { ...details.responseHeaders };
      if (details.url.startsWith(devUrl) && /\.html(\?|$)|\/$/.test(details.url)) {
        headers['Content-Security-Policy'] = [cspFor(new URL(details.url).pathname, true)];
      }
      cb({ responseHeaders: headers });
    });
  }
  // Device labels for the output picker (no camera/mic is ever opened in Phase 1).
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'media' || permission === 'speaker-selection');
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === 'speaker-selection'));
}

function pageUrl(page: 'audio' | 'panel'): string {
  return devUrl ? `${devUrl}/${page}.html` : `cog://app/${page}.html`;
}

// --- Param metadata (from the precompiled program) -----------------------------------

function loadTable(program: Program): ParamTable {
  return paramTableFromMeta(fs.readFileSync(path.join(rendererDir, 'dsp', `${program}.json`), 'utf8'));
}

function loadParamMeta(program: Program): { table: ParamTable; meta: ParamMeta[] } {
  const jsonText = fs.readFileSync(path.join(rendererDir, 'dsp', `${program}.json`), 'utf8');
  const table = paramTableFromMeta(jsonText);
  const json = JSON.parse(jsonText);
  const meta: ParamMeta[] = [];
  const walk = (items: any[]) => {
    for (const it of items) {
      if (it.items) walk(it.items);
      else if (it.address && it.type !== 'hbargraph' && it.type !== 'vbargraph') {
        const param = it.address.replace(`/${json.name}/`, '');
        const [group, name] = param.includes('/') ? param.split('/') : ['system', param];
        const unit = (it.meta ?? []).find((m: Record<string, string>) => m.unit)?.unit ?? '';
        meta.push({ program, param, group, name, type: it.type, min: it.min ?? 0, max: it.max ?? 1, step: it.step ?? 0.001, init: it.init ?? 0, unit });
      }
    }
  };
  walk(json.ui);
  return { table, meta };
}

// --- State ---------------------------------------------------------------------------

let audioWin: BrowserWindow | null = null;
let panelWin: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;
let blockerId: number | null = null;
let controller: SessionController | null = null;
let paramMeta: ParamMeta[] = [];
const consoleErrors: string[] = [];
const hotkeys: { action: string; accelerator: string; registered: boolean }[] = [];

function appGitSha(): string {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function sendAudio(cmd: unknown): void {
  audioWin?.webContents.send('audio:command', cmd);
}

let statusTimer: NodeJS.Timeout | null = null;
function pushStatus(): void {
  if (statusTimer) return;
  statusTimer = setTimeout(() => {
    statusTimer = null;
    if (controller && panelWin && !panelWin.isDestroyed()) panelWin.webContents.send('status:update', controller.status(hotkeys));
    updateTray();
  }, 50);
}

// --- Windows -------------------------------------------------------------------------

function createAudioWindow(): BrowserWindow {
  const win = new BrowserWindow({
    show: false,
    width: 400,
    height: 300,
    webPreferences: {
      preload: preloadPath,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });
  win.webContents.on('console-message', (e) => {
    if (e.level === 'error' || e.level === 'warning') consoleErrors.push(`[audio:${e.level}] ${e.message}`);
    if (SELFTEST) console.log(`[audio:${e.level}] ${e.message}`);
  });
  win.webContents.on('render-process-gone', (_e, details) => {
    consoleErrors.push(`[audio] render-process-gone: ${details.reason}`);
    log('app', { type: 'audio.crash', reason: details.reason });
    if (!SELFTEST && !quitting) {
      // Recover: a fresh audio window; the user restarts the session (never auto-resume at level).
      controller?.stop('audio-crash');
      audioWin = createAudioWindow();
    }
  });
  void win.loadURL(pageUrl('audio'));
  return win;
}

function createPanelWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 760,
    // the family, the studies and the dials in one view, never taller than the screen
    height: Math.min(1060, screen.getPrimaryDisplay().workAreaSize.height),
    minWidth: 560,
    minHeight: 560,
    show: !SELFTEST,
    backgroundColor: '#121314',
    title: 'cognition',
    autoHideMenuBar: true,
    webPreferences: { preload: preloadPath, sandbox: true, contextIsolation: true, nodeIntegration: false }
  });
  win.webContents.on('console-message', (e) => {
    if (e.level === 'error') consoleErrors.push(`[panel:error] ${e.message}`);
  });
  win.on('close', (e) => {
    if (!quitting && !SELFTEST) {
      e.preventDefault();
      win.hide();
    }
  });
  win.webContents.on('did-finish-load', () => {
    pushStatus();
    if (SHOTS) void captureTabs(win);
  });
  void win.loadURL(pageUrl('panel'));
  return win;
}

async function captureTabs(win: BrowserWindow): Promise<void> {
  const dir = path.join(dataDir, 'screenshots');
  fs.mkdirSync(dir, { recursive: true });
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  await wait(1500);
  for (const tab of ['Main', 'Setup', 'Macros', 'Workshop', 'Bench', 'Log']) {
    win.webContents.send('panel:focus', `tab:${tab}`);
    await wait(500);
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(dir, `panel-${tab.toLowerCase()}.png`), img.toPNG());
  }
  quitting = true;
  app.exit(0);
}

/**
 * Silent lap through the real app: Auto with a quick build, a pick that morphs, the
 * two main-screen sliders, a switch to the frozen reference engine and back, a pick of a
 * Deep Work study, stop.
 */
async function runE2E(): Promise<void> {
  const c = controller!;
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const out: Record<string, unknown> = {};
  const decisions = () => c.decisions.map((d) => ({ rule: d.ruleId, req: d.requestedBar, landed: d.landedBar, note: d.note }));
  const shot = async (name: string, tab: string) => {
    if (!panelWin) return;
    const dir = path.join(dataDir, 'screenshots');
    fs.mkdirSync(dir, { recursive: true });
    panelWin.webContents.send('panel:focus', `tab:${tab}`);
    await wait(600);
    fs.writeFileSync(path.join(dir, `e2e-${name}.png`), (await panelWin.webContents.capturePage()).toPNG());
  };
  await wait(1500);
  c.command({ type: 'ab' }); // engine inaudible: silent run
  c.command({ type: 'setIntroScale', value: 0.15 });
  c.command({ type: 'select', selection: 'auto' });
  c.command({ type: 'play' });
  await wait(36_000);
  out.duringBuild = { phase: c.phase, activeId: c.activeId, sessionBar: c.sessionBar, build: c.status(hotkeys).build, decisions: decisions() };
  await shot('main-auto', 'Main');

  c.command({ type: 'select', selection: 'acid-drift' });
  await wait(9_000);
  out.afterPick = { phase: c.phase, activeId: c.activeId, morph: c.status(hotkeys).morph, build: c.status(hotkeys).build, decisions: decisions().slice(-4) };
  await shot('main-morph', 'Main');

  const before = c.audio?.latchedCommit ?? 0;
  c.command({ type: 'setPulse', value: 0.25 });
  c.command({ type: 'setVolume', value: -4 });
  await wait(1500);
  out.sliders = {
    latchedBefore: before,
    latchedAfter: c.audio?.latchedCommit,
    kickLevelLive: c.liveParams['kick/level'],
    kickLevelAuthored: c.style?.params['kick/level'],
    masterLive: c.liveParams['master/level'],
    masterAuthored: c.style?.params['master/level']
  };

  c.command({ type: 'select', selection: 'first-listen' });
  await wait(7_000);
  out.reference = { program: c.program, activeId: c.activeId, playing: c.playing, sessionBar: c.sessionBar, audio: c.audio };
  await shot('main-reference', 'Main');

  c.command({ type: 'select', selection: 'deep-work' });
  await wait(7_000);
  out.backToFamily = { program: c.program, activeId: c.activeId, playing: c.playing, sessionBar: c.sessionBar, phase: c.phase };

  // a Deep Work study, picked from a settled Deep Work (a pick waits for any blend under way)
  const study = c.family.studies[0];
  if (study) {
    c.command({ type: 'select', selection: study });
    await wait(9_000);
    out.study = {
      id: study,
      group: c.variations.find((v) => v.id === study)?.group,
      phase: c.phase,
      activeId: c.activeId,
      morph: c.status(hotkeys).morph,
      decisions: decisions().slice(-2)
    };
    await shot('main-study', 'Main');
  }

  // the Field engine: its Auto (a fade across engines), a pick inside it (a blend between
  // worlds), then the family's Auto again (back across)
  const line = c.family.lines[0];
  if (line) {
    c.command({ type: 'select', selection: `auto:${line.id}` });
    await wait(6_000);
    out.fieldAuto = { program: c.program, activeId: c.activeId, selection: c.settings.selection, playing: c.playing, audio: c.audio };
    const pick = line.order.find((id) => id !== c.activeId && Math.abs(line.order.indexOf(id) - line.order.indexOf(c.activeId)) === 2);
    if (pick) {
      c.command({ type: 'select', selection: pick });
      await wait(9_000);
      out.fieldPick = { id: pick, program: c.program, activeId: c.activeId, morph: c.status(hotkeys).morph, decisions: decisions().slice(-2) };
    }
    await shot('main-field', 'Main');
    c.command({ type: 'select', selection: 'auto' });
    await wait(6_000);
    out.backToPulse = { program: c.program, activeId: c.activeId, selection: c.settings.selection, playing: c.playing };
  }
  await shot('log', 'Log');

  c.command({ type: 'stop' });
  await wait(3000);
  out.afterStop = { playing: c.playing, audioState: c.audio?.state };
  out.consoleErrors = consoleErrors;
  fs.mkdirSync(path.join(dataDir, 'selftest'), { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'selftest', 'e2e.json'), JSON.stringify(out, null, 2));
  console.log('E2E done');
  quitting = true;
  app.exit(0);
}

function showPanel(focus?: string): void {
  if (!panelWin) return;
  if (panelWin.isMinimized()) panelWin.restore();
  panelWin.show();
  panelWin.focus();
  if (focus) panelWin.webContents.send('panel:focus', focus);
}

function updateTray(): void {
  if (!tray || !controller) return;
  const c = controller;
  const playing = c.playing;
  const activeName = c.style?.name ?? '';
  tray.setImage(trayIcon(playing));
  tray.setToolTip(playing ? `cognition — ${activeName} (${c.phase})` : 'cognition');
  const sel = c.settings.selection;
  const pick = (selection: string) => () => c.command({ type: 'select', selection });
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show panel', click: () => showPanel() },
      { type: 'separator' },
      playing ? { label: 'Stop (fade)', click: () => c.command({ type: 'stop' }) } : { label: 'Play', click: () => c.command({ type: 'play' }) },
      {
        label: 'Variation',
        submenu: [
          { label: 'Auto', type: 'radio', checked: sel === 'auto', click: pick('auto') },
          { type: 'separator' },
          ...c.variations.map((v) => ({
            label: v.group === 'reference' ? `${v.name} (reference)` : v.group === 'study' ? `${v.name} (Deep Work study)` : v.name,
            type: 'radio' as const,
            checked: sel === v.id,
            click: pick(v.id)
          }))
        ]
      },
      { label: 'A/B (engine fade)', click: () => controller?.command({ type: 'ab' }), enabled: playing },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          quitting = true;
          controller?.stop('quit');
          setTimeout(() => app.quit(), 600);
        }
      }
    ])
  );
}

function registerHotkeys(): void {
  const defs: [string, string, () => void][] = [
    ['A/B (engine fade)', 'CommandOrControl+Alt+Shift+A', () => controller?.command({ type: 'ab' })],
    ['Note', 'CommandOrControl+Alt+Shift+N', () => showPanel('note')],
    ['Stop (fade)', 'CommandOrControl+Alt+Shift+S', () => controller?.command({ type: 'stop' })]
  ];
  for (const [action, accelerator, fn] of defs) {
    let registered = false;
    try {
      registered = globalShortcut.register(accelerator, fn);
    } catch {
      registered = false;
    }
    hotkeys.push({ action, accelerator, registered });
  }
  log('app', { type: 'hotkeys', hotkeys });
}

// --- IPC ---------------------------------------------------------------------------------

function wireIpc(): void {
  ipcMain.on('audio:ready', (_e, info: AudioReady) => {
    log('app', { type: 'audio.ready', ...info });
    controller?.onAudioReady(info.program);
    if (E2E) void runE2E();
    if (SELFTEST) runSelftest({ sendAudio: (ch, d) => audioWin?.webContents.send(ch, d), controller: controller!, consoleErrors, info });
  });
  ipcMain.on('audio:status', (_e, s: AudioStatus) => {
    if (controller) controller.audio = s;
    pushStatus();
  });
  ipcMain.on('audio:devices', (_e, d: OutputDevice[]) => controller?.onDevices(d));
  ipcMain.on('audio:sinkLost', (_e, id: string) => controller?.onSinkLost(id));
  ipcMain.on('audio:error', (_e, msg: string) => {
    consoleErrors.push(`[audio] ${msg}`);
    log('app', { type: 'audio.error', msg });
    if (SELFTEST) selftestResult({ error: msg });
  });
  ipcMain.on('audio:bar', (_e, tick: BarTick) => controller?.onBar(tick));
  ipcMain.on('audio:landed', (_e, entry: DecisionLogEntry) => controller?.onLanded(entry));
  ipcMain.on('panel:command', (_e, cmd: PanelCommand) => controller?.command(cmd));
  ipcMain.on('selftest:result', (_e, result: Record<string, unknown>) => selftestResult(result));
  ipcMain.handle('panel:init', (): PanelInit => ({ params: paramMeta, hotkeys }));
}

function watchStyles(): void {
  let timer: NodeJS.Timeout | null = null;
  try {
    fs.watch(stylesDir, (_ev, file) => {
      if (!file || !file.endsWith('.style.json')) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => controller?.reloadFromDisk(), 250);
    });
  } catch (err) {
    log('app', { type: 'watch.error', err: String(err) });
  }
}

// --- App lifecycle ---------------------------------------------------------------------------

if (!SELFTEST && !E2E && !SHOTS && !app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showPanel());
  app.on('window-all-closed', () => {
    /* stay alive in the tray */
  });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.whenReady().then(() => {
    serveRenderer();
    // the Studio edits whichever live engine is playing: Pulse's params and Field's
    const pulse = loadParamMeta('deepwork');
    const field = loadParamMeta('field');
    paramMeta = [...pulse.meta, ...field.meta];
    const table = pulse.table;
    controller = new SessionController({
      tables: { deepwork: table, firstlisten: loadTable('firstlisten'), field: field.table },
      sendAudio,
      sendEvents: (events) => audioWin?.webContents.send('conductor:events', events),
      appGitSha: appGitSha(),
      onChange: pushStatus,
      setKeepAwake: (on) => {
        if (on && blockerId === null) blockerId = powerSaveBlocker.start('prevent-app-suspension');
        if (!on && blockerId !== null) {
          powerSaveBlocker.stop(blockerId);
          blockerId = null;
        }
      }
    });
    wireIpc();
    audioWin = createAudioWindow();
    panelWin = createPanelWindow();
    if (!SELFTEST && !E2E && !SHOTS) {
      tray = new Tray(trayIcon(false));
      tray.on('click', () => showPanel());
      updateTray();
      registerHotkeys();
      watchStyles();
    }
    log('app', { type: 'app.start', appGitSha: appGitSha(), electron: process.versions.electron });
  });
}
