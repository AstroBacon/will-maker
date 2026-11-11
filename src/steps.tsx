import { FiduciaryFields, Help, RelationshipField, TextField, type PersonSuggestion } from './Fields';
import { COUNTIES, matchCounty } from './counties';
import { minorChildren } from './generate';
import { RULES } from './states';
import { emptyTier, firstName, isCouple, newId, type ChildParent, type MaritalStatus, type ResiduaryTier, type Share, type SpecificGift, type WillData } from './types';

export interface StepProps {
  data: WillData;
  set: (patch: Partial<WillData>) => void;
}

/** People already entered who could serve as executor or guardian: spouse (optional) and adult children. */
function peopleSuggestions(d: WillData, includeSpouse: boolean): PersonSuggestion[] {
  const out: PersonSuggestion[] = [];
  if (includeSpouse && d.maritalStatus === 'married' && d.spouseName.trim()) out.push({ name: d.spouseName.trim(), relationship: 'spouse' });
  for (const c of d.children) {
    if (!c.isMinor && c.name.trim()) out.push({ name: c.name.trim(), relationship: c.parent === 'spouse' ? 'stepchild' : 'child' });
  }
  return out;
}

export function StartStep({ data, set }: StepProps) {
  return (
    <>
      <h2>Let’s write your will</h2>
      <p className="lead">
        This takes about 15 minutes. You’ll answer a few plain questions, and at the end you’ll get a will to print and sign
        with two witnesses.
      </p>
      <p>
        Nothing you type is saved or sent anywhere. If you close this page, your answers are gone. To finish later, use
        “Save answers to a file” on the last step.
      </p>
      <fieldset className="card">
        <legend>Which state do you live in?</legend>
        <div className="choice-row">
          {(['GA', 'OR'] as const).map((code) => (
            <button key={code} type="button" className={`choice ${data.state === code ? 'selected' : ''}`} onClick={() => set({ state: code })}>
              {RULES[code].name}
            </button>
          ))}
        </div>
        {data.state && <p className="field-hint">{RULES[data.state].minAgeNote}</p>}
        <p className="field-hint">More states are coming. Use the state where you live permanently.</p>
      </fieldset>
      <p className="disclaimer">
        This tool fills in a will form based on your answers. It is not a lawyer and doesn’t give legal advice. Have a lawyer
        look over your will, especially if your situation is complicated: a business, property in another state, a blended
        family, or a family member with special needs.
      </p>
    </>
  );
}

export function YouStep({ data, set }: StepProps) {
  const statuses: [MaritalStatus, string][] = [
    ['married', 'Married'],
    ['single', 'Single'],
    ['divorced', 'Divorced'],
    ['widowed', 'Widowed'],
  ];
  return (
    <>
      <h2>About you</h2>
      <fieldset className="card">
        <legend>Your information</legend>
        <TextField label="Your full legal name" hint="As it appears on your driver’s license." value={data.name} onChange={(name) => set({ name })} />
        <div className="row">
          <TextField label="City or town" hint="Just the city, e.g. Lawrenceville." value={data.city} onChange={(city) => set({ city })} />
          <label className="field">
            <span className="field-label">County</span>
            <span className="field-hint">It’s on your property tax bill or voter card.</span>
            <select value={matchCounty(data.state, data.county) ?? ''} disabled={!data.state} onChange={(e) => set({ county: e.target.value })}>
              <option value="">{data.state ? 'Choose your county…' : 'Choose your state first'}</option>
              {data.state &&
                COUNTIES[data.state].map((c) => (
                  <option key={c} value={c}>
                    {c} County
                  </option>
                ))}
            </select>
          </label>
        </div>
      </fieldset>
      <fieldset className="card">
        <legend>Are you married?</legend>
        <div className="choice-row">
          {statuses.map(([value, label]) => (
            <button key={value} type="button" className={`choice ${data.maritalStatus === value ? 'selected' : ''}`} onClick={() => set({ maritalStatus: value })}>
              {label}
            </button>
          ))}
        </div>
        {data.maritalStatus === 'married' && (
          <TextField label="Your spouse’s full name" value={data.spouseName} onChange={(spouseName) => set({ spouseName })} />
        )}
      </fieldset>
      {data.maritalStatus === 'married' && (
        <fieldset className="card">
          <legend>Make a will for {firstName(data.spouseName)} at the same time?</legend>
          <div className="choice-row">
            <button type="button" className={`choice ${data.couple ? 'selected' : ''}`} onClick={() => set({ couple: true })}>
              Yes, both of us
            </button>
            <button type="button" className={`choice ${!data.couple ? 'selected' : ''}`} onClick={() => set({ couple: false })}>
              Just me
            </button>
          </div>
          <p className="field-hint">
            Each of you needs your own will. With “both of us,” you answer once and get two matching wills: each leaves
            everything to the other first, with the same backup plan. You can each still leave your own specific gifts.
          </p>
        </fieldset>
      )}
    </>
  );
}

