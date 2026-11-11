import { useState, type ReactNode } from 'react';
import type { Fiduciary } from './types';

export function TextField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{props.label}</span>
      {props.hint && <span className="field-hint">{props.hint}</span>}
      <input
        type="text"
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </label>
  );
}

export function Help({ title = 'Why does this matter?', children }: { title?: string; children: ReactNode }) {
  return (
    <details className="help">
      <summary>{title}</summary>
      <div>{children}</div>
    </details>
  );
}

export const RELATIONSHIPS = [
  'spouse', 'wife', 'husband',
  'son', 'daughter', 'child',
  'stepson', 'stepdaughter', 'stepchild',
  'grandson', 'granddaughter',
  'brother', 'sister', 'mother', 'father',
  'son-in-law', 'daughter-in-law',
  'nephew', 'niece', 'cousin', 'aunt', 'uncle',
  'friend', 'attorney', 'financial advisor',
];
const OTHER = '__other';

/** Dropdown of common relationships, with "Other" for anything else. */
export function RelationshipField({ label = 'Relationship', value, onChange }: { label?: string; value: string; onChange: (v: string) => void }) {
  const known = RELATIONSHIPS.includes(value.trim().toLowerCase());
  const [otherMode, setOtherMode] = useState(!known && value.trim() !== '');
  const showOther = otherMode || (!known && value.trim() !== '');
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select
        value={showOther ? OTHER : value.trim().toLowerCase()}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setOtherMode(true);
            onChange('');
          } else {
            setOtherMode(false);
            onChange(e.target.value);
          }
        }}
      >
        <option value="">Choose…</option>
        {RELATIONSHIPS.map((r) => (
          <option key={r} value={r}>
            {r[0].toUpperCase() + r.slice(1)}
          </option>
        ))}
        <option value={OTHER}>Other (type it in)</option>
      </select>
      {showOther && (
        <input type="text" autoComplete="off" placeholder="e.g. godson, longtime neighbor" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label} (other)`} />
      )}
    </label>
  );
}

export interface PersonSuggestion {
  name: string;
  relationship: string;
  /** Button text when it differs from the name (e.g. "My lawyer", which fills only the relationship). */
  label?: string;
}

export function FiduciaryFields({
  value,
  onChange,
  legend,
  suggestions = [],
}: {
  value: Fiduciary;
  onChange: (f: Fiduciary) => void;
  legend: string;
  suggestions?: PersonSuggestion[];
}) {
  const set = (patch: Partial<Fiduciary>) => onChange({ ...value, ...patch });
  return (
    <fieldset className="card">
      <legend>{legend}</legend>
      {suggestions.length > 0 && (
        <div className="quick">
          <span className="field-hint">Quick pick:</span>
          {suggestions.map((s) => (
            <button
              key={s.label ?? s.name}
              type="button"
              className={`chip ${value.relationship === s.relationship && (s.name === '' || value.name === s.name) ? 'selected' : ''}`}
              onClick={() => onChange({ name: s.name, relationship: s.relationship, cityState: '' })}
            >
              {s.label ?? s.name}
            </button>
          ))}
          <span className="field-hint">or type anyone below.</span>
        </div>
      )}
      <TextField
        label="Full name"
        hint={value.relationship === 'attorney' ? 'Your lawyer’s full name (the person, not the law firm).' : undefined}
        value={value.name}
        onChange={(name) => set({ name })}
      />
      <div className="row">
        <RelationshipField label="Relationship to you" value={value.relationship} onChange={(relationship) => set({ relationship })} />
        <TextField label="City and state" value={value.cityState} placeholder="e.g. Athens, Georgia" onChange={(cityState) => set({ cityState })} />
      </div>
    </fieldset>
  );
}
