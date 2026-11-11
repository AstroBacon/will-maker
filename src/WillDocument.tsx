import { matchCounty } from './counties';
import { BLANK, generateWill } from './generate';
import type { WillData } from './types';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function SigLine({ label }: { label: string }) {
  return (
    <div className="sig-line">
      <div className="sig-rule" />
      <div className="sig-label">{label}</div>
    </div>
  );
}

function Witnesses() {
  return (
    <div className="witness-grid">
      {[1, 2].map((n) => (
        <div key={n}>
          <SigLine label={`Witness ${n} signature`} />
          <SigLine label="Printed name" />
          <SigLine label="Address" />
        </div>
      ))}
    </div>
  );
}

function GeorgiaAffidavit({ name }: { name: string }) {
  return (
    <section className="affidavit">
      <h2>Self-Proving Affidavit</h2>
      <p>STATE OF GEORGIA<br />COUNTY OF {BLANK}</p>
      <p>
        Before me, the undersigned authority, on this day personally appeared {name}, {BLANK}, and {BLANK}, known to me to
        be the testator and the witnesses, respectively, whose names are signed to the attached or foregoing instrument and,
        all of these persons being by me first duly sworn, {name}, the testator, declared to me and to the witnesses in my
        presence that said instrument is the testator’s will and that the testator has willingly signed or directed another
        to sign the same, and executed it in the presence of said witnesses as the testator’s free and voluntary act for
        the purposes therein expressed; that said witnesses, being sworn, stated to me in the presence and hearing of the
        testator that the testator signed or directed another to sign the will in their presence, that they believed the
        testator to be of sound mind, and that the witnesses signed as witnesses in the presence of the testator.
      </p>
      <SigLine label={`${name}, Testator`} />
      <Witnesses />
      <div className="jurat">
      <p>
        Subscribed, sworn to, and acknowledged before me by {name}, the testator, and subscribed and sworn to before me by{' '}
        {BLANK} and {BLANK}, witnesses, this {BLANK} day of {BLANK}, 20____.
      </p>
      <div className="notary">
        <SigLine label="Notary Public" />
        <SigLine label="My commission expires" />
        <div className="seal">(SEAL)</div>
      </div>
      </div>
    </section>
  );
}

function OregonAffidavit({ name }: { name: string }) {
  return (
    <section className="affidavit">
      <h2>Affidavit of Attesting Witnesses</h2>
      <p>STATE OF OREGON<br />County of {BLANK}</p>
      <p>
        We, the undersigned attesting witnesses, being first duly sworn, each declare: On the date of the attached will,
        {' '}{name}, the testator, signed the will in our presence, or acknowledged that signature to us, and declared it to
        be the testator’s will. Each of us signed the will as a witness in the presence of the testator. At that time the
        testator appeared to us to be of sound mind, at least 18 years of age, and under no duress, fraud, or undue influence.
      </p>
      <Witnesses />
      <div className="jurat">
      <p>Subscribed and sworn to before me by {BLANK} and {BLANK} on {BLANK}, 20____.</p>
      <div className="notary">
        <SigLine label="Notary Public for Oregon" />
        <SigLine label="My commission expires" />
        <div className="seal">(SEAL)</div>
      </div>
      </div>
    </section>
  );
}

export function WillDocument({ data, draft }: { data: WillData; draft: boolean }) {
  const doc = generateWill(data);
  const name = data.name.trim() || BLANK;
  return (
    <article className={`will-document ${draft ? 'is-draft' : ''}`}>
      <h1>{doc.title}</h1>
      {doc.articles.map((a, i) => (
        <section key={a.title}>
          <h2>
            Article {ROMAN[i]}
            <br />
            {a.title}
          </h2>
          {a.paragraphs.map((p, j) => (
            <p key={j}>{p}</p>
          ))}
        </section>
      ))}

      <div className="execution">
      <section className="signature">
        <p>
          I sign my name to this will on {BLANK}, 20____, at {BLANK}, {matchCounty(data.state, data.county) ?? BLANK} County, {doc.rules.name},
          and declare that I sign it willingly, as my free and voluntary act.
        </p>
        <SigLine label={`${name}, Testator`} />
      </section>

      <section className="attestation">
        <h2>Attestation</h2>
        <p>{doc.rules.attestation(name)}</p>
        <Witnesses />
      </section>
      </div>

      {doc.rules.affidavit === 'GA' ? <GeorgiaAffidavit name={name} /> : <OregonAffidavit name={name} />}
    </article>
  );
}
