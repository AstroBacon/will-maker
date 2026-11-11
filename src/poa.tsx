import { useState } from 'react';
import type { Issue } from './checks';
import { matchCounty } from './counties';
import { Area, Check, Fill, Init, LINE, PersonFields, Radio, suggestions, TextBlock } from './directive';
import { Help } from './Fields';
import type { StepProps } from './steps';
import { firstName, isCouple, sameName, type HealthPerson, type Poa, type PoaSpecific, type PoaSubject, type StateCode, type WillData } from './types';

/* ------------------------------------------------------------------ */
/* Powers                                                              */
/* ------------------------------------------------------------------ */

/** Subjects of general authority, worded exactly as in O.C.G.A. § 10-6B-70. `plain` is UI help; `or` is the Oregon draft's definition. */
export const SUBJECTS: { key: PoaSubject; label: string; plain: string; or: string }[] = [
  { key: 'realProperty', label: 'Real property', plain: 'Buy, sell, lease, refinance, or manage your home and land.', or: 'buy, sell, lease, mortgage, refinance, manage, insure, repair, and otherwise deal with any interest in real property' },
  { key: 'tangible', label: 'Tangible personal property', plain: 'Cars, furniture, jewelry, and other belongings.', or: 'buy, sell, insure, store, repair, and otherwise deal with vehicles, household goods, and other tangible personal property' },
  { key: 'stocks', label: 'Stocks and bonds', plain: 'Brokerage accounts, stocks, bonds, and mutual funds.', or: 'buy, sell, and exchange stocks, bonds, mutual funds, and other securities, and open, manage, and close brokerage accounts' },
  { key: 'commodities', label: 'Commodities and options', plain: 'Commodity futures and options trading. Most people don’t need this.', or: 'buy, sell, exchange, and settle commodity futures contracts and options' },
  { key: 'banks', label: 'Banks and other financial institutions', plain: 'Checking and savings accounts, paying bills, safe deposit boxes.', or: 'open, close, and manage accounts with banks, credit unions, and other financial institutions, write checks, make deposits and withdrawals, and access safe deposit boxes' },
  { key: 'business', label: 'Operation of entity or business', plain: 'Run or manage a business you own.', or: 'operate, manage, buy, sell, and exercise my rights in any business, partnership, limited liability company, or corporation in which I have an interest' },
  { key: 'insurance', label: 'Insurance and annuities', plain: 'Keep up, change, or cash in insurance policies and annuities.', or: 'buy, maintain, pay premiums on, borrow against, and surrender insurance policies and annuities' },
  { key: 'estates', label: 'Estates, trusts, and other beneficial interests', plain: 'Handle an inheritance or trust you’re a beneficiary of.', or: 'act for me as to any estate, trust, or other interest from which I am or may become entitled to receive property' },
  { key: 'claims', label: 'Claims and litigation', plain: 'Bring, defend, or settle lawsuits and claims for you.', or: 'assert, defend, settle, and pursue claims and lawsuits on my behalf, and hire attorneys for that purpose' },
  { key: 'maintenance', label: 'Personal and family maintenance', plain: 'Pay for your living expenses, housing, and support of your spouse and dependents.', or: 'pay for the living expenses, housing, medical care, and customary support of me, my spouse, and anyone I am legally obligated to support' },
  { key: 'benefits', label: 'Benefits from governmental programs or civil or military service', plain: 'Social Security, Medicare, Medicaid, and veterans benefits.', or: 'apply for, receive, and manage Social Security, Medicare, Medicaid, veterans, and other governmental or military benefits' },
  { key: 'retirement', label: 'Retirement plans', plain: 'IRAs, 401(k)s, pensions: contributions, withdrawals, rollovers.', or: 'make contributions to, withdrawals from, and rollovers of retirement plans, including IRAs, 401(k) plans, and pensions' },
  { key: 'taxes', label: 'Taxes', plain: 'File and pay taxes and deal with the IRS and the state.', or: 'prepare, sign, and file tax returns, pay taxes, claim refunds, and represent me before the IRS and state and local tax authorities' },
];

