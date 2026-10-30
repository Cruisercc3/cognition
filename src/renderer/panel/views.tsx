import { useEffect, useRef, useState } from 'react';
import type { ParamMeta, StatusUpdate } from '../../shared/ipc.ts';
import { MACRO_NAMES, type MacroName } from '../../shared/style/schema.ts';
import { Card, Meter, ParamSlider, Slider, StepGrid } from './components.tsx';
import { fmt, send, sendParam } from './state.ts';

type Props = { status: StatusUpdate; meta: Map<string, ParamMeta> };

const baseValue = (status: StatusUpdate, meta: Map<string, ParamMeta>, p: string): number =>
  status.style?.params[p] ?? status.liveParams[p] ?? meta.get(p)?.init ?? 0;

// ---------------------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------------------

const FrozenNote = () => (
  <p className="hint">First Listen is a frozen reference: it plays exactly as it was and can't be edited. Pick a variation on the main screen to edit.</p>
);

export function SetupView({ status }: Props) {
  const s = status.session;
  const a = status.audio;
  const introOptions: [number, string][] = [
    [1, 'Full build (5–16 min, by variation)'],
    [0.25, 'Quick build (a few minutes)'],
    [0, 'Skip — start at full']
  ];
  return (
    <div className="grid2">
      <Card title="Session">
        <div className="row">
          {s.playing ? (
            <button className="btn big" onClick={() => send({ type: 'stop' })}>
              Stop (fade)
            </button>
          ) : (
            <button className="btn big primary" onClick={() => send({ type: 'play' })} disabled={!status.style}>
              Play
            </button>
          )}
          <span className="muted">{s.playing ? `${status.style?.name ?? ''} · ${s.phase} · bar ${s.sessionBar} · seed ${s.seed} · ${s.program}` : 'idle'}</span>
        </div>
        <p className="hint">Ramp-in for the next session</p>
        <div className="row">
          {introOptions.map(([v, label]) => (
            <button key={v} className={`btn ${s.introScale === v ? 'sel' : ''}`} onClick={() => send({ type: 'setIntroScale', value: v })}>
              {label}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Level" hint="Volume is a trim on top of each variation's calibrated level (all variations are matched). The pre-calibration output ceiling is fixed at −18 dBFS: match levels by ear by lowering Endel.">
        <Slider label="Volume trim" value={status.volumeDb} min={-30} max={6} step={0.5} unit="dB" onChange={(v) => send({ type: 'setVolume', value: v })} />
        <div className="kv" style={{ marginTop: 10 }}>
          <span>Short-term loudness</span>
          <b>{a ? `${fmt(a.loudnessDb, 'dB', 0.1)} dB` : '–'}</b>
          <span>Limiter</span>
          <b>{a ? `${fmt(a.gainReductionDb, 'dB', 0.1)} dB` : '–'}</b>
        </div>
        <div style={{ marginTop: 8 }}>
          <Meter value={a?.loudnessDb ?? -120} min={-60} max={-10} />
        </div>
      </Card>

      <Card title="Output" hint="Pinned to Realtek so FxSound stays out of the path. Changing device stops playback (never jumps devices at level).">
        <select
          value={status.sinkId}
          onChange={(e) => send({ type: 'setSink', sinkId: e.target.value })}
          style={{ width: '100%' }}
        >
          <option value="">System default</option>
          {status.devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || d.deviceId}
            </option>
          ))}
        </select>
        <div className="kv" style={{ marginTop: 10 }}>
          <span>Audio engine</span>
          <b>{a ? a.state : 'starting…'}</b>
          <span>Bar / commit</span>
          <b>{a ? `${a.bar} / ${a.latchedCommit}` : '–'}</b>
        </div>
      </Card>

      <Card title="Milestones" hint="Declare these yourself. 'Good enough to work to' unblocks the next build phases; 'Deep Work accepted' gates Lab trial 1.">
        <div className="row">
          {(['good-enough-to-work-to', 'deep-work-accepted'] as const).map((m) => (
            <button key={m} className={`btn ${status.milestones.includes(m) ? 'sel' : ''}`} onClick={() => send({ type: 'milestone', name: m })}>
              {status.milestones.includes(m) ? '✓ ' : ''}
              {m === 'good-enough-to-work-to' ? 'Good enough to work to' : 'Deep Work accepted'}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Macros
// ---------------------------------------------------------------------------------------

const MACRO_TEXT: Record<MacroName, [string, string]> = {
  pulse: ['Pulse', 'Ambient ← → Techno: kick/hat/perc level, onset density, transient sharpness'],
  intensity: ['Intensity', 'Stimulation: beat-locked modulation depth and noise bed (above the middle only)'],
  warmth: ['Warmth', 'Bright ← → Dark: pad, stab, hats, kick tone'],
  density: ['Density', 'Sparser ← → busier: hit probabilities and ghosts'],
  space: ['Space', 'Dry ← → wide: room, dub delay, stereo width'],
  tonality: ['Tonality', 'Fifths ← as authored → richer (min9); bass motion']
};

export function MacrosView({ status }: Props) {
  const m = status.style ? { ...status.style.macros, pulse: status.pulse } : null;
  if (!m) return <p className="muted">No style loaded.</p>;
  if (status.style?.frozen) return <FrozenNote />;
  return (
    <Card title={`Macros · ${status.style?.name}`} hint="0.5 is the variation as authored. Pulse is the main screen's Ambient ↔ Techno dial and applies to every variation; the others belong to this variation. Changes glide in about 150 ms; the Sensory Guard clamps every result.">
      {MACRO_NAMES.map((name) => (
        <div key={name}>
          <Slider
            className="macro"
            label={MACRO_TEXT[name][0]}
            value={m[name]}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => send({ type: 'setMacro', name, value: v })}
          />
          <div className="desc">{MACRO_TEXT[name][1]}</div>
        </div>
      ))}
    </Card>
  );
}

// ---------------------------------------------------------------------------------------
// Workshop
// ---------------------------------------------------------------------------------------

const GATED_LAYERS = ['kick', 'sub', 'hats', 'ohat', 'clap', 'perc', 'acid', 'stab', 'pad', 'noise', 'rain', 'sea', 'light', 'glass', 'hum', 'series', 'parts', 'veil'];
const LAYERS = [...GATED_LAYERS, 'beta', 'groove', 'motion', 'tonal', 'space', 'master', 'guard'];
// the Field engine's elements and controls
const FIELD_GATED = ['bank', 'drone', 'glow', 'breath', 'bloom', 'lattice', 'phase'];
const FIELD_LAYERS = [...FIELD_GATED, 'tonal', 'motion', 'space', 'master', 'guard'];
const GATED = new Set([...GATED_LAYERS, ...FIELD_GATED]);
const HIDDEN = new Set(['on', 'mute', 'solo']);

export function WorkshopView({ status, meta }: Props) {
  const field = status.style?.program === 'field';
  const layers = field ? FIELD_LAYERS : LAYERS;
  const [picked, setLayer] = useState('kick');
  const layer = layers.includes(picked) ? picked : layers[0];
  const ORDER = ['level', 'mask', 'prob', 'ghost'];
  const rank = (n: string) => (ORDER.includes(n) ? ORDER.indexOf(n) : ORDER.length);
  const params = [...meta.values()].filter((p) => p.group === layer && !HIDDEN.has(p.name)).sort((a, b) => rank(a.name) - rank(b.name));
  const toggle = (p: string) => sendParam(p, (status.liveParams[p] ?? 0) > 0.5 ? 0 : 1);
  if (status.style?.frozen) return <FrozenNote />;
  return (
    <div className="layers">
      <div className="layer-list">
        {layers.map((l) => (
          <button key={l} className={l === layer ? 'active' : ''} onClick={() => setLayer(l)}>
            <span>{l}</span>
            {GATED.has(l) ? (
              <span className="ms" onClick={(e) => e.stopPropagation()}>
                <span className={`mute ${(status.liveParams[`${l}/mute`] ?? 0) > 0.5 ? 'on' : ''}`} onClick={() => toggle(`${l}/mute`)}>
                  M
                </span>
                <span className={`solo ${(status.liveParams[`${l}/solo`] ?? 0) > 0.5 ? 'on' : ''}`} onClick={() => toggle(`${l}/solo`)}>
                  S
                </span>
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <Card title={`${layer} · ${status.style?.name ?? ''}`} hint={`Edits change the working variation (Save writes styles/${status.style?.id}.style.json; the arranger never overrides a value you set by hand).`}>
        {layer === 'groove' ? <BpmRow status={status} /> : null}
        {params.map((p) =>
          p.name === 'mask' ? (
            <div key={p.param}>
              <label className="muted">pattern (16 steps)</label>
              <StepGrid mask={baseValue(status, meta, p.param)} onChange={(v) => sendParam(p.param, v)} />
            </div>
          ) : (
            <ParamSlider key={p.param} meta={p} value={baseValue(status, meta, p.param)} onChange={(v) => sendParam(p.param, v)} />
          )
        )}
      </Card>
    </div>
  );
}

function BpmRow({ status }: { status: StatusUpdate }) {
  return (
    <Slider
      label="tempo"
      value={status.style?.params.bpm ?? 120}
      min={100}
      max={130}
      step={0.1}
      unit="bpm"
      onChange={(v) => sendParam('bpm', v)}
    />
  );
}

// ---------------------------------------------------------------------------------------
// Bench
// ---------------------------------------------------------------------------------------

const CHECKS = ['Tempo', 'Kick weight & roundness', 'Bass / sub', 'Hats & ticks', 'Density (how busy)', 'Rate of change', 'Space & reverb', 'Brightness', 'Overall feel'];

export function BenchView({ status, focusNote }: Props & { focusNote: number }) {
  const [note, setNote] = useState('');
  const [taps, setTaps] = useState<number[]>([]);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (focusNote) noteRef.current?.focus();
  }, [focusNote]);
  const engineAudible = status.audio?.engineAudible ?? true;
  const tap = () => {
    const now = performance.now();
    const t = [...taps.filter((x) => now - x < 3000), now].slice(-6);
    setTaps(t);
    if (t.length >= 4) {
      const iv = (t[t.length - 1] - t[0]) / (t.length - 1);
      const bpm = Math.max(100, Math.min(130, Math.round((60000 / iv) * 10) / 10));
      sendParam('bpm', bpm);
    }
  };
  const ref = status.reference as Record<string, string | boolean>;
  const snaps = status.style?.snapshots.map((s) => s.name) ?? [];
  return (
    <div className="grid2">
      <Card title="A/B against Endel" hint="Hotkey Ctrl+Alt+Shift+A fades the engine out/in over 1 s while Endel keeps playing. Turn FxSound off so both reach Realtek unprocessed.">
        <div className="row">
          <button className="btn ab primary" onClick={() => send({ type: 'ab' })} disabled={!status.session.playing}>
            {engineAudible ? 'Engine audible → fade to Endel' : 'Endel only → fade engine in'}
          </button>
        </div>
      </Card>

      <Card title="Tap tempo" hint="Tap along with Endel's kick (4+ taps). Changes land on the next bar line.">
        <div className="row">
          <button className="btn big" onClick={tap}>
            Tap
          </button>
          <span className="val">{fmt(status.style?.params.bpm, 'bpm', 0.1)} bpm</span>
          <span className="muted">{taps.length >= 4 ? 'set' : `${taps.length}/4`}</span>
        </div>
      </Card>

      <Card title="Note" hint="Ctrl+Alt+Shift+N jumps here. Saved with the exact parameters and bar, so Claude can turn it into changes.">
        <textarea ref={noteRef} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. kick too clicky; hats feel busier than Endel" />
        <div className="row" style={{ marginTop: 8 }}>
          <button
            className="btn primary"
            disabled={!note.trim()}
            onClick={() => {
              send({ type: 'note', text: note.trim() });
              setNote('');
            }}
          >
            Save note
          </button>
        </div>
      </Card>

      <Card title="Snapshots" hint="Store the current settings in a slot; recall glides back to it. Saved with the style.">
        {['A', 'B', 'C'].map((slot) => (
          <div className="row" key={slot}>
            <span style={{ width: 20 }}>{slot}</span>
            <button className="btn" onClick={() => send({ type: 'snapshotSave', slot })}>
              Store
            </button>
            <button className="btn" disabled={!snaps.includes(slot)} onClick={() => send({ type: 'snapshotRecall', slot })}>
              Recall
            </button>
          </div>
        ))}
      </Card>

      <Card title="Checklist" hint="After each A/B, tap how the engine compares to Endel on each aspect.">
        {CHECKS.map((item) => (
          <div className="check" key={item}>
            <span>{item}</span>
            <div className="row">
              {(['closer', 'same', 'further'] as const).map((v) => (
                <button key={v} className="btn" onClick={() => send({ type: 'check', item, verdict: v })}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
      </Card>

      <Card title="Reference" hint="What the engine is being compared against. Logged with every note and check.">
        <div className="kv">
          <span>Endel edition</span>
          <input type="text" defaultValue={String(ref.endelEdition ?? '')} onBlur={(e) => send({ type: 'reference', reference: { endelEdition: e.target.value } })} />
          <span>Slider position</span>
          <input type="text" defaultValue={String(ref.slider ?? '')} onBlur={(e) => send({ type: 'reference', reference: { slider: e.target.value } })} />
          <span>Endel volume</span>
          <input type="text" defaultValue={String(ref.endelVolume ?? '')} onBlur={(e) => send({ type: 'reference', reference: { endelVolume: e.target.value } })} />
          <span>Windows volume</span>
          <input type="text" defaultValue={String(ref.windowsVolume ?? '')} onBlur={(e) => send({ type: 'reference', reference: { windowsVolume: e.target.value } })} />
          <span>FxSound off</span>
          <input type="checkbox" defaultChecked={!!ref.fxSoundOff} onChange={(e) => send({ type: 'reference', reference: { fxSoundOff: e.target.checked } })} />
          <span>Heart rate connected</span>
          <input type="checkbox" defaultChecked={!!ref.heartRateConnected} onChange={(e) => send({ type: 'reference', reference: { heartRateConnected: e.target.checked } })} />
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Log
// ---------------------------------------------------------------------------------------

export function LogView({ status }: Props) {
  const ds = [...status.session.decisions].reverse();
  return (
    <div className="grid2">
      <Card title="What the engine changed" hint="Every arranger decision, the bar it was heard on, and what it moved.">
        <div className="log">
          {ds.length === 0 ? <div className="muted">No decisions yet this session.</div> : null}
          {ds.map((d) => (
            <div key={d.commit}>
              bar {d.landedBar}
              {d.landedBar !== d.requestedBar ? ` (asked ${d.requestedBar})` : ''} · {d.note ?? d.ruleId} · ramp {Math.round(d.rampSec)}s
              <br />
              <span className="muted">{d.changes.map((c) => `${c.param}=${Math.round(c.value * 1000) / 1000}`).join('  ')}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card title="System">
        <div className="log">
          {status.hotkeys.map((h) => (
            <div key={h.accelerator}>
              <span className={h.registered ? 'ok' : 'err'}>{h.registered ? '●' : '○'}</span> {h.action} — {h.accelerator}
              {h.registered ? '' : ' (taken by another app)'}
            </div>
          ))}
          {status.styleError ? <div className="err">Style file error (last valid style keeps playing):{'\n'}{status.styleError}</div> : null}
        </div>
      </Card>
    </div>
  );
}
