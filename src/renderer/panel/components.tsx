import { useEffect, useState } from 'react';
import type { ParamMeta } from '../../shared/ipc.ts';
import { fmt } from './state.ts';

/** Slider that keeps its own value while dragging (status updates don't fight the hand). */
export function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
  className?: string;
  title?: string;
}) {
  const [local, setLocal] = useState(props.value);
  const [drag, setDrag] = useState(false);
  useEffect(() => {
    if (!drag) setLocal(props.value);
  }, [props.value, drag]);
  return (
    <div className={`slider ${props.className ?? ''}`} title={props.title}>
      <label>{props.label}</label>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={local}
        onPointerDown={() => setDrag(true)}
        onPointerUp={() => setDrag(false)}
        onBlur={() => setDrag(false)}
        onChange={(e) => {
          const v = Number(e.target.value);
          setLocal(v);
          props.onChange(v);
        }}
      />
      <span className="val">
        {fmt(local, props.unit, props.step)}
        {props.unit ? <small>{props.unit}</small> : null}
      </span>
    </div>
  );
}

export function ParamSlider(props: { meta: ParamMeta; value: number; onChange: (v: number) => void; label?: string }) {
  const { meta } = props;
  return (
    <Slider
      label={props.label ?? meta.name}
      value={props.value ?? meta.init}
      min={meta.min}
      max={meta.max}
      step={meta.step || 0.001}
      unit={meta.unit}
      onChange={props.onChange}
    />
  );
}

/** 16-step pattern editor for a bit mask (bit i = step i). */
export function StepGrid(props: { mask: number; onChange: (mask: number) => void }) {
  const m = Math.round(props.mask);
  return (
    <div className="steps">
      {Array.from({ length: 16 }, (_, i) => {
        const on = ((m >> i) & 1) === 1;
        return (
          <button
            key={i}
            className={on ? 'on' : ''}
            title={`step ${i + 1}`}
            onClick={() => props.onChange(on ? m & ~(1 << i) : m | (1 << i))}
          />
        );
      })}
    </div>
  );
}

export function Card(props: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="card">
      <h2>{props.title}</h2>
      {props.hint ? <p className="hint">{props.hint}</p> : null}
      {props.children}
    </section>
  );
}

export function Meter(props: { value: number; min: number; max: number }) {
  const pct = Math.max(0, Math.min(1, (props.value - props.min) / (props.max - props.min))) * 100;
  return (
    <div className="meter">
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}
