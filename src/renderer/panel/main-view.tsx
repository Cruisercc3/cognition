// The main screen: Play, the variation family (or Auto), the Deep Work studies, the Field
// engine's line (with its own Auto); one Ambient <-> Techno dial and volume under Play. Everything else
// lives in the Studio.

import { useEffect, useState } from 'react';
import type { StatusUpdate } from '../../shared/ipc.ts';
import { autoOf, lineOfAuto, type VariationInfo } from '../../shared/style/family.ts';
import { send } from './state.ts';

/** A slider that keeps its own value while dragging and sends at most once per frame. */
function Dial(props: {
  value: number;
  min: number;
  max: number;
  step: number;
  left: string;
  right: string;
  label: string;
  readout?: string;
  marker?: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const [local, setLocal] = useState(props.value);
  const [drag, setDrag] = useState(false);
  useEffect(() => {
    if (!drag) setLocal(props.value);
  }, [props.value, drag]);
  const markerPct = props.marker === undefined ? null : ((props.marker - props.min) / (props.max - props.min)) * 100;
  return (
    <div className={`dial ${props.disabled ? 'disabled' : ''}`}>
      <div className="dial-head">
        <span className="dial-label">{props.label}</span>
        {props.readout ? <span className="dial-readout">{props.readout}</span> : null}
      </div>
      <div className="dial-track">
        {markerPct !== null ? <span className="dial-marker" style={{ left: `${markerPct}%` }} title="as authored" /> : null}
        <input
          type="range"
          min={props.min}
          max={props.max}
          step={props.step}
          value={local}
          disabled={props.disabled}
          aria-label={props.label}
          onPointerDown={() => setDrag(true)}
          onPointerUp={() => setDrag(false)}
          onBlur={() => setDrag(false)}
          onChange={(e) => {
            const v = Number(e.target.value);
            setLocal(v);
            props.onChange(v);
          }}
        />
      </div>
      <div className="dial-ends">
        <span>{props.left}</span>
        <span>{props.right}</span>
      </div>
    </div>
  );
}

const BUILD_WORDS: Record<NonNullable<StatusUpdate['build']>['phase'], string> = {
  build: 'building',
  body: 'full',
  ebb: 'breathing out',
  flow: 'building again'
};

/** The build at a glance: one dot per element that can play, filled while it plays. */
function BuildDots({ build }: { build: NonNullable<StatusUpdate['build']> }) {
  const n = Math.max(build.top, build.present.length);
  return (
    <span className="build-dots" title={build.present.join(' · ')}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={i < build.present.length ? 'on' : ''} />
      ))}
    </span>
  );
}

/** rAF-throttled sender for a slider command. */
function throttled(make: (v: number) => Parameters<typeof send>[0]): (v: number) => void {
  let raf = 0;
  let last = 0;
  return (v: number) => {
    last = v;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      send(make(last));
    });
  };
}
const sendPulse = throttled((value) => ({ type: 'setPulse', value }));
const sendVolume = throttled((value) => ({ type: 'setVolume', value }));