/** Specific authority items, worded exactly as in O.C.G.A. § 10-6B-70. */
export const SPECIFIC: { key: PoaSpecific; ga: string; or: string; plain: string }[] = [
  { key: 'trust', ga: 'Create, fund, amend, revoke, or terminate an inter vivos trust', or: 'Create, fund, amend, revoke, or terminate a living (inter vivos) trust', plain: 'Set up or change a living trust.' },
  { key: 'gift', ga: 'Make a gift, subject to the limitations of O.C.G.A. § 10-6B-56 and any Special Instructions in this power of attorney', or: 'Make gifts of my property, subject to the limits in Section 4 and any Special Instructions', plain: 'Give your money or property away. Georgia limits gifts unless you say otherwise.' },
  { key: 'survivorship', ga: 'Create or change rights of survivorship', or: 'Create or change rights of survivorship', plain: 'Change joint ownership so property passes to someone automatically at death.' },
  { key: 'beneficiary', ga: 'Create or change a beneficiary designation', or: 'Create or change a beneficiary designation', plain: 'Change who inherits your life insurance, retirement accounts, or payable-on-death accounts.' },
  { key: 'delegate', ga: 'Authorize another person to exercise the authority granted under this power of attorney', or: 'Authorize another person to exercise the authority granted under this power of attorney', plain: 'Hand off authority to someone else.' },
  { key: 'waiveAnnuity', ga: 'Waive the principal’s right to be a beneficiary of a joint and survivor annuity, including a survivor benefit under a retirement plan', or: 'Waive my right to be a beneficiary of a joint and survivor annuity, including a survivor benefit under a retirement plan', plain: 'Give up your survivor benefit on a spouse’s pension or annuity.' },
  { key: 'electronic', ga: 'Exercise authority over the content of electronic communications sent or received by the principal', or: 'Access the content of electronic communications sent or received by me', plain: 'Read your email and other electronic messages.' },
  { key: 'fiduciary', ga: 'Exercise fiduciary powers that the principal has authority to delegate and that are expressly and clearly identified (including the persons for which the principal acts as a fiduciary) in the Special Instructions', or: 'Exercise fiduciary powers that I have authority to delegate and that are expressly and clearly identified (including the persons for whom I act as a fiduciary) in the Special Instructions', plain: 'Act in your place where you serve as a trustee or executor for someone else.' },
  { key: 'renounce', ga: 'Renounce an interest in property, including a power of appointment', or: 'Disclaim or renounce an interest in property, including a power of appointment', plain: 'Turn down an inheritance or other property on your behalf.' },
];

const blank = (): HealthPerson => ({ name: '', relationship: '', address: '', phone: '' });

/* ------------------------------------------------------------------ */
/* Form step                                                           */
/* ------------------------------------------------------------------ */

