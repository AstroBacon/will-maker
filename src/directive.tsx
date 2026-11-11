import { useState, type ReactNode } from 'react';
import type { Issue } from './checks';
import { Help, RelationshipField, TextField } from './Fields';
import type { StepProps } from './steps';
import {
  firstName,
  isCouple,
  sameName,
  type Directive,
  type GaDirective,
  type HealthPerson,
  type OrDirective,
  type OrOption,
  type StateCode,
  type WillData,
} from './types';

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

export const LINE = '______________________';
const INIT = '________';

/** A filled-in value, or a blank line to write on. */
export function Fill({ v, w = LINE }: { v?: string; w?: string }) {
  return v && v.trim() ? <span className="fill">{v.trim()}</span> : <span>{w}</span>;
}

/** A hand-initial line. Choices are never pre-marked: the person initials them in ink. */
export function Init() {
  return <span className="init">{INIT}</span>;
}

export function TextBlock({ v, lines = 3 }: { v: string; lines?: number }) {
  if (v.trim()) return <p className="typed">{v.trim()}</p>;
  return (
    <div className="blank-lines">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="blank-line" />
      ))}
    </div>
  );
}

/** People who could be a health care agent: spouse and adult children. */
export function suggestions(d: WillData, forSpouse: boolean): { name: string; relationship: string }[] {
  const out: { name: string; relationship: string }[] = [];
  const spouse = forSpouse ? d.name : d.spouseName;
  if (d.maritalStatus === 'married' && spouse.trim()) out.push({ name: spouse.trim(), relationship: 'spouse' });
  for (const c of d.children) {
    if (!c.isMinor && c.name.trim()) {
      const mine = forSpouse ? c.parent !== 'me' : c.parent !== 'spouse';
      out.push({ name: c.name.trim(), relationship: mine ? 'child' : 'stepchild' });
    }
  }
  return out;
}