function elapsed(startedAt: string | null): string {
  if (!startedAt) return '';
  const s = Math.max(0, Math.floor((Date.now() - Date.parse(startedAt)) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export function MainView({ status, onStudio }: { status: StatusUpdate; onStudio: () => void }) {
  const s = status.session;
  const [, tick] = useState(0);
  useEffect(() => {
    if (!s.playing) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [s.playing]);

  const family = status.variations.filter((v) => v.group === 'family');
  const studies = status.variations.filter((v) => v.group === 'study');
  const references = status.variations.filter((v) => v.group === 'reference');
  const autoLine = status.lines.find((l) => l.id === lineOfAuto(status.selection));
  const engineOf = (id: string) => byIdLine.get(id) ?? 'pulse';
  const byIdLine = new Map(status.variations.filter((v) => v.group === 'line').map((v) => [v.id, v.line!]));
  const activeEngine = autoLine ? autoLine.id : engineOf(status.activeId);
  const [engine, setEngine] = useState<string>(activeEngine);
  useEffect(() => setEngine(activeEngine), [activeEngine]);
  const byId = new Map(status.variations.map((v) => [v.id, v]));
  const active = byId.get(status.activeId);
  const frozenActive = !!active?.frozen;
  const auto = status.selection === 'auto' || !!autoLine;

  const b = status.build;
  let line = 'Ready';
  if (s.playing && active) {
    if (status.morph) line = `${byId.get(status.morph.fromId)?.name ?? ''} → ${byId.get(status.morph.toId)?.name ?? ''} · blending`;
    else line = `${active.name} · ${b ? BUILD_WORDS[b.phase] : 'playing'}`;
    line += ` · ${elapsed(s.startedAt)}`;
  }

  const shown: VariationInfo | undefined = auto ? (s.playing ? active : byId.get(status.activeId)) : byId.get(status.selection);
  const autoText = `${
    autoLine
      ? `Auto moves through ${autoLine.name} on its own — one neighbouring world at a time, as a slow blend.`
      : 'Auto moves through the family on its own — one neighbour at a time, every 10–18 minutes, as a slow blend.'
  }${s.playing && active ? ` Now: ${active.name}.` : ''}`;

  const pickButton = (v: VariationInfo) => {
    const playingHere = s.playing && status.activeId === v.id;
    const target = status.morph?.toId === v.id;
    return (
      <button
        key={v.id}
        className={`variation ${status.selection === v.id ? 'sel' : ''} ${playingHere ? 'live' : ''}`}
        title={v.group === 'study' || v.group === 'line' ? `${v.tagline}\n\n${v.description}` : v.description}
        onClick={() => send({ type: 'select', selection: v.id })}
      >
        <span className="v-name">
          {v.name}
          {v.use ? <span className="v-use">{v.use.name}</span> : null}
          {playingHere ? <span className="v-live">{target ? 'blending in' : 'playing'}</span> : null}
        </span>
        <span className="v-tag">{v.tagline}</span>
      </button>
    );
  };

  const vol = status.volumeDb;
  return (
    <div className="simple">
      <header className="simple-top">
        <span className="brand">cognition</span>
        <span className={`status-line ${s.playing ? 'on' : ''}`}>
          <span className="dot" />
          {line}
          {s.playing && b && !status.morph ? <BuildDots build={b} /> : null}
        </span>
        <button className="studio-link" onClick={onStudio} title="Workshop, macros, bench, log, output device">
          Studio ›
        </button>
      </header>

      <section className="hero">
        {s.playing ? (
          <button className="play stop" onClick={() => send({ type: 'stop' })}>
            Stop
          </button>
        ) : (
          <button className="play" onClick={() => send({ type: 'play' })} disabled={!status.variations.length}>
            Play
          </button>
        )}
        <label className="gentle" title="Layers fade in over about three minutes">
          <input
            type="checkbox"
            checked={s.introScale > 0}
            onChange={(e) => send({ type: 'setIntroScale', value: e.target.checked ? 1 : 0 })}
          />
          Gentle start
        </label>
      </section>

      {/* the two dials sit under Play, so they stay in view however long the list of places grows */}
      <section className="dials">
        <Dial
          label="Character"
          left="Ambient"
          right="Techno"
          min={0}
          max={1}
          step={0.01}
          value={status.pulse}
          marker={0.5}
          disabled={frozenActive}
          readout={frozenActive ? 'reference is fixed' : Math.abs(status.pulse - 0.5) < 0.01 ? 'as authored' : ''}
          onChange={sendPulse}
        />
        <Dial
          label="Volume"
          left="quieter"
          right="louder"
          min={-30}
          max={6}
          step={0.5}
          value={vol}
          marker={0}
          readout={`${vol > 0 ? '+' : ''}${vol.toFixed(1)} dB`}
          onChange={sendVolume}
        />
      </section>

      <div className="engines" role="tablist" aria-label="Engine">
        <button role="tab" aria-selected={engine === 'pulse'} className={`engine ${engine === 'pulse' ? 'on' : ''}`} onClick={() => setEngine('pulse')}>
          <span className="e-name">Pulse</span>
          <span className="e-tag">Deep Work and its family · a beat over a warm bed</span>
          {s.playing && activeEngine === 'pulse' ? <span className="v-live">playing</span> : null}
        </button>
        {status.lines.map((l) => (
          <button key={l.id} role="tab" aria-selected={engine === l.id} className={`engine ${engine === l.id ? 'on' : ''}`} onClick={() => setEngine(l.id)}>
            <span className="e-name">{l.name}</span>
            <span className="e-tag">new · {l.about}</span>
            {s.playing && activeEngine === l.id ? <span className="v-live">playing</span> : null}
          </button>
        ))}
      </div>

      {engine === 'pulse' ? (
        <section className="family" aria-label="Variation">
          <button className={`variation auto ${status.selection === 'auto' ? 'sel' : ''}`} onClick={() => send({ type: 'select', selection: 'auto' })}>
            <span className="v-name">Auto</span>
            <span className="v-tag">Let it move between the variations</span>
          </button>
          <div className="family-axis">ambient end · slower</div>
          <div className="family-grid">{family.map(pickButton)}</div>
          <div className="family-axis">techno end · faster</div>
          {studies.length ? (
            <>
              <div className="family-axis studies-axis">Deep Work studies · experiments, not part of Auto</div>
              <div className="family-grid studies-grid">{studies.map(pickButton)}</div>
            </>
          ) : null}
          {references.map((r) => (
            <button
              key={r.id}
              className={`variation reference ${status.selection === r.id ? 'sel' : ''}`}
              onClick={() => send({ type: 'select', selection: r.id })}
            >
              <span className="v-name">
                {r.name}
                <span className="v-ref">reference · frozen</span>
                {s.playing && status.activeId === r.id ? <span className="v-live">playing</span> : null}
              </span>
              <span className="v-tag">{r.tagline}</span>
            </button>
          ))}
        </section>
      ) : (
        status.lines
          .filter((l) => l.id === engine)
          .map((l) => (
            <section key={l.id} className="family" aria-label={l.name}>
              <button
                className={`variation auto ${status.selection === autoOf(l.id) ? 'sel' : ''}`}
                onClick={() => send({ type: 'select', selection: autoOf(l.id) })}
              >
                <span className="v-name">Auto</span>
                <span className="v-tag">Let it move between the worlds of {l.name}, one neighbour at a time</span>
              </button>
              <div className="family-axis">still · no beat</div>
              <div className="family-grid">{status.variations.filter((v) => v.group === 'line' && v.line === l.id).map(pickButton)}</div>
              <div className="family-axis">moving · a pulse made of tone</div>
            </section>
          ))
      )}

      {auto ? (
        <p className="describe">{autoText}</p>
      ) : (
        <div className="describe">
          {shown?.use ? (
            <p className="use-for">
              <b>{shown.use.name}</b> · {shown.use.for}
            </p>
          ) : null}
          {shown?.use?.why ? <p className="use-why">Why: {shown.use.why}</p> : <p>{shown?.description ?? ''}</p>}
        </div>
      )}


    </div>
  );
}
