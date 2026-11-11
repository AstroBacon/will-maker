import { assetLabel, checkAssets } from './checks';
import { Help, TextField } from './Fields';
import type { StepProps } from './steps';
import { firstName, isCouple, newId, type Asset, type AssetKind, type ExecutorInfo, type PassesBy, type WillData } from './types';

interface KindInfo {
  label: string;
  add: string;
  placeholder: string;
  institution: string;
  defaultPasses: PassesBy;
}

export const KINDS: Record<AssetKind, KindInfo> = {
  bank: { label: 'Bank accounts', add: 'Bank account', placeholder: 'e.g. Checking account', institution: 'Bank or credit union', defaultPasses: 'unsure' },
  retirement: { label: 'Retirement accounts', add: 'Retirement (401k, IRA, pension)', placeholder: 'e.g. 401(k) from work', institution: 'Company holding it', defaultPasses: 'beneficiary' },
  investment: { label: 'Investment accounts', add: 'Investment / brokerage', placeholder: 'e.g. Brokerage account', institution: 'Company', defaultPasses: 'unsure' },
  insurance: { label: 'Life insurance', add: 'Life insurance', placeholder: 'e.g. Term life policy through work', institution: 'Insurance company', defaultPasses: 'beneficiary' },
  real_estate: { label: 'Home and land', add: 'Home or land', placeholder: 'e.g. Our house at 12 Oak St.', institution: 'Mortgage lender (if any)', defaultPasses: 'unsure' },
  vehicle: { label: 'Vehicles', add: 'Vehicle', placeholder: 'e.g. 2019 Ford F-150', institution: 'Lender (if any)', defaultPasses: 'will' },
  other: { label: 'Other', add: 'Something else', placeholder: 'e.g. Safe deposit box, business, collectibles', institution: 'Company or location', defaultPasses: 'will' },
  debt: { label: 'Debts', add: 'Debt (mortgage, loan, card)', placeholder: 'e.g. Home mortgage', institution: 'Lender', defaultPasses: 'will' },
};

const ORDER: AssetKind[] = ['bank', 'retirement', 'investment', 'insurance', 'real_estate', 'vehicle', 'other', 'debt'];

const PASSES: Record<PassesBy, string> = {
  beneficiary: 'A named beneficiary (or “payable on death”)',
  joint: 'The surviving co-owner (joint account or deed)',
  will: 'My will',
  unsure: 'I’m not sure',
};

const PASSES_SHORT: Record<PassesBy, string> = {
  beneficiary: 'Named beneficiary',
  joint: 'Surviving co-owner',
  will: 'Will',
  unsure: 'Unknown — check',
};

function ownerLabel(d: WillData, o: Asset['owner']) {
  if (o === 'joint') return 'Joint';
  return firstName(o === 'me' ? d.name : d.spouseName, o === 'me' ? 'Me' : 'Spouse');
}