export function PersonFields({
  legend,
  value,
  onChange,
  picks = [],
  hint,
}: {
  legend: string;
  value: HealthPerson;
  onChange: (p: HealthPerson) => void;
  picks?: { name: string; relationship: string }[];
  hint?: string;
}) {
  const set = (patch: Partial<HealthPerson>) => onChange({ ...value, ...patch });
  return (
    <fieldset className="card">
      <legend>{legend}</legend>
      {hint && <p className="field-hint">{hint}</p>}
      {picks.length > 0 && (
        <div className="quick">
          <span className="field-hint">Quick pick:</span>
          {picks.map((p) => (
            <button
              key={p.name}
              type="button"
              className={`chip ${sameName(value.name, p.name) ? 'selected' : ''}`}
              onClick={() => onChange({ ...value, name: p.name, relationship: p.relationship })}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
      <TextField label="Full name" value={value.name} onChange={(name) => set({ name })} />
      <div className="row">
        <RelationshipField value={value.relationship} onChange={(relationship) => set({ relationship })} />
        <TextField label="Phone (optional)" value={value.phone} onChange={(phone) => set({ phone })} />
      </div>
      <TextField label="Address (optional)" value={value.address} onChange={(address) => set({ address })} />
    </fieldset>
  );
}

export function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="check option">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

export function Radio<T extends string>({ name, value, current, onChange, children }: { name: string; value: T; current: T; onChange: (v: T) => void; children: ReactNode }) {
  return (
    <label className="check option">
      <input type="radio" name={name} checked={current === value} onChange={() => onChange(value)} />
      <span>{children}</span>
    </label>
  );
}

export function Area({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {hint && <span className="field-hint">{hint}</span>}
      <textarea rows={3} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Oregon option text (ORS 127.529 § 3.A, identical for each situation) */
/* ------------------------------------------------------------------ */

export const OR_OPTIONS: Record<Exclude<OrOption, ''>, { short: string; text: string }> = {
  '1': {
    short: 'Try all available treatments',
    text: 'I want to try all available treatments to sustain my life, such as artificial feeding and hydration with feeding tubes, IV fluids, kidney dialysis and breathing machines.',
  },
  '2': {
    short: 'Feeding tubes and IV fluids only',
    text: 'I want to try to sustain my life with artificial feeding and hydration with feeding tubes and IV fluids. I do not want other treatments to sustain my life, such as kidney dialysis and breathing machines.',
  },
  '3': {
    short: 'No life support; keep me comfortable',
    text: 'I do not want treatments to sustain my life, such as artificial feeding and hydration with feeding tubes, IV fluids, kidney dialysis or breathing machines. I want to be kept comfortable and be allowed to die naturally.',
  },
  '4': {
    short: 'Let my representative decide',
    text: 'I want my health care representative to decide for me, after talking with my health care providers and taking into account the things that matter to me. I have expressed what matters to me in section B below.',
  },
};

const OR_SITUATIONS: { key: 'terminal' | 'progressive' | 'unconscious'; letter: string; title: string; plain: string }[] = [
  { key: 'terminal', letter: 'a', title: 'Terminal Condition', plain: 'An illness that can’t be cured and that doctors expect to cause death within six months, whatever the treatment.' },
  { key: 'progressive', letter: 'b', title: 'Advanced Progressive Illness', plain: 'An advanced illness that will only get worse, where doctors believe you’ll never again be able to communicate, swallow safely, care for yourself, or recognize family.' },
  { key: 'unconscious', letter: 'c', title: 'Permanently Unconscious', plain: 'Unconscious, and doctors believe it’s very unlikely you’ll ever wake up.' },
];

const OR_ABILITIES: { key: keyof OrDirective['abilities']; text: string }[] = [
  { key: 'express', text: 'Express my needs.' },
  { key: 'pain', text: 'Be free from long-term severe pain and suffering.' },
  { key: 'know', text: 'Know who I am and who I am with.' },
  { key: 'noMachines', text: 'Live without being hooked up to mechanical life support.' },
  { key: 'activities', text: 'Participate in activities that have meaning to me, such as:' },
];

/* ------------------------------------------------------------------ */
/* Form step                                                           */
/* ------------------------------------------------------------------ */

function GaChoices({ ga, set, agentName }: { ga: GaDirective; set: (p: Partial<GaDirective>) => void; agentName: string }) {
  const agent = agentName.trim() ? firstName(agentName) : 'your health care agent';
  return (
    <>
      <fieldset className="card">
        <legend>When should your treatment wishes apply?</legend>
        <p className="field-hint">Section (6). Your wishes below only apply in the conditions you pick here.</p>
        <Check checked={ga.condTerminal} onChange={(condTerminal) => set({ condTerminal })}>
          <strong>Terminal condition:</strong> an incurable or irreversible condition that will result in my death in a relatively short period of time.
        </Check>
        <Check checked={ga.condUnconscious} onChange={(condUnconscious) => set({ condUnconscious })}>
          <strong>Permanent unconsciousness:</strong> an incurable or irreversible condition in which I am not aware of myself or my environment and show no behavioral response.
        </Check>
      </fieldset>

      <fieldset className="card">
        <legend>Your treatment preference</legend>
        <p className="field-hint">Section (7). Pick one. You’ll get comfort care, including pain relief, either way.</p>
        <Radio name="ga-pref" value="A" current={ga.preference} onChange={(preference) => set({ preference })}>
          <strong>(A) Extend my life as long as possible.</strong> Use all medications, machines, or procedures that could keep me alive, including feeding and fluids by tube.
        </Radio>
        <Radio name="ga-pref" value="B" current={ga.preference} onChange={(preference) => set({ preference })}>
          <strong>(B) Allow my natural death.</strong> No medications, machines, or procedures that could keep me alive but can’t cure me, and no feeding or fluids by tube except to give pain medication.
        </Radio>
        <Radio name="ga-pref" value="C" current={ga.preference} onChange={(preference) => set({ preference })}>
          <strong>(C) No life-prolonging treatment, except</strong> the items I pick below.
        </Radio>
        {ga.preference === 'C' && (
          <div className="sub-options">
            <Check checked={ga.cNutrition} onChange={(cNutrition) => set({ cNutrition })}>If I can’t take nutrition by mouth, I want nutrition by tube or other medical means.</Check>
            <Check checked={ga.cFluids} onChange={(cFluids) => set({ cFluids })}>If I can’t take fluids by mouth, I want fluids by tube or other medical means.</Check>
            <Check checked={ga.cVentilator} onChange={(cVentilator) => set({ cVentilator })}>If I need help to breathe, I want a ventilator used.</Check>
            <Check checked={ga.cCpr} onChange={(cCpr) => set({ cCpr })}>If my heart or pulse stops, I want CPR used.</Check>
          </div>
        )}
        <button type="button" className="link" onClick={() => set({ preference: '', cNutrition: false, cFluids: false, cVentilator: false, cCpr: false })}>
          Clear my choice
        </button>
      </fieldset>

      <fieldset className="card">
        <legend>Anything else? (optional)</legend>
        <Area
          label="Additional statements"
          hint="Section (8). For example: wishes about pain relief, surgery, dialysis, blood transfusions, or your religious values."
          value={ga.additional}
          onChange={(additional) => set({ additional })}
        />
        <Check checked={ga.pregnancy} onChange={(pregnancy) => set({ pregnancy })}>
          Section (9): I want my treatment preferences carried out if I am pregnant and the fetus is not viable. (Under Georgia law, they otherwise don’t apply during pregnancy.)
        </Check>
      </fieldset>

      <fieldset className="card">
        <legend>After death (optional)</legend>
        <p className="field-hint">Section (5). By default, {agent} can authorize an autopsy, organ or body donation, and decide on burial or cremation. Check anything you want to limit.</p>
        <Check checked={ga.noAutopsy} onChange={(noAutopsy) => set({ noAutopsy })}>Don’t allow an autopsy (unless the law requires one).</Check>
        <Check checked={ga.noMedicalStudy} onChange={(noMedicalStudy) => set({ noMedicalStudy })}>Don’t allow my body to be given to a medical study program.</Check>
        <Check checked={ga.noOrganDonation} onChange={(noOrganDonation) => set({ noOrganDonation })}>Don’t allow my organs to be donated.</Check>
        <label className="field">
          <span className="field-label">I wish for my body to be</span>
          <select value={ga.body} onChange={(e) => set({ body: e.target.value as GaDirective['body'] })}>
            <option value="">No preference (leave it to {agent})</option>
            <option value="buried">Buried</option>
            <option value="cremated">Cremated</option>
          </select>
        </label>
        <Check checked={ga.dispositionByOther} onChange={(dispositionByOther) => set({ dispositionByOther })}>
          Someone other than {agent} should decide about burial or cremation.
        </Check>
      </fieldset>
    </>
  );
}

function OrChoices({ or, set }: { or: OrDirective; set: (p: Partial<OrDirective>) => void }) {
  return (
    <>
      <p>
        Section 3 asks what you’d want in three situations. For each one, pick the option closest to your wishes. You can
        leave any of them blank.
      </p>
      {OR_SITUATIONS.map((s) => (
        <fieldset className="card" key={s.key}>
          <legend>
            {s.letter}. {s.title}
          </legend>
          <p className="field-hint">{s.plain}</p>
          {(Object.keys(OR_OPTIONS) as Exclude<OrOption, ''>[]).map((k) => (
            <Radio key={k} name={`or-${s.key}`} value={k} current={or[s.key]} onChange={(v) => set({ [s.key]: v } as Partial<OrDirective>)}>
              <strong>{OR_OPTIONS[k].short}.</strong> <span className="field-hint">{OR_OPTIONS[k].text}</span>
            </Radio>
          ))}
          <button type="button" className="link" onClick={() => set({ [s.key]: '' } as Partial<OrDirective>)}>
            Clear
          </button>
        </fieldset>
      ))}
      <fieldset className="card">
        <legend>What matters most to you (optional)</legend>
        <Area label="More about the care you want or don’t want" value={or.moreCare} onChange={(moreCare) => set({ moreCare })} />
        <Area label="What you should know about what is important to me about my life" value={or.knowAboutMe} onChange={(knowAboutMe) => set({ knowAboutMe })} />
        <Area label="What I value the most about my life" value={or.valueMost} onChange={(valueMost) => set({ valueMost })} />
        <Area label="What is important for me about my life" value={or.importantFor} onChange={(importantFor) => set({ importantFor })} />
        <p className="field-label">I do not want life-sustaining procedures if I cannot be supported and be able to:</p>
        {OR_ABILITIES.map((a) => (
          <Check key={a.key} checked={or.abilities[a.key]} onChange={(v) => set({ abilities: { ...or.abilities, [a.key]: v } })}>
            {a.text}
          </Check>
        ))}
        {or.abilities.activities && <TextField label="Activities that have meaning to me" value={or.activitiesText} onChange={(activitiesText) => set({ activitiesText })} />}
        <Area label="Anything else about what matters most to you" hint="For example: “I do not want care if it will result in…”" value={or.sayMore} onChange={(sayMore) => set({ sayMore })} />
      </fieldset>
      <fieldset className="card">
        <legend>More information (optional)</legend>
        <Area label="Spiritual or religious beliefs" hint="Rituals, sacraments, refusing blood transfusions, and so on." value={or.spiritual} onChange={(spiritual) => set({ spiritual })} />
        <Area label="Your life and values" hint="Family history, experiences with health care, cultural background, career, support system." value={or.lifeValues} onChange={(lifeValues) => set({ lifeValues })} />
        <Area label="Where you’d prefer to receive care" hint="Hospital, nursing home, adult foster home, assisted living, your home…" value={or.placeOfCare} onChange={(placeOfCare) => set({ placeOfCare })} />
        <Area label="Other documents you’re attaching" value={or.attachments} onChange={(attachments) => set({ attachments })} />
      </fieldset>
    </>
  );
}

export function DirectiveStep({ data, set }: StepProps) {
  const couple = isCouple(data);
  const [who, setWho] = useState<'a' | 'b'>('a');
  const showing = couple && who === 'b' ? 'b' : 'a';
  const dir = showing === 'a' ? data.directive : data.spouseDirective;
  const myName = showing === 'a' ? data.name : data.spouseName;
  const setDir = (patch: Partial<Directive>) =>
    set(showing === 'a' ? { directive: { ...data.directive, ...patch } } : { spouseDirective: { ...data.spouseDirective, ...patch } });
  const st: StateCode = data.state || 'GA';
  const agentWord = st === 'GA' ? 'health care agent' : 'health care representative';
  const picks = suggestions(data, showing === 'b');

  const copyFromOther = () => {
    const src = data.directive;
    const swap = (p: HealthPerson): HealthPerson => (sameName(p.name, data.spouseName) ? { ...p, name: data.name, relationship: 'spouse' } : p);
    setDir({
      ...src,
      dob: data.spouseDirective.dob,
      phone: data.spouseDirective.phone,
      agent: swap(src.agent),
      alt1: swap(src.alt1),
      alt2: swap(src.alt2),
      ga: { ...src.ga, dispositionPerson: swap(src.ga.dispositionPerson), guardianPerson: swap(src.ga.guardianPerson) },
      or: { ...src.or, inform: swap(src.or.inform) },
    });
  };

  return (
    <>
      <h2>Medical directive</h2>
      <p>
        This is your state’s official <strong>advance directive for health care</strong> form. It does two things: names
        someone to make medical decisions when you can’t, and records your wishes about life support. It’s a separate
        document from the will, signed separately.
      </p>
      <Help title="What happens if I don’t have one?">
        Without one, doctors turn to family members in an order set by state law, and they may have to guess what you’d
        want. Naming one person and writing down your wishes spares your family that burden.
      </Help>

      {couple && (
        <div className="tabs person-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={showing === 'a'} className={`tab ${showing === 'a' ? 'active' : ''}`} onClick={() => setWho('a')}>
            {firstName(data.name, 'Your')}’s directive
          </button>
          <button type="button" role="tab" aria-selected={showing === 'b'} className={`tab ${showing === 'b' ? 'active' : ''}`} onClick={() => setWho('b')}>
            {firstName(data.spouseName)}’s directive
          </button>
        </div>
      )}
      {couple && (
        <p className="note">
          Each of you signs your own directive, and your medical wishes may differ, so each one is filled out separately.
          {showing === 'b' && (
            <>
              {' '}
              <button type="button" className="link" onClick={copyFromOther}>
                Start from {firstName(data.name, 'the other')}’s answers
              </button>{' '}
              (swaps the two of you as each other’s {agentWord}).
            </>
          )}
        </p>
      )}

      <fieldset className="card">
        <legend>About {myName.trim() ? firstName(myName) : 'you'}</legend>
        <p className="field-hint">Printed at the top of the form. Leave blank to write it in by hand.</p>
        <div className="row">
          <TextField label="Date of birth" placeholder="e.g. 12/23/1978" value={dir.dob} onChange={(dob) => setDir({ dob })} />
          <TextField label="Phone" value={dir.phone} onChange={(phone) => setDir({ phone })} />
        </div>
        {st === 'OR' && <TextField label="Address" value={dir.address} onChange={(address) => setDir({ address })} />}
      </fieldset>

      <h3 className="group-heading">Who makes decisions for {myName.trim() ? firstName(myName) : 'you'}</h3>
      <p>
        Your <strong>{agentWord}</strong> makes medical decisions only when you can’t.
        {st === 'GA'
          ? ' Under Georgia law, a doctor or health care provider directly involved in your care can’t be your agent.'
          : ' Under Oregon law, they have to accept by signing the form.'}
      </p>
      <PersonFields legend={st === 'GA' ? 'Health care agent' : 'Health care representative'} value={dir.agent} onChange={(agent) => setDir({ agent })} picks={picks.filter((p) => !sameName(p.name, myName))} />
      <PersonFields
        legend="First backup"
        value={dir.alt1}
        onChange={(alt1) => setDir({ alt1 })}
        picks={picks.filter((p) => !sameName(p.name, myName) && !sameName(p.name, dir.agent.name))}
      />
      <PersonFields
        legend="Second backup (optional)"
        value={dir.alt2}
        onChange={(alt2) => setDir({ alt2 })}
        picks={picks.filter((p) => !sameName(p.name, myName) && !sameName(p.name, dir.agent.name) && !sameName(p.name, dir.alt1.name))}
      />

      <h3 className="group-heading">Your wishes</h3>
      {st === 'GA' ? (
        <>
          <GaChoices ga={dir.ga} set={(p) => setDir({ ga: { ...dir.ga, ...p } })} agentName={dir.agent.name} />
          {dir.ga.dispositionByOther && (
            <PersonFields legend="Who decides about burial or cremation" value={dir.ga.dispositionPerson} onChange={(dispositionPerson) => setDir({ ga: { ...dir.ga, dispositionPerson } })} picks={picks} />
          )}
          <fieldset className="card">
            <legend>Guardian (optional)</legend>
            <p className="field-hint">
              Part Three. If a court ever decides you need a guardian, it will appoint the person you nominate if that serves your
              best interest.
            </p>
            <Radio name="ga-guard" value="" current={dir.ga.guardian} onChange={(guardian) => setDir({ ga: { ...dir.ga, guardian } })}>
              Don’t nominate anyone
            </Radio>
            <Radio name="ga-guard" value="A" current={dir.ga.guardian} onChange={(guardian) => setDir({ ga: { ...dir.ga, guardian } })}>
              (A) My health care agent{dir.agent.name.trim() ? ` (${dir.agent.name.trim()})` : ''}
            </Radio>
            <Radio name="ga-guard" value="B" current={dir.ga.guardian} onChange={(guardian) => setDir({ ga: { ...dir.ga, guardian } })}>
              (B) Someone else
            </Radio>
          </fieldset>
          {dir.ga.guardian === 'B' && (
            <PersonFields legend="Guardian" value={dir.ga.guardianPerson} onChange={(guardianPerson) => setDir({ ga: { ...dir.ga, guardianPerson } })} picks={picks} />
          )}
        </>
      ) : (
        <>
          <OrChoices or={dir.or} set={(p) => setDir({ or: { ...dir.or, ...p } })} />
          <PersonFields
            legend="Who your representative may share your health information with (optional)"
            hint="Section 4.D. This person can be kept informed; only your representative makes decisions."
            value={dir.or.inform}
            onChange={(inform) => setDir({ or: { ...dir.or, inform } })}
            picks={picks}
          />
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Checks and the "initial these items" guide                          */
/* ------------------------------------------------------------------ */

export function checkDirective(state: StateCode | '', dir: Directive, who: string): Issue[] {
  const out: Issue[] = [];
  const w = (text: string) => out.push({ level: 'warning', step: 'directive', text: `${who}: ${text}` });
  const agentWord = state === 'OR' ? 'health care representative' : 'health care agent';
  if (!dir.agent.name.trim()) w(`no ${agentWord} is named. The form still records your wishes, but no one is authorized to speak for you.`);
  else if (sameName(dir.agent.name, dir.alt1.name) || sameName(dir.agent.name, dir.alt2.name)) w(`the same person is named as ${agentWord} and as a backup.`);
  if (state === 'GA') {
    const g = dir.ga;
    if (g.preference && !g.condTerminal && !g.condUnconscious) w('you picked a treatment preference but no condition in Section (6), so the preference would never apply. Pick at least one condition.');
    if (!g.preference && (g.condTerminal || g.condUnconscious)) w('you picked conditions in Section (6) but no treatment preference in Section (7).');
    if (g.guardian === 'A' && !dir.agent.name.trim()) w('you nominated “my health care agent” as guardian, but no agent is named.');
    if (g.dispositionByOther && !g.dispositionPerson.name.trim()) w('name the person who should decide about burial or cremation.');
  }
  if (state === 'OR') {
    const o = dir.or;
    const anyFour = [o.terminal, o.progressive, o.unconscious].includes('4');
    if (anyFour && !dir.agent.name.trim()) w('you chose “let my representative decide” but haven’t named a representative.');
  }
  return out;
}

/** The exact lines the person should initial by hand, in form order. */
export function initialsGuide(state: StateCode | '', dir: Directive): string[] {
  const out: string[] = [];
  if (state === 'OR') {
    const o = dir.or;
    for (const s of OR_SITUATIONS) {
      const k = o[s.key];
      if (k) out.push(`Section 3.A.${s.letter} (${s.title}): “${OR_OPTIONS[k].text.split('.')[0]}.”`);
    }
    for (const a of OR_ABILITIES) if (o.abilities[a.key]) out.push(`Section 3.B: “${a.text}”`);
    return out;
  }
  const g = dir.ga;
  if (g.noAutopsy) out.push('Section (5)(A): no power to authorize an autopsy.');
  if (g.noMedicalStudy) out.push('Section (5)(B): no disposition of my body for a medical study program.');
  if (g.noOrganDonation) out.push('Section (5)(B): no power to donate my organs.');
  if (g.dispositionByOther) out.push('Section (5)(C): “I want the following person to make decisions about the final disposition of my body.”');
  if (g.body) out.push(`Section (5)(C): “${g.body === 'buried' ? 'Buried' : 'Cremated'}.”`);
  if (g.condTerminal) out.push('Section (6): terminal condition.');
  if (g.condUnconscious) out.push('Section (6): state of permanent unconsciousness.');
  if (g.preference === 'A') out.push('Section (7)(A): “Try to extend my life for as long as possible…”');
  if (g.preference === 'B') out.push('Section (7)(B): “Allow my natural death to occur…”');
  if (g.preference === 'C') {
    out.push('Section (7)(C): “I do not want any medications, machines, or other medical procedures … except as follows.”');
    if (g.cNutrition) out.push('Section (7)(C): nutrition by tube.');
    if (g.cFluids) out.push('Section (7)(C): fluids by tube.');
    if (g.cVentilator) out.push('Section (7)(C): ventilator.');
    if (g.cCpr) out.push('Section (7)(C): CPR.');
  }
  if (g.pregnancy) out.push('Section (9): carry out Part Two if my fetus is not viable.');
  if (g.guardian === 'A') out.push('Section (10)(A): nominate my health care agent as guardian.');
  if (g.guardian === 'B') out.push('Section (10)(B): nominate the person named as guardian.');
  return out;
}

export const DIRECTIVE_SIGNING: Record<StateCode, string[]> = {
  GA: [
    'Read the whole form. Then initial, in ink, only the items listed for you below. The app leaves every initial line blank on purpose: your choices must be marked in your own hand.',
    'Find two witnesses who are at least 18 and of sound mind. A witness can’t be: your health care agent or a backup agent; anyone who will knowingly inherit anything from you or otherwise gain financially from your death (this usually rules out your spouse and children); or anyone directly involved in your health care.',
    'Only one witness may be an employee, agent, or medical staff member of a health care facility where you’re receiving care, and that witness can’t be directly involved in your care.',
    'Sign and date the form in front of each witness, or tell each witness the signature is yours. The witnesses don’t have to be together or present at the same time.',
    'No notary is needed.',
    'If you’re signing your will at the same sitting, the same two witnesses can sign both, as long as they meet these rules. That means neutral people, not family.',
    'Give copies to your health care agent, your family, and your doctor. Keep the original at home where it can be found easily. A copy has the same effect as the original.',
  ],
  OR: [
    'Read the whole form. Then initial, in ink, only the items listed for you below. The app leaves every initial line blank on purpose: your choices must be marked in your own hand.',
    'Sign and date Section 5. Then either have it notarized (Section 6.A) or have two adult witnesses sign (Section 6.B). A notary is often simplest.',
    'Witnesses must each watch you sign or hear you acknowledge your signature. A witness can’t be your attending health care provider or your health care representative or alternate.',
    'If you live in a long-term care facility, one witness must be someone the facility designates.',
    'Your health care representative and any alternates must sign Section 7 to accept. The appointment isn’t effective until they accept.',
    'This is not a POLST (a doctor’s order for life-sustaining treatment). If you’re seriously ill, ask your doctor about one too.',
    'Give copies to your representative, your family, and your doctor. Keep the original where it can be found easily.',
  ],
};

/* ------------------------------------------------------------------ */
/* Printed forms                                                       */
/* ------------------------------------------------------------------ */

function Person3({ p }: { p: HealthPerson }) {
  return (
    <div className="form-person">
      <div>
        Name: <Fill v={p.name} />
      </div>
      <div>
        Address: <Fill v={p.address} />
      </div>
      <div>
        Telephone Numbers: <Fill v={p.phone} /> <span className="small">(Home, Work, and Mobile)</span>
      </div>
    </div>
  );
}

/** Georgia advance directive, following the statutory form in O.C.G.A. § 31-32-4. */
function GeorgiaDirective({ name, dir }: { name: string; dir: Directive }) {
  const g = dir.ga;
  return (
    <article className="directive-document">
      <h1>Georgia Advance Directive for Health Care</h1>
      <p>
        By: <Fill v={name} /> &nbsp; Date of Birth: <Fill v={dir.dob} w="____________" />
        <br />
        <span className="small">(Print Name) (Month/Day/Year)</span>
      </p>
      <p>This advance directive for health care has four parts:</p>
      <p>
        <strong>PART ONE</strong> HEALTH CARE AGENT. This part allows you to choose someone to make health care decisions for you when you cannot (or do not want to) make health care decisions for yourself. The person you choose is called a health care agent. You may also have your health care agent make decisions for you after your death with respect to an autopsy, organ donation, body donation, and final disposition of your body. You should talk to your health care agent about this important role.
      </p>
      <p>
        <strong>PART TWO</strong> TREATMENT PREFERENCES. This part allows you to state your treatment preferences if you have a terminal condition or if you are in a state of permanent unconsciousness. PART TWO will become effective only if you are unable to communicate your treatment preferences. Reasonable and appropriate efforts will be made to communicate with you about your treatment preferences before PART TWO becomes effective. You should talk to your family and others close to you about your treatment preferences.
      </p>
      <p>
        <strong>PART THREE</strong> GUARDIANSHIP. This part allows you to nominate a person to be your guardian should one ever be needed.
      </p>
      <p>
        <strong>PART FOUR</strong> EFFECTIVENESS AND SIGNATURES. This part requires your signature and the signatures of two witnesses. You must complete PART FOUR if you have filled out any other part of this form.
      </p>
      <p>You may fill out any or all of the first three parts listed above. You must fill out PART FOUR of this form in order for this form to be effective.</p>
      <p>
        You should give a copy of this completed form to people who might need it, such as your health care agent, your family, and your physician. Keep a copy of this completed form at home in a place where it can easily be found if it is needed. Review this completed form periodically to make sure it still reflects your preferences. If your preferences change, complete a new advance directive for health care.
      </p>
      <p>Using this form of advance directive for health care is completely optional. Other forms of advance directives for health care may be used in Georgia.</p>
      <p>
        You may revoke this completed form at any time. This completed form will replace any advance directive for health care, durable power of attorney for health care, health care proxy, or living will that you have completed before completing this form.
      </p>

      <h2>PART ONE: HEALTH CARE AGENT</h2>
      <p className="bracket">
        [PART ONE will be effective even if PART TWO is not completed. A physician or health care provider who is directly involved in your health care may not serve as your health care agent. If you are married, a future divorce or annulment of your marriage will revoke the selection of your current spouse as your health care agent. If you are not married, a future marriage will revoke the selection of your health care agent unless the person you selected as your health care agent is your new spouse.]
      </p>
      <h3>(1) Health Care Agent</h3>
      <p>I select the following person as my health care agent to make health care decisions for me:</p>
      <Person3 p={dir.agent} />
      <h3>(2) Back-up Health Care Agent</h3>
      <p className="bracket">[This section is optional. PART ONE will be effective even if this section is left blank.]</p>
      <p>
        If my health care agent cannot be contacted in a reasonable time period and cannot be located with reasonable efforts or for any reason my health care agent is unavailable or unable or unwilling to act as my health care agent, then I select the following, each to act successively in the order named, as my back-up health care agent(s):
      </p>
      <Person3 p={dir.alt1} />
      <Person3 p={dir.alt2} />
      <h3>(3) General Powers of Health Care Agent</h3>
      <p>My health care agent will make health care decisions for me when I am unable to communicate my health care decisions or I choose to have my health care agent communicate my health care decisions.</p>
      <p>My health care agent will have the same authority to make any health care decision that I could make. My health care agent’s authority includes, for example, the power to:</p>
      <ul className="dash">
        <li>Admit me to or discharge me from any hospital, skilled nursing facility, hospice, or other health care facility or service;</li>
        <li>Request, consent to, withhold, or withdraw any type of health care; and</li>
        <li>Contract for any health care facility or service for me, and to obligate me to pay for these services (and my health care agent will not be financially liable for any services or care contracted for me or on my behalf).</li>
      </ul>
      <p>
        My health care agent will be my personal representative for all purposes of federal or state law related to privacy of medical records (including the Health Insurance Portability and Accountability Act of 1996) and will have the same access to my medical records that I have and can disclose the contents of my medical records to others for my ongoing health care.
      </p>
      <p>
        My health care agent may accompany me in an ambulance or air ambulance if in the opinion of the ambulance personnel protocol permits a passenger and my health care agent may visit or consult with me in person while I am in a hospital, skilled nursing facility, hospice, or other health care facility or service if its protocol permits visitation.
      </p>
      <p>My health care agent may present a copy of this advance directive for health care in lieu of the original and the copy will have the same meaning and effect as the original.</p>
      <p>I understand that under Georgia law:</p>
      <ul className="dash">
        <li>My health care agent may refuse to act as my health care agent;</li>
        <li>A court can take away the powers of my health care agent if it finds that my health care agent is not acting properly; and</li>
        <li>My health care agent does not have the power to make health care decisions for me regarding psychosurgery, sterilization, or treatment or involuntary hospitalization for mental or emotional illness, developmental disability, or addictive disease.</li>
      </ul>
      <h3>(4) Guidance for Health Care Agent</h3>
      <p>
        When making health care decisions for me, my health care agent should think about what action would be consistent with past conversations we have had, my treatment preferences as expressed in PART TWO (if I have filled out PART TWO), my religious and other beliefs and values, and how I have handled medical and other important issues in the past. If what I would decide is still unclear, then my health care agent should make decisions for me that my health care agent believes are in my best interest, considering the benefits, burdens, and risks of my current circumstances and treatment options.
      </p>
      <h3>(5) Powers of Health Care Agent After Death</h3>
      <p>
        <strong>(A) Autopsy</strong> My health care agent will have the power to authorize an autopsy of my body unless I have limited my health care agent’s power by initialing below.
      </p>
      <p className="opt">
        <Init /> (Initials) My health care agent will not have the power to authorize an autopsy of my body (unless an autopsy is required by law).
      </p>
      <p>
        <strong>(B) Organ Donation and Donation of Body</strong> My health care agent will have the power to make a disposition of any part or all of my body for medical purposes pursuant to the Georgia Revised Uniform Anatomical Gift Act, unless I have limited my health care agent’s power by initialing below.
      </p>
      <p className="bracket">[Initial each statement that you want to apply.]</p>
      <p className="opt">
        <Init /> (Initials) My health care agent will not have the power to make a disposition of my body for use in a medical study program.
      </p>
      <p className="opt">
        <Init /> (Initials) My health care agent will not have the power to donate any of my organs.
      </p>
      <p>
        <strong>(C) Final Disposition of Body</strong> My health care agent will have the power to make decisions about the final disposition of my body unless I have initialed below.
      </p>
      <p className="opt">
        <Init /> (Initials) I want the following person to make decisions about the final disposition of my body:
      </p>
      <Person3 p={g.dispositionByOther ? g.dispositionPerson : { name: '', relationship: '', address: '', phone: '' }} />
      <p>I wish for my body to be:</p>
      <p className="opt">
        <Init /> (Initials) Buried &nbsp; OR &nbsp; <Init /> (Initials) Cremated
      </p>

      <h2>PART TWO: TREATMENT PREFERENCES</h2>
      <p className="bracket">
        [PART TWO will be effective only if you are unable to communicate your treatment preferences after reasonable and appropriate efforts have been made to communicate with you about your treatment preferences. PART TWO will be effective even if PART ONE is not completed. If you have not selected a health care agent in PART ONE, or if your health care agent is not available, then PART TWO will provide your physician and other health care providers with your treatment preferences. If you have selected a health care agent in PART ONE, then your health care agent will have the authority to make all health care decisions for you regarding matters covered by PART TWO. Your health care agent will be guided by your treatment preferences and other factors described in Section (4) of PART ONE.]
      </p>
      <h3>(6) Conditions</h3>
      <p>PART TWO will be effective if I am in any of the following conditions:</p>
      <p className="bracket">[Initial each condition in which you want PART TWO to be effective.]</p>
      <p className="opt">
        <Init /> (Initials) A terminal condition, which means I have an incurable or irreversible condition that will result in my death in a relatively short period of time.
      </p>
      <p className="opt">
        <Init /> (Initials) A state of permanent unconsciousness, which means I am in an incurable or irreversible condition in which I am not aware of myself or my environment and I show no behavioral response to my environment.
      </p>
      <p>My condition will be determined in writing after personal examination by my attending physician and a second physician in accordance with currently accepted medical standards.</p>
      <h3>(7) Treatment Preferences</h3>
      <p className="bracket">
        [State your treatment preference by initialing (A), (B), or (C). If you choose (C), state your additional treatment preferences by initialing one or more of the statements following (C). You may provide additional instructions about your treatment preferences in the next section. You will be provided with comfort care, including pain relief, but you may also want to state your specific preferences regarding pain relief in the next section.]
      </p>
      <p>If I am in any condition that I initialed in Section (6) above and I can no longer communicate my treatment preferences after reasonable and appropriate efforts have been made to communicate with me about my treatment preferences, then:</p>
      <p className="opt">
        (A) <Init /> (Initials) Try to extend my life for as long as possible, using all medications, machines, or other medical procedures that in reasonable medical judgment could keep me alive. If I am unable to take nutrition or fluids by mouth, then I want to receive nutrition or fluids by tube or other medical means.
      </p>
      <p className="or">OR</p>
      <p className="opt">
        (B) <Init /> (Initials) Allow my natural death to occur. I do not want any medications, machines, or other medical procedures that in reasonable medical judgment could keep me alive but cannot cure me. I do not want to receive nutrition or fluids by tube or other medical means except as needed to provide pain medication.
      </p>
      <p className="or">OR</p>
      <p className="opt">
        (C) <Init /> (Initials) I do not want any medications, machines, or other medical procedures that in reasonable medical judgment could keep me alive but cannot cure me, except as follows:
      </p>
      <p className="bracket">[Initial each statement that you want to apply to option (C).]</p>
      <p className="opt sub">
        <Init /> (Initials) If I am unable to take nutrition by mouth, I want to receive nutrition by tube or other medical means.
      </p>
      <p className="opt sub">
        <Init /> (Initials) If I am unable to take fluids by mouth, I want to receive fluids by tube or other medical means.
      </p>
      <p className="opt sub">
        <Init /> (Initials) If I need assistance to breathe, I want to have a ventilator used.
      </p>
      <p className="opt sub">
        <Init /> (Initials) If my heart or pulse has stopped, I want to have cardiopulmonary resuscitation (CPR) used.
      </p>
      <h3>(8) Additional Statements</h3>
      <p className="bracket">
        [This section is optional. PART TWO will be effective even if this section is left blank. This section allows you to state additional treatment preferences, to provide additional guidance to your health care agent (if you have selected a health care agent in PART ONE), or to provide information about your personal and religious values about your medical treatment. For example, you may want to state your treatment preferences regarding medications to fight infection, surgery, amputation, blood transfusion, or kidney dialysis. Understanding that you cannot foresee everything that could happen to you after you can no longer communicate your treatment preferences, you may want to provide guidance to your health care agent (if you have selected a health care agent in PART ONE) about following your treatment preferences. You may want to state your specific preferences regarding pain relief.]
      </p>
      <TextBlock v={g.additional} lines={4} />
      <h3>(9) In Case of Pregnancy</h3>
      <p className="bracket">[PART TWO will be effective even if this section is left blank.]</p>
      <p>I understand that under Georgia law, PART TWO generally will have no force and effect if I am pregnant unless the fetus is not viable and I indicate by initialing below that I want PART TWO to be carried out.</p>
      <p className="opt">
        <Init /> (Initials) I want PART TWO to be carried out if my fetus is not viable.
      </p>

      <h2>PART THREE: GUARDIANSHIP</h2>
      <h3>(10) Guardianship</h3>
      <p className="bracket">
        [PART THREE is optional. This advance directive for health care will be effective even if PART THREE is left blank. If you wish to nominate a person to be your guardian in the event a court decides that a guardian should be appointed, complete PART THREE. A court will appoint a guardian for you if the court finds that you are not able to make significant responsible decisions for yourself regarding your personal support, safety, or welfare. A court will appoint the person nominated by you if the court finds that the appointment will serve your best interest and welfare. If you have selected a health care agent in PART ONE, you may (but are not required to) nominate the same person to be your guardian. If your health care agent and guardian are not the same person, your health care agent will have priority over your guardian in making your health care decisions, unless a court determines otherwise.]
      </p>
      <p className="bracket">[State your preference by initialing (A) or (B). Choose (A) only if you have also completed PART ONE.]</p>
      <p className="opt">
        (A) <Init /> (Initials) I nominate the person serving as my health care agent under PART ONE to serve as my guardian.
      </p>
      <p className="or">OR</p>
      <p className="opt">
        (B) <Init /> (Initials) I nominate the following person to serve as my guardian:
      </p>
      <Person3 p={g.guardian === 'B' ? g.guardianPerson : { name: '', relationship: '', address: '', phone: '' }} />

      <section className="keep-together">
        <h2>PART FOUR: EFFECTIVENESS AND SIGNATURES</h2>
        <p>This advance directive for health care will become effective only if I am unable or choose not to make or communicate my own health care decisions.</p>
        <p>This form revokes any advance directive for health care, durable power of attorney for health care, health care proxy, or living will that I have completed before this date.</p>
        <p>
          Unless I have initialed below and have provided alternative future dates or events, this advance directive for health care will become effective at the time I sign it and will remain effective until my death (and after my death to the extent authorized in Section (5) of PART ONE).
        </p>
        <p className="opt">
          <Init /> (Initials) This advance directive for health care will become effective on or upon ____________ and will terminate on or upon ____________.
        </p>
      </section>
      <section className="keep-together">
      <p className="bracket">
        [You must sign and date or acknowledge signing and dating this form in the presence of two witnesses. Both witnesses must be of sound mind and must be at least 18 years of age, but the witnesses do not have to be together or present with you when you sign this form.
      </p>
      <p className="bracket">A witness:</p>
      <ul className="dash bracket">
        <li>Cannot be a person who was selected to be your health care agent or back-up health care agent in PART ONE;</li>
        <li>Cannot be a person who will knowingly inherit anything from you or otherwise knowingly gain a financial benefit from your death; or</li>
        <li>Cannot be a person who is directly involved in your health care.</li>
      </ul>
      <p className="bracket">
        Only one of the witnesses may be an employee, agent, or medical staff member of the hospital, skilled nursing facility, hospice, or other health care facility in which you are receiving health care (but this witness cannot be directly involved in your health care).]
      </p>
      </section>
      <section className="keep-together">
        <p>By signing below, I state that I am emotionally and mentally capable of making this advance directive for health care and that I understand its purpose and effect.</p>
        <div className="sig-pair">
          <div>
            <div className="sig-rule" />
            <div className="sig-label">(Signature of Declarant)</div>
          </div>
          <div>
            <div className="sig-rule" />
            <div className="sig-label">(Date)</div>
          </div>
        </div>
      </section>
      <section className="keep-together">
        <p>
          The declarant signed this form in my presence or acknowledged signing this form to me. Based upon my personal observation, the declarant appeared to be emotionally and mentally capable of making this advance directive for health care and signed this form willingly and voluntarily.
        </p>
        {['First', 'Second'].map((n) => (
          <div key={n} className="witness-block">
            <div className="sig-pair">
              <div>
                <div className="sig-rule" />
                <div className="sig-label">(Signature of {n} Witness)</div>
              </div>
              <div>
                <div className="sig-rule" />
                <div className="sig-label">(Date)</div>
              </div>
            </div>
            <p>Print Name: {LINE}</p>
            <p>Address: {LINE}</p>
          </div>
        ))}
        <p className="bracket">[This form does not need to be notarized.]</p>
      </section>
    </article>
  );
}

function OrPerson({ p, rel = true }: { p: HealthPerson; rel?: boolean }) {
  return (
    <div className="form-person">
      <div>
        Name: <Fill v={p.name} />
        {rel && (
          <>
            {' '}
            Relationship: <Fill v={p.relationship} w="__________" />
          </>
        )}
      </div>
      <div>
        Telephone numbers: (Home) _____ (Work) _____ (Cell) _____ {p.phone.trim() && <Fill v={p.phone} />}
      </div>
      <div>
        Address: <Fill v={p.address} /> E-mail: {LINE}
      </div>
    </div>
  );
}

/** Oregon advance directive, following the statutory form in ORS 127.529. */
function OregonDirective({ name, dir }: { name: string; dir: Directive }) {
  const o = dir.or;
  return (
    <article className="directive-document">
      <h1>Oregon Advance Directive for Health Care</h1>
      <ul className="bullets">
        <li>
          This Advance Directive form allows you to:
          <ul className="bullets">
            <li>Share your values, beliefs, goals and wishes for health care if you are not able to express them yourself.</li>
            <li>Name a person to make your health care decisions if you could not make them for yourself. This person is called your health care representative and they must agree to act in this role.</li>
          </ul>
        </li>
        <li>Be sure to discuss your Advance Directive and your wishes with your health care representative. This will allow them to make decisions that reflect your wishes. It is recommended that you complete this entire form.</li>
        <li>The Oregon Advance Directive for Health Care form and Your Guide to the Oregon Advance Directive are available on the Oregon Health Authority’s website.</li>
        <li>In sections 1, 2, 5, 6 and 7 you appoint a health care representative.</li>
        <li>In sections 3 and 4 you provide instructions about your care.</li>
      </ul>
      <p>
        The Advance Directive form allows you to express your preferences for health care. It is not the same as Portable Orders for Life Sustaining Treatment (POLST) as defined in ORS 127.663. You can find more information about the POLST in Your Guide to the Oregon Advance Directive.
      </p>
      <p>
        This form may be used in Oregon to choose a person to make health care decisions for you if you become too sick to speak for yourself or are unable to make your own medical decisions. The person is called a health care representative. If you do not have an effective health care representative appointment and you become too sick to speak for yourself, a health care representative will be appointed for you in the order of priority set forth in ORS 127.635 (2) and this person can only decide to withhold or withdraw life sustaining treatments if you meet one of the conditions set forth in ORS 127.635 (1). This form also allows you to express your values and beliefs with respect to health care decisions and your preferences for health care.
      </p>
      <ul className="bullets">
        <li>If you have completed an advance directive in the past, this new advance directive will replace any older directive.</li>
        <li>You must sign this form for it to be effective. You must also have it witnessed by two witnesses or a notary. Your appointment of a health care representative is not effective until the health care representative accepts the appointment.</li>
        <li>If your advance directive includes directions regarding the withdrawal of life support or tube feeding, you may revoke your advance directive at any time and in any manner that expresses your desire to revoke it.</li>
        <li>In all other cases, you may revoke your advance directive at any time and in any manner as long as you are capable of making medical decisions.</li>
      </ul>

      <h2>1. ABOUT ME</h2>
      <div className="form-person">
        <div>
          Name: <Fill v={name} /> Date of Birth: <Fill v={dir.dob} w="__________" />
        </div>
        <div>
          Telephone numbers: (Home) _____ (Work) _____ (Cell) _____ {dir.phone.trim() && <Fill v={dir.phone} />}
        </div>
        <div>
          Address: <Fill v={dir.address} /> E-mail: {LINE}
        </div>
      </div>

      <h2>2. MY HEALTH CARE REPRESENTATIVE</h2>
      <p>I choose the following person as my health care representative to make health care decisions for me if I can’t speak for myself.</p>
      <OrPerson p={dir.agent} />
      <p>I choose the following people to be my alternate health care representatives if my first choice is not available to make health care decisions for me or if I cancel the first health care representative’s appointment.</p>
      <p>First alternate health care representative:</p>
      <OrPerson p={dir.alt1} />
      <p>Second alternate health care representative:</p>
      <OrPerson p={dir.alt2} />

      <h2>3. MY HEALTH CARE INSTRUCTIONS</h2>
      <p>
        This section is the place for you to express your wishes, values and goals for care. Your instructions provide guidance for your health care representative and health care providers. You can provide guidance on your care with the choices you make below. This is the case even if you do not choose a health care representative or if they cannot be reached.
      </p>
      <p>
        <strong>A. MY HEALTH CARE DECISIONS:</strong> There are three situations below for you to express your wishes. They will help you think about the kinds of life support decisions your health care representative could face. For each, choose the one option that most closely fits your wishes.
      </p>
      <h3>a. Terminal Condition</h3>
      <p>This is what I want if:</p>
      <ul className="bullets">
        <li>I have an illness that cannot be cured or reversed. AND</li>
        <li>My health care providers believe it will result in my death within six months, regardless of any treatments.</li>
      </ul>
      <OrOptionList />
      <h3>b. Advanced Progressive Illness</h3>
      <p>This is what I want if:</p>
      <ul className="bullets">
        <li>I have an illness that is in an advanced stage. AND</li>
        <li>My health care providers believe it will not improve and will very likely get worse over time and result in death. AND</li>
        <li>
          My health care providers believe I will never be able to:
          <ul className="dash">
            <li>Communicate</li>
            <li>Swallow food and water safely</li>
            <li>Care for myself</li>
            <li>Recognize my family and other people</li>
          </ul>
        </li>
      </ul>
      <OrOptionList />
      <h3>c. Permanently Unconscious</h3>
      <p>This is what I want if:</p>
      <p>I am not conscious. AND</p>
      <p>If my health care providers believe it is very unlikely that I will ever become conscious again.</p>
      <OrOptionList />
      <p>You may write in the space below or attach pages to say more about what kind of care you want or do not want.</p>
      <TextBlock v={o.moreCare} />
      <p>
        <strong>B. WHAT MATTERS MOST TO ME AND FOR ME:</strong> This section only applies when you are in a terminal condition, have an advanced progressive illness or are permanently unconscious. If you wish to use this section, you can communicate the things that are really important to you and for you. This will help your health care representative.
      </p>
      <p>This is what you should know about what is important to me about my life:</p>
      <TextBlock v={o.knowAboutMe} lines={1} />
      <p>This is what I value the most about my life:</p>
      <TextBlock v={o.valueMost} lines={1} />
      <p>This is what is important for me about my life:</p>
      <TextBlock v={o.importantFor} lines={1} />
      <p>I do not want life-sustaining procedures if I can not be supported and be able to engage in the following ways:</p>
      <p className="bracket">Initial all that apply.</p>
      {OR_ABILITIES.map((a) => (
        <p key={a.key} className="opt">
          <Init /> {a.text}
        </p>
      ))}
      <TextBlock v={o.abilities.activities ? o.activitiesText : ''} lines={1} />
      <p>If you want to say more to help your health care representative understand what matters most to you, write it here. (For example: I do not want care if it will result in....)</p>
      <TextBlock v={o.sayMore} />
      <p>
        <strong>C. MY SPIRITUAL BELIEFS</strong> Do you have spiritual or religious beliefs you want your health care representative and those taking care of you to know? They can be rituals, sacraments, denying blood product transfusions and more. You may write in the space below or attach pages to say more about your spiritual or religious beliefs.
      </p>
      <TextBlock v={o.spiritual} />

      <h2>4. MORE INFORMATION</h2>
      <p>Use this section if you want your health care representative and health care providers to have more information about you.</p>
      <p>
        <strong>A. LIFE AND VALUES</strong> Below you can share about your life and values. This can help your health care representative and health care providers make decisions about your health care. This might include family history, experiences with health care, cultural background, career, social support system and more. You may write in the space below or attach pages to say more about your life, beliefs and values.
      </p>
      <TextBlock v={o.lifeValues} />
      <p>
        <strong>B. PLACE OF CARE:</strong> If there is a choice about where you receive care, what do you prefer? Are there places you want or do not want to receive care? (For example, a hospital, a nursing home, a mental health facility, an adult foster home, assisted living, your home.) You may write in the space below or attach pages to say more about where you prefer to receive care or not receive care.
      </p>
      <TextBlock v={o.placeOfCare} />
      <p>
        <strong>C. OTHER:</strong> You may attach to this form other documents you think will be helpful to your health care representative and health care providers. What you attach will be part of your Advance Directive. You may list documents you have attached in the space below.
      </p>
      <TextBlock v={o.attachments} />
      <p>
        <strong>D. INFORM OTHERS:</strong> You can allow your health care representative to authorize your health care providers to the extent permitted by state and federal privacy laws to discuss your health status and care with the people you write in below. Only your health care representative can make decisions about your care.
      </p>
      <OrPerson p={o.inform} />

      <section className="keep-together">
        <h2>5. MY SIGNATURE</h2>
        <p>
          My signature: {LINE} &nbsp; Date: __________
        </p>
      </section>
      <section className="keep-together">
        <h2>6. WITNESS</h2>
        <p>
          <strong>COMPLETE EITHER A OR B WHEN YOU SIGN</strong>
        </p>
        <p>
          <strong>A. NOTARY:</strong>
        </p>
        <p>
          State of ____________ County of ____________
          <br />
          Signed or attested before me on _____, 2___, by {LINE}.
        </p>
        <p>
          ________________________
          <br />
          Notary Public - State of Oregon
        </p>
        <p>
          <strong>B. WITNESS DECLARATION:</strong> The person completing this form is personally known to me or has provided proof of identity, has signed or acknowledged the person’s signature on the document in my presence and appears to be not under duress and to understand the purpose and effect of this form. In addition, I am not the person’s health care representative or alternative health care representative, and I am not the person’s attending health care provider.
        </p>
        <p>Witness Name (print): {LINE} Signature: {LINE} Date: __________</p>
        <p>Witness Name (print): {LINE} Signature: {LINE} Date: __________</p>
      </section>
      <section className="keep-together">
        <h2>7. ACCEPTANCE BY MY HEALTH CARE REPRESENTATIVE</h2>
        <p>I accept this appointment and agree to serve as health care representative.</p>
        {[
          ['Health care representative', dir.agent.name],
          ['First alternate health care representative', dir.alt1.name],
          ['Second alternate health care representative', dir.alt2.name],
        ].map(([label, n]) => (
          <p key={label}>
            {label}:
            <br />
            Printed name: <Fill v={n} /> Signature or other verification of acceptance: {LINE} Date: __________
          </p>
        ))}
      </section>
    </article>
  );
}

function OrOptionList() {
  return (
    <>
      <p className="bracket">Initial one option only.</p>
      {(Object.keys(OR_OPTIONS) as Exclude<OrOption, ''>[]).map((k) => (
        <p key={k} className="opt">
          <Init /> {OR_OPTIONS[k].text}
        </p>
      ))}
    </>
  );
}

export function DirectiveDocument({ state, name, dir }: { state: StateCode | ''; name: string; dir: Directive }) {
  return state === 'OR' ? <OregonDirective name={name} dir={dir} /> : <GeorgiaDirective name={name} dir={dir} />;
}