export function PoaStep({ data, set }: StepProps) {
  const couple = isCouple(data);
  const [who, setWho] = useState<'a' | 'b'>('a');
  const showing = couple && who === 'b' ? 'b' : 'a';
  const poa = showing === 'a' ? data.poa : data.spousePoa;
  const myName = showing === 'a' ? data.name : data.spouseName;
  const setPoa = (patch: Partial<Poa>) => set(showing === 'a' ? { poa: { ...data.poa, ...patch } } : { spousePoa: { ...data.spousePoa, ...patch } });
  const st: StateCode = data.state || 'GA';
  const picks = suggestions(data, showing === 'b').filter((p) => !sameName(p.name, myName));
  const me = myName.trim() ? firstName(myName) : 'you';

  const copyFromOther = () => {
    const src = data.poa;
    const swap = (p: HealthPerson): HealthPerson => (sameName(p.name, data.spouseName) ? { ...p, name: data.name, relationship: 'spouse' } : p);
    setPoa({ ...src, agent: swap(src.agent), successor1: swap(src.successor1), successor2: swap(src.successor2), conservatorPerson: swap(src.conservatorPerson) });
  };

  return (
    <>
      <h2>Financial power of attorney</h2>
      <p>
        This names someone (your <strong>agent</strong>) to handle your money and property if you can’t: paying bills,
        managing bank accounts, dealing with Social Security, selling the house if needed. It ends at death, when the will
        takes over. It doesn’t cover medical decisions; the medical directive does.
      </p>
      {st === 'GA' ? (
        <p className="note">This uses Georgia’s official statutory form (O.C.G.A. § 10-6B-70).</p>
      ) : (
        <p className="note">
          Oregon has no official form, so this one is drafted from Oregon’s power of attorney law (ORS 127.005–127.045). Have a
          lawyer review it before relying on it.
        </p>
      )}
      <Help title="Why not just add my child to my bank account?">
        Adding someone as a joint owner makes the account partly theirs. It can be reached by their creditors, and it passes to
        them at your death no matter what your will says. A power of attorney lets someone act for you without owning anything.
      </Help>

      {couple && (
        <div className="tabs person-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={showing === 'a'} className={`tab ${showing === 'a' ? 'active' : ''}`} onClick={() => setWho('a')}>
            {firstName(data.name, 'Your')}’s
          </button>
          <button type="button" role="tab" aria-selected={showing === 'b'} className={`tab ${showing === 'b' ? 'active' : ''}`} onClick={() => setWho('b')}>
            {firstName(data.spouseName)}’s
          </button>
        </div>
      )}
      {couple && (
        <p className="note">
          Each of you signs your own power of attorney.
          {showing === 'b' && (
            <>
              {' '}
              <button type="button" className="link" onClick={copyFromOther}>
                Start from {firstName(data.name, 'the other')}’s answers
              </button>{' '}
              (swaps the two of you as each other’s agent).
            </>
          )}
        </p>
      )}

      <h3 className="group-heading">Who acts for {me}</h3>
      <PersonFields legend="Agent" value={poa.agent} onChange={(agent) => setPoa({ agent })} picks={picks} />
      <PersonFields legend="Successor agent, if your agent can’t or won’t act" value={poa.successor1} onChange={(successor1) => setPoa({ successor1 })} picks={picks.filter((p) => !sameName(p.name, poa.agent.name))} />
      <PersonFields
        legend="Second successor agent (optional)"
        value={poa.successor2}
        onChange={(successor2) => setPoa({ successor2 })}
        picks={picks.filter((p) => !sameName(p.name, poa.agent.name) && !sameName(p.name, poa.successor1.name))}
      />

      {st === 'OR' && (
        <fieldset className="card">
          <legend>When does it take effect?</legend>
          <Radio name="poa-eff" value="now" current={poa.effective} onChange={(effective) => setPoa({ effective })}>
            <strong>Right away (recommended).</strong> Your agent can act as soon as you sign, and it keeps working if you become unable to manage
            your finances. Most people choose this so there’s no delay when it’s needed.
          </Radio>
          <Radio name="poa-eff" value="incapacity" current={poa.effective} onChange={(effective) => setPoa({ effective })}>
            <strong>Only if I become unable to manage my finances.</strong> A physician has to determine that in writing first, which can slow
            things down when your family needs to act.
          </Radio>
        </fieldset>
      )}

      <fieldset className="card">
        <legend>What your agent can handle</legend>
        <p className="field-hint">
          Pick each area your agent should be able to handle. Most people pick all of them. You’ll initial each one by hand on the
          printed form.
        </p>
        <Check
          checked={poa.allSubjects}
          onChange={(allSubjects) => setPoa({ allSubjects, subjects: Object.fromEntries(SUBJECTS.map((s) => [s.key, false])) as Poa['subjects'] })}
        >
          <strong>All of the areas below</strong> (you initial one line instead of each)
        </Check>
        {!poa.allSubjects &&
          SUBJECTS.map((s) => (
            <Check key={s.key} checked={poa.subjects[s.key]} onChange={(v) => setPoa({ subjects: { ...poa.subjects, [s.key]: v } })}>
              <strong>{s.label}</strong>
              <span className="field-hint">{s.plain}</span>
            </Check>
          ))}
      </fieldset>

      <fieldset className="card">
        <legend>Powers that need extra caution (optional)</legend>
        <p className="field-hint">
          These let your agent take actions that could significantly reduce your property or change who inherits it. Your agent
          can’t do any of them unless you pick them here and initial them. Many people leave all of these off, or give them only to
          a spouse.
        </p>
        {SPECIFIC.map((s) => (
          <Check key={s.key} checked={poa.specific[s.key]} onChange={(v) => setPoa({ specific: { ...poa.specific, [s.key]: v } })}>
            <strong>{s.plain}</strong>
            <span className="field-hint">{st === 'GA' ? s.ga : s.or}</span>
          </Check>
        ))}
      </fieldset>

      <fieldset className="card">
        <legend>Special instructions (optional)</legend>
        <p className="field-hint">
          Anything that changes the defaults: paying your agent, naming co-agents who must act together, limits on gifts, or (in
          Georgia) making it take effect only if you become incapacitated.
        </p>
        <div className="quick">
          {[
            'My agent may receive reasonable compensation for services as agent.',
            'Gifts by my agent are limited to gifts to my spouse and descendants for their health, education, and support.',
          ].map((t) => (
            <button key={t} type="button" className="chip" onClick={() => setPoa({ specialInstructions: poa.specialInstructions.trim() ? `${poa.specialInstructions.trim()}\n${t}` : t })}>
              + {t.split(' ').slice(0, 5).join(' ')}…
            </button>
          ))}
        </div>
        <Area label="Special instructions" value={poa.specialInstructions} onChange={(specialInstructions) => setPoa({ specialInstructions })} />
      </fieldset>

      <fieldset className="card">
        <legend>Conservator (optional)</legend>
        <p className="field-hint">If a court ever has to appoint someone to manage your estate, it will consider the person you name here.</p>
        <Radio name="poa-cons" value="" current={poa.conservator} onChange={(conservator) => setPoa({ conservator })}>
          Don’t name anyone
        </Radio>
        <Radio name="poa-cons" value="agent" current={poa.conservator} onChange={(conservator) => setPoa({ conservator })}>
          My agent{poa.agent.name.trim() ? ` (${poa.agent.name.trim()})` : ''}
        </Radio>
        <Radio name="poa-cons" value="other" current={poa.conservator} onChange={(conservator) => setPoa({ conservator })}>
          Someone else
        </Radio>
      </fieldset>
      {poa.conservator === 'other' && (
        <PersonFields legend="Conservator" value={poa.conservatorPerson} onChange={(conservatorPerson) => setPoa({ conservatorPerson })} picks={picks} />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Checks, initials guide, signing steps                               */
/* ------------------------------------------------------------------ */

const conservatorOf = (p: Poa): HealthPerson => (p.conservator === 'agent' ? p.agent : p.conservator === 'other' ? p.conservatorPerson : blank());

export function checkPoa(state: StateCode | '', poa: Poa, who: string, principal: string): Issue[] {
  const out: Issue[] = [];
  const w = (level: Issue['level'], text: string) => out.push({ level, step: 'poa', text: `${who}: ${text}` });
  if (!poa.agent.name.trim()) w('error', 'name an agent. Without one, the power of attorney does nothing.');
  if (sameName(poa.agent.name, principal)) w('error', 'you can’t be your own agent.');
  if (poa.agent.name.trim() && (sameName(poa.agent.name, poa.successor1.name) || sameName(poa.agent.name, poa.successor2.name))) w('warning', 'the same person is named as agent and as a successor.');
  if (!poa.allSubjects && !Object.values(poa.subjects).some(Boolean)) w('warning', 'no areas of authority are picked, so your agent couldn’t do anything.');
  if (poa.specific.fiduciary && !poa.specialInstructions.trim()) w('warning', 'the fiduciary-powers option only works if you identify those powers in the Special Instructions.');
  if (poa.conservator === 'other' && !poa.conservatorPerson.name.trim()) w('warning', 'name the person you want as conservator.');
  if (state === 'GA' && poa.agent.name.trim() && !poa.successor1.name.trim()) w('info', 'with no successor agent, the power of attorney ends if your agent can’t act.');
  return out;
}

export function poaInitials(state: StateCode | '', poa: Poa): string[] {
  const out: string[] = [];
  if (poa.allSubjects) out.push('General authority: “All preceding subjects.”');
  else for (const s of SUBJECTS) if (poa.subjects[s.key]) out.push(`General authority: “${s.label}.”`);
  for (const s of SPECIFIC) if (poa.specific[s.key]) out.push(`Specific authority: “${state === 'OR' ? s.or : s.ga}.”`);
  return out;
}

export const POA_NOTES: Record<StateCode, { topic: string; note: string }[]> = {
  GA: [
    { topic: 'Form — verified', note: 'Reproduces the O.C.G.A. § 10-6B-70 statutory form. Each sentence, heading, and authority item was confirmed against the Code text (FindLaw, current as of March 2024). Two copies found online were altered (a DCA program version and one with coagents and certified-mail revocation) and were not used.' },
    { topic: 'Execution — verified', note: '§ 10-6B-5: signed by the principal; attested in the principal’s presence by a competent witness who is not named as an agent, and by an officer under § 44-2-15 (notary) who is also not an agent and is not the witness.' },
    { topic: 'Choices', note: 'Every initial line prints blank; the app gives the user a list of items to initial by hand. Special Instructions are typed in if entered.' },
  ],
  OR: [
    { topic: 'DRAFT — needs review', note: 'Oregon has no statutory form and has not adopted the Uniform Power of Attorney Act (ORS 127.002–127.045 only). This document is drafted by the app: durability language tracks ORS 127.005(1); the springing option tracks 127.005(2)–(3) (physician’s written determination, HIPAA designation); agent duty 127.045; reliance 127.025/127.035; divorce termination 127.015(1)(e); conservator preference ORS 125.200.' },
    { topic: 'Structure', note: 'Borrows the Georgia/Uniform Act structure: general subjects by initial, and gifts, trusts, survivorship, beneficiary changes, etc. off unless initialed. Subject definitions are the app’s own wording. Gifts default to the federal annual exclusion per donee. Check that the subject descriptions are broad enough for banks and title companies.' },
    { topic: 'Execution', note: 'No statutory formalities; the app has the principal sign before a notary (ORS 194.285(1) short-form acknowledgment) because ORS 93.670 requires acknowledgment to record a power to convey land. No witnesses. Prior powers of attorney are not revoked; consider whether to add that.' },
  ],
};

export const POA_SIGNING: Record<StateCode, string[]> = {
  GA: [
    'Read the whole form. Then initial, in ink, only the items listed for you below. Every initial line is left blank on purpose so your choices are marked in your own hand.',
    'Sign in front of one witness AND a notary, both present when you sign. Neither one can be anyone named as an agent or successor agent, and the witness and the notary must be two different people (O.C.G.A. § 10-6B-5).',
    'The witness prints their name, address, phone, and email. The notary completes the acknowledgment and adds their seal.',
    'Give your agent a copy and have them read “Important Information for Agent” at the end. Banks often want to see the power of attorney before your agent needs it, so it can help to bring a copy in now.',
    'If your agent may ever need to sell or refinance real estate, the power of attorney may need to be recorded with the clerk of superior court in that county.',
  ],
  OR: [
    'Read the whole form. Then initial, in ink, only the items listed for you below. Every initial line is left blank on purpose so your choices are marked in your own hand.',
    'Sign in front of a notary. Oregon doesn’t require one for a power of attorney in general, but it’s needed to record it for real estate (ORS 93.670), and banks expect it.',
    'Give your agent a copy and have them read “Your duties as agent” at the end. It can help to bring a copy to your bank now, before it’s needed.',
    'If you chose “only if I become unable to manage my finances,” your agent will need a physician’s written determination before acting.',
  ],
};

/* ------------------------------------------------------------------ */
/* Printed documents                                                   */
/* ------------------------------------------------------------------ */

function AgentLines({ label, p }: { label: string; p: HealthPerson }) {
  return (
    <div className="form-person">
      <div>
        Name of {label}: <Fill v={p.name} />
      </div>
      <div>
        {label[0].toUpperCase() + label.slice(1)}’s address: <Fill v={p.address} />
      </div>
      <div>
        {label[0].toUpperCase() + label.slice(1)}’s telephone number: <Fill v={p.phone} />
      </div>
      <div>
        {label[0].toUpperCase() + label.slice(1)}’s e-mail address: {LINE}
      </div>
    </div>
  );
}

function SpecialInstructions({ v }: { v: string }) {
  return <TextBlock v={v} lines={5} />;
}

/** Georgia statutory form power of attorney, O.C.G.A. § 10-6B-70 (verified phrase by phrase against the Code). */
function GeorgiaPoa({ name, poa, county }: { name: string; poa: Poa; county: string }) {
  const cons = conservatorOf(poa);
  return (
    <article className="directive-document">
      <p>
        State of Georgia
        <br />
        County of <Fill v={county} w="____________" />
      </p>
      <h1>Statutory Form Power of Attorney</h1>
      <h2>IMPORTANT INFORMATION</h2>
      <p>
        This power of attorney authorizes another person (your agent) to make decisions concerning your property for you (the principal). Your agent will be able to make decisions and act with respect to your property (including your money) whether or not you are able to act for yourself. The meaning of authority over subjects listed on this form is explained in O.C.G.A. Chapter 6B of Title 10.
      </p>
      <p>This power of attorney does not authorize the agent to make health care decisions for you.</p>
      <p>
        You should select someone you trust to serve as your agent. Unless you specify otherwise in the Special Instructions, generally the agent’s authority will continue until you die or revoke the power of attorney or the agent resigns or is unable to act for you.
      </p>
      <p>Your agent is not entitled to any compensation unless you state otherwise in the Special Instructions. Your agent shall be entitled to reimbursement of reasonable expenses incurred in performing the acts required by you in your power of attorney.</p>
      <p>
        This form provides for designation of one agent. If you wish to name more than one agent, you may name a successor agent or name a coagent in the Special Instructions. Coagents will not be required to act together unless you include that requirement in the Special Instructions.
      </p>
      <p>If your agent is unable or unwilling to act for you, your power of attorney will end unless you have named a successor agent. You may also name a second successor agent.</p>
      <p>This power of attorney shall be durable unless you state otherwise in the Special Instructions.</p>
      <p>This power of attorney becomes effective immediately unless you state otherwise in the Special Instructions.</p>
      <p>If you have questions about the power of attorney or the authority you are granting to your agent, you should seek legal advice before signing this form.</p>

      <h2>DESIGNATION OF AGENT</h2>
      <p>
        I <Fill v={name} /> (Name of principal) name the following person as my agent:
      </p>
      <AgentLines label="agent" p={poa.agent} />
      <h2>DESIGNATION OF SUCCESSOR AGENT(S) (OPTIONAL)</h2>
      <p>If my agent is unable or unwilling to act for me, I name as my successor agent:</p>
      <AgentLines label="successor agent" p={poa.successor1} />
      <p>If my successor agent is unable or unwilling to act for me, I name as my second successor agent:</p>
      <AgentLines label="second successor agent" p={poa.successor2} />

      <h2>GRANT OF GENERAL AUTHORITY</h2>
      <p>I grant my agent and any successor agent general authority to act for me with respect to the following subjects as defined in O.C.G.A. Chapter 6B of Title 10:</p>
      <p className="bracket">
        (INITIAL each subject you want to include in the agent’s general authority. If you wish to grant general authority over all of the subjects, you may initial “all preceding subjects” instead of initialing each subject.)
      </p>
      {SUBJECTS.map((s) => (
        <p key={s.key} className="opt">
          <Init /> {s.label}
        </p>
      ))}
      <p className="opt">
        <Init /> All preceding subjects
      </p>

      <h2>GRANT OF SPECIFIC AUTHORITY (OPTIONAL)</h2>
      <p>My agent SHALL NOT do any of the following specific acts for me UNLESS I have INITIALED the specific authority listed below:</p>
      <p className="bracket">
        (CAUTION: Granting any of the following will give your agent the authority to take actions that could significantly reduce your property or change how your property is distributed at your death. INITIAL ONLY the specific authority you WANT to give your agent. You should give your agent specific instructions in the Special Instructions when you authorize your agent to make gifts.)
      </p>
      {SPECIFIC.map((s) => (
        <p key={s.key} className="opt">
          <Init /> {s.ga}
        </p>
      ))}

      <h2>LIMITATION ON AGENT’S AUTHORITY</h2>
      <p>An agent that is not my ancestor, spouse, or descendant SHALL NOT use my property to benefit the agent or a person to whom the agent owes an obligation of support unless I have included that authority in the Special Instructions.</p>

      <h2>SPECIAL INSTRUCTIONS (OPTIONAL)</h2>
      <p>You may give special instructions on the following lines (you may add lines or place your special instructions in a separate document and attach it to the power of attorney):</p>
      <SpecialInstructions v={poa.specialInstructions} />

      <h2>EFFECTIVE DATE</h2>
      <p>This power of attorney is effective immediately unless I have stated otherwise in the Special Instructions.</p>

      <h2>NOMINATION OF CONSERVATOR (OPTIONAL)</h2>
      <p>If it becomes necessary for a court to appoint a conservator of my estate, I nominate the following person(s) for appointment:</p>
      <div className="form-person">
        <div>
          Name of nominee for conservator of my estate: <Fill v={cons.name} />
        </div>
        <div>
          Nominee’s address: <Fill v={cons.address} />
        </div>
        <div>
          Nominee’s telephone number: <Fill v={cons.phone} />
        </div>
        <div>Nominee’s e-mail address: {LINE}</div>
      </div>

      <h2>RELIANCE ON THIS POWER OF ATTORNEY</h2>
      <p>Any person, including my agent, may rely upon the validity of this power of attorney or a copy of it unless that person has actual knowledge it has terminated or is invalid.</p>

      <section className="keep-together">
        <h2>SIGNATURE AND ACKNOWLEDGMENT</h2>
        <p>
          Your signature {LINE} Date ____________
        </p>
        <p>
          Your name printed <Fill v={name} />
        </p>
        <p>Your address {LINE}</p>
        <p>Your telephone number {LINE}</p>
        <p>Your e-mail address {LINE}</p>
      </section>
      <section className="keep-together">
        <p>
          This document was signed in my presence on ____________ (Date) by <Fill v={name} /> (Name of principal)
        </p>
        <p>{LINE}</p>
        <p>(Witness’s signature)</p>
        <p>{LINE} (Witness’s name printed)</p>
        <p>Witness’s address {LINE}</p>
        <p>Witness’s telephone number {LINE}</p>
        <p>Witness’s e-mail address {LINE}</p>
      </section>
      <section className="keep-together">
        <p>
          State of Georgia
          <br />
          County of ____________
        </p>
        <p>
          This document was signed in my presence on ____________ (Date) by <Fill v={name} /> (Name of principal).
        </p>
        <p>{LINE} (Seal)</p>
        <p>Signature of notary</p>
        <p>My commission expires: ____________</p>
        <p>This document prepared by: {LINE}</p>
      </section>

      <h2 className="page-break-before">IMPORTANT INFORMATION FOR AGENT</h2>
      <h3>Agent’s Duties</h3>
      <p>
        When you accept the authority granted under this power of attorney, a special legal relationship is created between you and the principal. This relationship imposes upon you legal duties that continue until you resign or the power of attorney is terminated or revoked. You must:
      </p>
      <ol>
        <li>Do what you know the principal reasonably expects you to do with the principal’s property or, if you do not know the principal’s expectations, act in the principal’s best interest;</li>
        <li>Act in good faith;</li>
        <li>Do nothing beyond the authority granted in this power of attorney; and</li>
        <li>
          Disclose your identity as an agent whenever you act for the principal by writing or printing the name of the principal and signing your own name as “agent” in the following manner:
          <br />
          (Principal’s name) by (Your signature) as Agent.
        </li>
      </ol>
      <p>Unless the Special Instructions in this power of attorney state otherwise, you must also:</p>
      <ol>
        <li>Act loyally for the principal’s benefit;</li>
        <li>Avoid conflicts that would impair your ability to act in the principal’s best interest;</li>
        <li>Act with care, competence, and diligence;</li>
        <li>Keep a record of all receipts, disbursements, and transactions made on behalf of the principal;</li>
        <li>Cooperate with any person that has authority to make health care decisions for the principal to do what you know the principal reasonably expects or, if you do not know the principal’s expectations, to act in the principal’s best interest; and</li>
        <li>Attempt to preserve the principal’s estate plan if you know the plan and preserving the plan is consistent with the principal’s best interest.</li>
      </ol>
      <h3>Termination of Agent’s Authority</h3>
      <p>You must stop acting on behalf of the principal if you learn of any event that terminates this power of attorney or your authority under this power of attorney. Events that terminate a power of attorney or your authority to act under a power of attorney include:</p>
      <ol>
        <li>Death of the principal;</li>
        <li>The principal’s revocation of your authority or the power of attorney;</li>
        <li>The occurrence of a termination event stated in the power of attorney;</li>
        <li>The purpose of the power of attorney is fully accomplished; or</li>
        <li>If you are married to the principal, a legal action is filed with a court to end your marriage, or for your legal separation, unless the Special Instructions in this power of attorney state that such an action will not terminate your authority.</li>
      </ol>
      <h3>Liability of Agent</h3>
      <p>
        The meaning of the authority granted to you is defined in O.C.G.A. Chapter 6B of Title 10. If you violate O.C.G.A. Chapter 6B of Title 10 or act outside the authority granted, you may be liable for any damages caused by your violation.
      </p>
      <p>If there is anything about this document or your duties that you do not understand, you should seek legal advice.</p>
    </article>
  );
}

/** Oregon durable power of attorney. DRAFT: Oregon has no statutory form; drafted from ORS 127.002–127.045. */
function OregonPoa({ name, poa, city }: { name: string; poa: Poa; city: string }) {
  const cons = conservatorOf(poa);
  const person = (p: HealthPerson) => (
    <>
      <Fill v={p.name} />
      {p.address.trim() ? `, of ${p.address.trim()}` : ''}
    </>
  );
  return (
    <article className="directive-document">
      <h1>Durable Power of Attorney (Financial)</h1>
      <p className="bracket">
        This power of attorney lets the person you name (your agent) act for you with respect to your property and money. It does not authorize your agent to make health care decisions for you. Choose someone you trust. You may revoke it at any time while you are able. If you have questions, seek legal advice before signing.
      </p>

      <h2>1. Designation of Agent</h2>
      <p>
        I, <Fill v={name} />, of <Fill v={city} w="____________" />, Oregon, appoint {person(poa.agent)} as my agent (attorney-in-fact) to act for me as provided in this power of attorney.
      </p>
      <p>
        If my agent dies, becomes financially incapable or incapacitated, resigns, or is otherwise unable or unwilling to act, I appoint {person(poa.successor1)} as my successor agent. If my successor agent is unable or unwilling to act, I appoint {person(poa.successor2)} as my second successor agent. A successor agent has all the authority of the agent.
      </p>

      <h2>2. Effective Date and Durability</h2>
      {poa.effective === 'now' ? (
        <p>
          This power of attorney is effective when I sign it. It is a durable power of attorney: the authority of my agent is not affected by the passage of time and may be exercised even though I become financially incapable, as provided in ORS 127.005.
        </p>
      ) : (
        <p>
          This power of attorney becomes effective only when I become financially incapable, as defined in ORS 125.005. That determination shall be made in writing by a physician who has examined me. Any physician making that determination is my personal representative for that purpose under ORS 192.553 to 192.581 and the federal HIPAA privacy regulations, 45 C.F.R. parts 160 and 164. Once effective, this power of attorney is durable and is not affected by the passage of time, as provided in ORS 127.005.
        </p>
      )}

      <h2>3. Grant of General Authority</h2>
      <p>I grant my agent and any successor agent authority to act for me with respect to each of the following subjects that I have initialed, including authority to sign documents, make contracts, and take any other action I could take regarding that subject:</p>
      <p className="bracket">(INITIAL each subject you want to include. To include all of them, you may initial “All preceding subjects” instead.)</p>
      {SUBJECTS.map((s) => (
        <p key={s.key} className="opt">
          <Init /> <strong>{s.label}:</strong> authority to {s.or}.
        </p>
      ))}
      <p className="opt">
        <Init /> All preceding subjects
      </p>

      <h2>4. Grant of Specific Authority (Optional)</h2>
      <p>My agent SHALL NOT do any of the following unless I have INITIALED it below:</p>
      <p className="bracket">
        (CAUTION: Granting any of the following will give your agent the authority to take actions that could significantly reduce your property or change how your property is distributed at your death. INITIAL ONLY the authority you WANT to give.)
      </p>
      {SPECIFIC.map((s) => (
        <p key={s.key} className="opt">
          <Init /> {s.or}
        </p>
      ))}
      <p>
        Unless my Special Instructions say otherwise, gifts by my agent to any one person in a calendar year may not exceed the federal gift tax annual exclusion amount for that year.
      </p>

      <h2>5. Duties and Limitations</h2>
      <p>My agent must use my property for my benefit, as required by ORS 127.045, and must keep records of all receipts, disbursements, and transactions made on my behalf.</p>
      <p>An agent that is not my ancestor, spouse, or descendant shall not use my property to benefit the agent or a person to whom the agent owes an obligation of support unless I have included that authority in the Special Instructions.</p>
      <p>My agent is entitled to reimbursement of reasonable expenses, but not to compensation unless I state otherwise in the Special Instructions.</p>

      <h2>6. Special Instructions (Optional)</h2>
      <SpecialInstructions v={poa.specialInstructions} />

      <h2>7. Nomination of Conservator (Optional)</h2>
      <p>
        If a court must appoint a conservator for my estate, I nominate <Fill v={cons.name} /> and ask the court to consider this preference under ORS 125.200.
      </p>

      <h2>8. Reliance and Termination</h2>
      <p>
        Any person may rely on this power of attorney, or a copy of it, unless that person has actual notice that it has been revoked or terminated (ORS 127.035). A person may not refuse to recognize my agent’s authority solely because of the time since I signed it (ORS 127.025).
      </p>
      <p>
        This power of attorney ends at my death or when I revoke it. If my agent is my spouse or registered domestic partner, my agent’s authority terminates if an action is filed for dissolution, annulment, or separation of our marriage or partnership, unless my Special Instructions say otherwise (ORS 127.015).
      </p>

      <section className="keep-together">
        <h2>9. Signature</h2>
        <p>
          Signature: {LINE} &nbsp; Date: ____________
        </p>
        <p>
          Printed name: <Fill v={name} />
        </p>
        <p>Address: {LINE}</p>
      </section>
      <section className="keep-together">
        <h2>Notary Acknowledgment</h2>
        <p>
          State of ____________
          <br />
          County of ____________
        </p>
        <p>
          This record was acknowledged before me on (date) ____________ by (name(s) of individual(s)) <Fill v={name} />.
        </p>
        <p>Signature of notarial officer: {LINE}</p>
        <p>Stamp</p>
        <p>Title of office: ____________</p>
        <p>My commission expires: ____________</p>
      </section>

      <h2 className="page-break-before">Your Duties as Agent</h2>
      <p>When you act under this power of attorney, you have legal duties to the principal. You must:</p>
      <ol>
        <li>Use the principal’s property for the principal’s benefit (ORS 127.045), and act in good faith and within the authority granted;</li>
        <li>Keep the principal’s property separate from your own and keep records of all receipts, disbursements, and transactions;</li>
        <li>Sign as agent, for example: “(Principal’s name) by (Your signature) as Agent”;</li>
        <li>Account to any court-appointed conservator for the principal (ORS 127.005); and</li>
        <li>Stop acting when the principal dies, revokes this power of attorney, or another event terminates your authority (ORS 127.015).</li>
      </ol>
      <p>If there is anything about this document or your duties that you do not understand, you should seek legal advice.</p>
    </article>
  );
}

export function PoaDocument({ data, name, poa }: { data: WillData; name: string; poa: Poa }) {
  return data.state === 'OR' ? <OregonPoa name={name} poa={poa} city={data.city} /> : <GeorgiaPoa name={name} poa={poa} county={matchCounty(data.state, data.county) ?? ''} />;
}
