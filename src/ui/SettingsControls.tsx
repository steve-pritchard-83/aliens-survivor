import { useId } from 'react';
import { GREEN } from './uiStyles';

const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 } as const;
const labelStyle = { color: '#aaffd4', fontSize: 14 } as const;

function chip(active: boolean) {
  return {
    padding: '4px 10px',
    background: active ? GREEN : 'transparent',
    color: active ? '#000' : GREEN,
    border: `1px solid ${GREEN}`,
    borderRadius: 3,
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: 'inherit'
  } as const;
}

export interface Choice<T> {
  value: T;
  label: string;
}

/** A row of mutually exclusive options. */
export function ChoiceRow<T extends string | number>({
  label,
  value,
  choices,
  onChange
}: {
  label: string;
  value: T;
  choices: readonly Choice<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <div style={rowStyle} role="group" aria-label={label}>
      <span style={labelStyle}>{label}</span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {choices.map((c) => (
          <button
            key={c.label}
            type="button"
            aria-pressed={c.value === value}
            onClick={() => onChange(c.value)}
            style={chip(c.value === value)}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** An ON/OFF switch. */
export function ToggleRow({
  label,
  value,
  onChange
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        style={chip(value)}
      >
        {value ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

/** A labelled range input with its current value shown. */
export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div style={rowStyle}>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: 150 }}
        />
        <span aria-hidden="true" style={{ ...labelStyle, width: 44, textAlign: 'right' }}>
          {format(value)}
        </span>
      </div>
    </div>
  );
}