function AssetCard({ a, d, onChange, onRemove }: { a: Asset; d: WillData; onChange: (p: Partial<Asset>) => void; onRemove: () => void }) {
  const k = KINDS[a.kind];
  const debt = a.kind === 'debt';
  return (
    <fieldset className="card">
      <legend>{k.add}</legend>
      <TextField label="What is it?" placeholder={k.placeholder} value={a.description} onChange={(description) => onChange({ description })} />
      <div className="row">
        <TextField label={k.institution} value={a.institution} onChange={(institution) => onChange({ institution })} />
        {a.kind !== 'real_estate' && a.kind !== 'vehicle' && (
          <label className="field pct">
            <span className="field-label">Last 4 digits</span>
            <input type="text" autoComplete="off" inputMode="numeric" maxLength={4} value={a.last4} onChange={(e) => onChange({ last4: e.target.value.replace(/\D/g, '') })} />
          </label>
        )}
      </div>
      <div className="row">
        {d.maritalStatus === 'married' && (
          <label className="field">
            <span className="field-label">{debt ? 'Whose debt?' : 'Whose name is it in?'}</span>
            <select value={a.owner} onChange={(e) => onChange({ owner: e.target.value as Asset['owner'] })}>
              <option value="me">{firstName(d.name, 'Mine')}</option>
              <option value="spouse">{firstName(d.spouseName)}</option>
              <option value="joint">Both of us (joint)</option>
            </select>
          </label>
        )}
        <TextField label={debt ? 'About how much is owed?' : 'About how much is it worth? (optional)'} value={a.value} onChange={(value) => onChange({ value })} />
      </div>
      {!debt && (
        <label className="field">
          <span className="field-label">When you die, who decides where it goes?</span>
          <select value={a.passesBy} onChange={(e) => onChange({ passesBy: e.target.value as PassesBy })}>
            {(Object.keys(PASSES) as PassesBy[]).map((p) => (
              <option key={p} value={p}>
                {PASSES[p]}
              </option>
            ))}
          </select>
        </label>
      )}
      {!debt && a.passesBy === 'beneficiary' && (
        <TextField
          label="Who is named as beneficiary?"
          hint="Copy it from the account’s beneficiary form, including any backup (“contingent”) beneficiary. Leave blank if you don’t know."
          placeholder="e.g. Jane Doe; backup: John Doe and Mary Doe"
          value={a.beneficiary}
          onChange={(beneficiary) => onChange({ beneficiary })}
        />
      )}
      <TextField label="Notes for your executor (optional)" placeholder="e.g. Statements come by email; HR contact is Jan at ext. 4410" value={a.notes} onChange={(notes) => onChange({ notes })} />
      <button type="button" className="link danger" onClick={onRemove}>
        Remove
      </button>
    </fieldset>
  );
}

