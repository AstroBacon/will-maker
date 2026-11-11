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
      {/* Text follows the statutory form in O.C.G.A. § 53-4-24(b), verified against two copies of the Code. */}
      <h2>Self-Proving Affidavit</h2>
      <p>STATE OF GEORGIA<br />COUNTY of {BLANK}</p>
      <p>
        Before me, the undersigned authority, on this day personally appeared {name}, {BLANK}, and {BLANK}, known to me to
        be the testator and the witnesses, respectively, whose names are subscribed to the annexed or foregoing instrument
        in their respective capacities, and all of said individuals being by me duly sworn, {name}, testator, declared to me
        and to the witnesses in my presence that said instrument is the last will and testament of the testator and that the
        testator had willingly made and executed it as a free act and deed for the purposes expressed therein. The witnesses,
        each on oath, stated to me in the presence and hearing of the testator that the testator had declared to them that
        the instrument is the testator’s last will and testament and that the testator executed the instrument as such and
        wished each of them to sign it as a witness; and under oath each witness stated further that the witness had signed
        the same as witness in the presence of the testator and at the testator’s request; that the testator was 14 years
        of age or over and of sound mind; and that each of the witnesses was then at least 14 years of age.
      </p>
      <SigLine label="Testator" />
      <Witnesses />
      <div className="jurat">
        <p>
          Sworn to and subscribed before me by {name}, testator, and sworn to and subscribed before me by {BLANK} and{' '}
          {BLANK}, witnesses, this {BLANK} day of {BLANK}, 20____.
        </p>
        <div className="notary">
          <div className="seal">(SEAL)</div>
          <SigLine label="(Signed)" />
          <SigLine label="(Official Capacity of Officer)" />
          <SigLine label="My commission expires" />
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