export function ChildrenStep({ data, set }: StepProps) {
  const update = (id: string, patch: Partial<WillData['children'][number]>) =>
    set({ children: data.children.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  return (
    <>
      <h2>Your children</h2>
      <p>List all of your living children, including adopted children and children from earlier relationships.</p>
      {data.children.map((c, i) => (
        <div className="card list-item" key={c.id}>
          <TextField label={`Child ${i + 1} — full name`} value={c.name} onChange={(name) => update(c.id, { name })} />
          {data.maritalStatus === 'married' && (
            <label className="field">
              <span className="field-label">Whose child?</span>
              <select value={c.parent} onChange={(e) => update(c.id, { parent: e.target.value as ChildParent })}>
                <option value="both">Both of ours</option>
                <option value="me">Mine from another relationship</option>
                <option value="spouse">{firstName(data.spouseName)}’s from another relationship</option>
              </select>
            </label>
          )}
          <label className="check">
            <input type="checkbox" checked={c.isMinor} onChange={(e) => update(c.id, { isMinor: e.target.checked })} />
            Under 18
          </label>
          <button type="button" className="link danger" onClick={() => set({ children: data.children.filter((x) => x.id !== c.id) })}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="secondary" onClick={() => set({ children: [...data.children, { id: newId(), name: '', isMinor: false, parent: 'both' }] })}>
        + Add a child
      </button>
      {data.children.length === 0 && <p className="field-hint">No children? Just go on to the next step.</p>}
      <Help>
        The will names every child. That shows a court you didn’t forget anyone, even a child you decide not to leave
        anything to. Stepchildren don’t inherit automatically; they only get what the will gives them by name. If one of your children has died and left children of their own, mention that to your lawyer.
      </Help>
    </>
  );
}

export function ExecutorStep({ data, set }: StepProps) {
  const title = RULES[data.state || 'GA'].executorTitle;
  const people: PersonSuggestion[] = [...peopleSuggestions(data, true), { label: 'My lawyer', name: '', relationship: 'attorney' }];
  return (
    <>
      <h2>Who will handle things?</h2>
      <p>
        Your <strong>{title.toLowerCase()}</strong> takes care of your estate: they pay final bills, deal with the
        probate court, and hand out your property as the will says. Pick someone organized and trustworthy.
      </p>
      {isCouple(data) && (
        <p className="note">In {firstName(data.spouseName)}’s will, the same people are named. If you pick {firstName(data.spouseName)} here, {firstName(data.name, 'you')} is named instead in that will.</p>
      )}
      <FiduciaryFields legend="First choice" suggestions={people} value={data.executor} onChange={(executor) => set({ executor })} />
      <FiduciaryFields
        legend="Backup, if your first choice can’t do it"
        suggestions={people.filter((p) => p.name === '' || p.name !== data.executor.name.trim())}
        value={data.altExecutor}
        onChange={(altExecutor) => set({ altExecutor })}
      />
      <Help>
        <p>
          Married couples often name each other first and an adult child as the backup. Whoever you pick doesn’t have to
          live in your state, but someone nearby usually has an easier time.
        </p>
        <p>
          You can also name your lawyer. That’s a good choice if the family is spread out, doesn’t get along, or nobody
          wants the job. A lawyer will charge for the work, usually hourly or a percentage of the estate, so ask them first
          and agree on fees. Some people name a family member first and the lawyer as the backup.
        </p>
      </Help>
    </>
  );
}

export function GuardianStep({ data, set }: StepProps) {
  if (minorChildren(data).length === 0) {
    return (
      <>
        <h2>Guardian for young children</h2>
        <p>You haven’t listed any children under 18, so you can skip this step.</p>
      </>
    );
  }
  return (
    <>
      <h2>Who would raise your children?</h2>
      <p>
        If something happens to you and no parent can care for your children under 18, this person would raise them. A
        judge makes the final decision, but your choice carries a lot of weight.
      </p>
      <FiduciaryFields legend="Guardian" suggestions={peopleSuggestions(data, false)} value={data.guardian} onChange={(guardian) => set({ guardian })} />
      <FiduciaryFields legend="Backup guardian" suggestions={peopleSuggestions(data, false).filter((p) => p.name !== data.guardian.name.trim())} value={data.altGuardian} onChange={(altGuardian) => set({ altGuardian })} />
      <Help>
        If you name a married couple, think about what should happen if they separate. It’s often clearer to name one
        person.
      </Help>
    </>
  );
}

function GiftList({ gifts, onChange, whose }: { gifts: SpecificGift[]; onChange: (g: SpecificGift[]) => void; whose?: string }) {
  const update = (id: string, patch: Partial<SpecificGift>) => onChange(gifts.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  return (
    <>
      {gifts.map((g, i) => (
        <fieldset className="card" key={g.id}>
          <legend>Gift {i + 1}</legend>
          <TextField label="What" placeholder="e.g. my grandmother’s quilt" value={g.description} onChange={(description) => update(g.id, { description })} />
          <div className="row">
            <TextField label="To whom (full name)" value={g.recipient} onChange={(recipient) => update(g.id, { recipient })} />
            <RelationshipField label={whose ? `Relationship to ${whose}` : 'Relationship'} value={g.relationship} onChange={(relationship) => update(g.id, { relationship })} />
          </div>
          <label className="field">
            <span className="field-label">If they die first</span>
            <select value={g.ifRecipientDies} onChange={(e) => update(g.id, { ifRecipientDies: e.target.value as SpecificGift['ifRecipientDies'] })}>
              <option value="residue">It goes back into everything else</option>
              <option value="descendants">It goes to their children or grandchildren</option>
            </select>
          </label>
          <button type="button" className="link danger" onClick={() => onChange(gifts.filter((x) => x.id !== g.id))}>
            Remove gift
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="secondary"
        onClick={() => onChange([...gifts, { id: newId(), description: '', recipient: '', relationship: '', ifRecipientDies: 'residue' }])}
      >
        + Add a gift{whose ? ` from ${whose}` : ''}
      </button>
    </>
  );
}

export function GiftsStep({ data, set }: StepProps) {
  const couple = isCouple(data);
  return (
    <>
      <h2>Specific gifts (optional)</h2>
      <p>
        Is there a particular item or amount of money you want a specific person to have? Examples: “my wedding ring,”
        “my 2019 Ford F-150,” “$5,000.” Most people skip this or add just a few.
      </p>
      {couple && (
        <p className="note">
          A gift only takes effect when that person’s will is used. Usually that’s after the second spouse dies, because
          most couples leave everything to each other first.
        </p>
      )}
      {couple && <h3 className="group-heading">{firstName(data.name, 'Your')}’s gifts</h3>}
      <GiftList gifts={data.gifts} onChange={(gifts) => set({ gifts })} whose={couple ? firstName(data.name, 'you') : undefined} />
      {couple && (
        <>
          <h3 className="group-heading">{firstName(data.spouseName)}’s gifts</h3>
          <GiftList gifts={data.spouseGifts} onChange={(spouseGifts) => set({ spouseGifts })} whose={firstName(data.spouseName)} />
        </>
      )}
    </>
  );
}

const share = (name: string, relationship: string): Share => ({ id: newId(), name, relationship, percent: 0 });

function TierEditor({ tier, onChange, title }: { tier: ResiduaryTier; onChange: (t: ResiduaryTier) => void; title: string }) {
  const bs = tier.beneficiaries;
  const update = (id: string, patch: Partial<Share>) => onChange({ ...tier, beneficiaries: bs.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  const total = bs.reduce((s, b) => s + (Number(b.percent) || 0), 0);
  return (
    <fieldset className="card">
      <legend>{title}</legend>
      {bs.map((b) => (
        <div className="row share-row" key={b.id}>
          <TextField label="Full name" value={b.name} onChange={(name) => update(b.id, { name })} />
          <RelationshipField value={b.relationship} onChange={(relationship) => update(b.id, { relationship })} />
          {tier.split === 'percent' && bs.length > 1 && (
            <label className="field pct">
              <span className="field-label">Share %</span>
              <input type="number" min={0} max={100} value={b.percent || ''} onChange={(e) => update(b.id, { percent: Number(e.target.value) })} />
            </label>
          )}
          <button type="button" className="link danger" onClick={() => onChange({ ...tier, beneficiaries: bs.filter((x) => x.id !== b.id) })}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="secondary" onClick={() => onChange({ ...tier, beneficiaries: [...bs, share('', '')] })}>
        + Add a person
      </button>
      {bs.length > 1 && (
        <label className="field">
          <span className="field-label">How should it be split?</span>
          <select value={tier.split} onChange={(e) => onChange({ ...tier, split: e.target.value as ResiduaryTier['split'] })}>
            <option value="equal">Equally</option>
            <option value="percent">By percentage</option>
          </select>
          {tier.split === 'percent' && <span className={`field-hint ${total === 100 ? '' : 'bad'}`}>Total: {total}% (must be 100%)</span>}
        </label>
      )}
      {bs.length > 0 && (
        <label className="field">
          <span className="field-label">If one of these people dies before you, their share goes to…</span>
          <select value={tier.lapse} onChange={(e) => onChange({ ...tier, lapse: e.target.value as ResiduaryTier['lapse'] })}>
            <option value="descendants">Their children or grandchildren (if they have any)</option>
            <option value="others">{bs.length > 1 ? 'The others in this group' : 'The backup group below'}</option>
          </select>
        </label>
      )}
    </fieldset>
  );
}

export function ResidueStep({ data, set }: StepProps) {
  const married = data.maritalStatus === 'married' && data.spouseName.trim();
  const kids = data.children.filter((c) => c.name.trim());
  const kidRel = (p: ChildParent) => (p === 'spouse' ? 'stepchild' : 'child');
  const kidsTier = (): ResiduaryTier => ({ beneficiaries: kids.map((k) => share(k.name, kidRel(k.parent))), split: 'equal', lapse: 'descendants' });
  const spouseTier = (): ResiduaryTier => ({ beneficiaries: [share(data.spouseName, 'spouse')], split: 'equal', lapse: 'others' });

  return (
    <>
      <h2>Who gets everything else?</h2>
      <p>
        This is the most important part of the will. It covers your house, savings, belongings — everything not given away
        as a specific gift.
      </p>
      {(married || kids.length > 0) && (
        <div className="presets">
          <span className="field-label">Most common choices</span>
          {married && kids.length > 0 && (
            <button type="button" className="preset" onClick={() => set({ primary: spouseTier(), contingent: kidsTier() })}>
              Everything to my spouse. If my spouse dies first, split equally among my children.
            </button>
          )}
          {kids.length > 0 && (
            <button type="button" className="preset" onClick={() => set({ primary: kidsTier(), contingent: emptyTier() })}>
              Split equally among my children.
            </button>
          )}
          {married && (
            <button type="button" className="preset" onClick={() => set({ primary: spouseTier(), contingent: emptyTier() })}>
              Everything to my spouse.
            </button>
          )}
        </div>
      )}
      {isCouple(data) && (
        <p className="note">
          {firstName(data.spouseName)}’s will uses this same plan with the two of you swapped. If this says “everything to{' '}
          {firstName(data.spouseName)},” then {firstName(data.spouseName)}’s will leaves everything to {firstName(data.name, 'you')}.
        </p>
      )}
      <TierEditor title="Main group" tier={data.primary} onChange={(primary) => set({ primary })} />
      <TierEditor title="Backup group — if no one in the main group survives you" tier={data.contingent} onChange={(contingent) => set({ contingent })} />
      <Help title="What do “children or grandchildren” and the backup group mean?">
        <p>
          Say you leave everything equally to your three kids, and one of them dies before you. With “their children or
          grandchildren,” that child’s share goes to their own kids. With “the others,” the two surviving kids split it.
        </p>
        <p>
          The backup group only inherits if no one in the main group survives you. If no one at all is left, state law
          decides who inherits.
        </p>
      </Help>
    </>
  );
}