function TextArea({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {hint && <span className="field-hint">{hint}</span>}
      <textarea rows={3} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function AssetsStep({ data, set }: StepProps) {
  const update = (id: string, patch: Partial<Asset>) => set({ assets: data.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  const add = (kind: AssetKind) =>
    set({
      assets: [
        ...data.assets,
        { id: newId(), kind, description: '', institution: '', last4: '', owner: data.maritalStatus === 'married' ? 'joint' : 'me', passesBy: KINDS[kind].defaultPasses, beneficiary: '', value: '', notes: '' },
      ],
    });
  const setInfo = (patch: Partial<ExecutorInfo>) => set({ info: { ...data.info, ...patch } });
  const flags = checkAssets(data);

  return (
    <>
      <h2>Asset list for your executor (optional)</h2>
      <p>
        This list is <strong>not part of your will</strong>. You print it separately and keep it with the will, so whoever
        handles your estate knows what you have and where to find it. You can skip it now and come back any time.
      </p>
      <Help title="Why does the app ask who decides where each thing goes?">
        <p>
          Life insurance, retirement accounts, and accounts marked “payable on death” go to the beneficiary named on the
          account’s form, no matter what your will says. Joint accounts and homes owned jointly usually pass straight to
          the other owner. Your will only controls what’s left.
        </p>
        <p>The app will point out anything that doesn’t look right, like a child under 18 named as a beneficiary.</p>
      </Help>
      <p className="note">Don’t enter full account numbers or passwords. Last 4 digits are enough for your executor to find an account.</p>

      {ORDER.filter((k) => data.assets.some((a) => a.kind === k)).map((k) => (
        <div key={k}>
          <h3 className="group-heading">{KINDS[k].label}</h3>
          {data.assets
            .filter((a) => a.kind === k)
            .map((a) => (
              <AssetCard key={a.id} a={a} d={data} onChange={(p) => update(a.id, p)} onRemove={() => set({ assets: data.assets.filter((x) => x.id !== a.id) })} />
            ))}
        </div>
      ))}

      <div className="add-grid">
        {ORDER.map((k) => (
          <button key={k} type="button" className="secondary" onClick={() => add(k)}>
            + {KINDS[k].add}
          </button>
        ))}
      </div>

      {flags.length > 0 && (
        <ul className="issues">
          {flags.map((f, i) => (
            <li key={i} className={`issue ${f.level}`}>
              <span className="issue-icon" aria-hidden>{f.level === 'warning' ? '!' : 'i'}</span>
              <span>{f.text}</span>
            </li>
          ))}
        </ul>
      )}

      <fieldset className="card">
        <legend>Other things your executor should know</legend>
        <TextArea label="Where important papers are kept" hint="The original will, deed, car titles, insurance policies, tax returns." value={data.info.documents} onChange={(documents) => setInfo({ documents })} />
        <TextArea label="People to contact" hint="Accountant, financial advisor, insurance agent, employer’s HR, lawyer." value={data.info.contacts} onChange={(contacts) => setInfo({ contacts })} />
        <TextArea label="Phone, computer, and online accounts" hint="Where to find passwords (for example, a password manager or a notebook in the desk). Don’t write passwords here." value={data.info.digital} onChange={(digital) => setInfo({ digital })} />
        <TextArea label="Funeral or burial wishes" hint="Not legally binding, but it helps your family. Mention any prepaid plan or cemetery plot." value={data.info.wishes} onChange={(wishes) => setInfo({ wishes })} />
      </fieldset>
    </>
  );
}

export const hasAssetList = (d: WillData) => d.assets.length > 0 || Object.values(d.info).some((v) => v.trim());

/** Printable inventory. Deliberately styled and titled so it can't be mistaken for part of the will. */
export function AssetDocument({ data }: { data: WillData }) {
  const couple = isCouple(data);
  const names = couple ? `${data.name.trim()} and ${data.spouseName.trim()}` : data.name.trim();
  const showOwner = data.maritalStatus === 'married';
  const infoRows: [string, string][] = [
    ['Where important papers are kept', data.info.documents],
    ['People to contact', data.info.contacts],
    ['Phone, computer, and online accounts', data.info.digital],
    ['Funeral or burial wishes', data.info.wishes],
  ];
  return (
    <article className="asset-document">
      <h1>Information for My Executor</h1>
      <p className="asset-sub">
        {names || '________'} · Prepared {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
      <p className="asset-warning">
        This is NOT part of my will and has no legal effect. It’s a list to help whoever handles my estate. Who receives
        each item is decided by my will, the beneficiary forms, and how each item is titled.
      </p>
      {ORDER.filter((k) => data.assets.some((a) => a.kind === k)).map((k) => {
        const debt = k === 'debt';
        return (
          <section key={k}>
            <h2>{KINDS[k].label}</h2>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Where</th>
                  {showOwner && <th>Owner</th>}
                  <th>{debt ? 'Owed' : 'Value'}</th>
                  {!debt && <th>Passes by</th>}
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.assets
                  .filter((a) => a.kind === k)
                  .map((a) => (
                    <tr key={a.id}>
                      <td>{assetLabel(a)}</td>
                      <td>
                        {a.institution}
                        {a.last4 && ` (…${a.last4})`}
                      </td>
                      {showOwner && <td>{ownerLabel(data, a.owner)}</td>}
                      <td>{a.value}</td>
                      {!debt && (
                        <td>
                          {PASSES_SHORT[a.passesBy]}
                          {a.passesBy === 'beneficiary' && a.beneficiary.trim() && `: ${a.beneficiary.trim()}`}
                        </td>
                      )}
                      <td>{a.notes}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        );
      })}
      {infoRows.some(([, v]) => v.trim()) && (
        <section>
          <h2>Other things to know</h2>
          {infoRows
            .filter(([, v]) => v.trim())
            .map(([label, v]) => (
              <div key={label} className="info-block">
                <h3>{label}</h3>
                <p>{v}</p>
              </div>
            ))}
        </section>
      )}
      <p className="asset-foot">Keep this with the original will and update it once a year.</p>
    </article>
  );
}
