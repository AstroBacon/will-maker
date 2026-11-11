import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { AssetDocument, AssetsStep, hasAssetList } from './assets';
import { checkAssets, checkBasics, checkWill, type Issue, type StepId } from './checks';
import { checkDirective, DIRECTIVE_SIGNING, DirectiveDocument, DirectiveStep, initialsGuide } from './directive';
import { checkPoa, POA_NOTES, POA_SIGNING, PoaDocument, poaInitials, PoaStep } from './poa';
import { RULES } from './states';
import { ChildrenStep, ExecutorStep, GiftsStep, GuardianStep, ResidueStep, StartStep, YouStep, type StepProps } from './steps';
import { downloadDraft, mirrorForSpouse, purgeStoredDraft, readDraftFile } from './storage';
import { emptyWill, firstName, isCouple, type WillData } from './types';
import { WillDocument } from './WillDocument';

interface StepDef {
  id: StepId;
  label: string;
  Component?: ComponentType<StepProps>;
  show?: (d: WillData) => boolean;
}

const forWill = (d: WillData) => d.docs.will;

const STEPS: StepDef[] = [
  { id: 'start', label: 'Start', Component: StartStep },
  { id: 'you', label: 'About you', Component: YouStep },
  { id: 'children', label: 'Children', Component: ChildrenStep, show: (d) => d.docs.will || d.docs.assets || d.docs.directive || d.docs.poa },
  { id: 'executor', label: 'Executor', Component: ExecutorStep, show: forWill },
  { id: 'guardian', label: 'Guardian', Component: GuardianStep, show: forWill },
  { id: 'gifts', label: 'Specific gifts', Component: GiftsStep, show: forWill },
  { id: 'residue', label: 'Everything else', Component: ResidueStep, show: forWill },
  { id: 'directive', label: 'Medical directive', Component: DirectiveStep, show: (d) => d.docs.directive },
  { id: 'poa', label: 'Power of attorney', Component: PoaStep, show: (d) => d.docs.poa },
  { id: 'assets', label: 'Asset list', Component: AssetsStep, show: (d) => d.docs.assets },
  { id: 'review', label: 'Review & print' },
];

type PrintPart = 'will-a' | 'will-b' | 'dir-a' | 'dir-b' | 'poa-a' | 'poa-b' | 'checklist' | 'assets';

function printPart(part: PrintPart) {
  document.body.dataset.print = part;
  window.print();
  delete document.body.dataset.print;
}

/** Every check for the selected documents, for both spouses in couples mode. */
function allIssues(d: WillData) {
  const couple = isCouple(d);
  const spouse = couple ? mirrorForSpouse(d) : null;
  const basics = checkBasics(d);
  const willA = d.docs.will ? checkWill(d) : [];
  const willB = d.docs.will && spouse ? checkWill(spouse).filter((i) => !willA.some((a) => a.text === i.text)) : [];
  const dirIssues = d.docs.directive
    ? [
        ...checkDirective(d.state, d.directive, couple ? `${firstName(d.name, 'Your')}’s directive` : 'Your directive'),
        ...(couple ? checkDirective(d.state, d.spouseDirective, `${firstName(d.spouseName)}’s directive`) : []),
      ]
    : [];
  const poaIssues = d.docs.poa
    ? [
        ...checkPoa(d.state, d.poa, couple ? `${firstName(d.name, 'Your')}’s power of attorney` : 'Your power of attorney', d.name),
        ...(couple ? checkPoa(d.state, d.spousePoa, `${firstName(d.spouseName)}’s power of attorney`, d.spouseName) : []),
      ]
    : [];
  const assetIssues = d.docs.assets ? checkAssets(d) : [];
  return { basics, willA, willB, dirIssues, poaIssues, assetIssues, all: [...basics, ...willA, ...willB, ...dirIssues, ...poaIssues, ...assetIssues] };
}

function IssueList({ issues, goTo, title }: { issues: Issue[]; goTo: (s: StepId) => void; title?: string }) {
  if (!issues.length) return null;
  const icon = { error: '✕', warning: '!', info: 'i' };
  return (
    <>
      {title && <h4 className="issue-title">{title}</h4>}
      <ul className="issues">
        {issues.map((iss, i) => (
          <li key={i} className={`issue ${iss.level}`}>
            <span className="issue-icon" aria-hidden>{icon[iss.level]}</span>
            <span>
              {iss.text}{' '}
              {iss.step !== 'review' && (
                <button type="button" className="link" onClick={() => goTo(iss.step)}>
                  Fix this
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

/** A document section on the review page: heading, person tabs (couples), print buttons, preview. */
function DocSection({
  title,
  couple,
  nameA,
  nameB,
  partA,
  partB,
  renderA,
  renderB,
  className,
}: {
  title: string;
  couple: boolean;
  nameA: string;
  nameB: string;
  partA: PrintPart;
  partB: PrintPart;
  renderA: () => ReactNode;
  renderB: () => ReactNode;
  className: string;
}) {
  const [tab, setTab] = useState<'a' | 'b'>('a');
  return (
    <section className="doc-section">
      <div className="doc-header no-print">
        <h3>{title}</h3>
        {couple && (
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'a'} className={`tab ${tab === 'a' ? 'active' : ''}`} onClick={() => setTab('a')}>
              {nameA}’s
            </button>
            <button type="button" role="tab" aria-selected={tab === 'b'} className={`tab ${tab === 'b' ? 'active' : ''}`} onClick={() => setTab('b')}>
              {nameB}’s
            </button>
          </div>
        )}
      </div>
      <div className="actions no-print">
        <button type="button" className="primary" onClick={() => printPart(partA)}>
          Print {couple ? `${nameA}’s` : ''} {title.toLowerCase()}
        </button>
        {couple && (
          <button type="button" className="primary" onClick={() => printPart(partB)}>
            Print {nameB}’s {title.toLowerCase()}
          </button>
        )}
      </div>
      <div className={`paper-wrap print-doc print-${partA} ${className} ${tab === 'a' ? '' : 'screen-hidden'}`}>{renderA()}</div>
      {couple && <div className={`paper-wrap print-doc print-${partB} ${className} ${tab === 'b' ? '' : 'screen-hidden'}`}>{renderB()}</div>}
    </section>
  );
}

function ReviewStep({ data, setData, goTo }: { data: WillData; setData: (d: WillData) => void; goTo: (s: StepId) => void }) {
  const couple = isCouple(data);
  const spouse = couple ? mirrorForSpouse(data) : null;
  const { basics, willA, willB, dirIssues, poaIssues, assetIssues, all } = allIssues(data);
  const errors = all.filter((i) => i.level === 'error');
  const rules = RULES[data.state || 'GA'];
  const fileRef = useRef<HTMLInputElement>(null);
  const nameA = firstName(data.name, 'Your');
  const nameB = firstName(data.spouseName);
  const assets = data.docs.assets && hasAssetList(data);
  const st = data.state || 'GA';

  return (
    <>
      <h2>Review and print</h2>
      <p className="lead">
        {errors.length > 0
          ? 'A few things still need to be filled in before these are ready to sign.'
          : 'Everything is ready. Read each document carefully, then print it and follow the signing steps.'}
      </p>
      <IssueList issues={basics} goTo={goTo} />
      <IssueList issues={willA} goTo={goTo} title={data.docs.will ? (couple ? `${nameA}’s will` : 'Your will') : undefined} />
      <IssueList issues={willB} goTo={goTo} title={`${nameB}’s will`} />
      <IssueList issues={dirIssues} goTo={goTo} title="Medical directive" />
      <IssueList issues={poaIssues} goTo={goTo} title="Financial power of attorney" />
      <IssueList issues={assetIssues} goTo={goTo} title="Accounts with a named beneficiary" />
      {data.docs.will && (
        <ul className="issues">
          <li className="issue info">
            <span className="issue-icon" aria-hidden>i</span>
            <span>
              A will doesn’t control life insurance, retirement accounts, or accounts with a named beneficiary. Those go to
              whoever is named on the account.
              {!data.docs.assets && (
                <>
                  {' '}
                  <button type="button" className="link" onClick={() => setData({ ...data, docs: { ...data.docs, assets: true } })}>
                    Add an asset list
                  </button>
                </>
              )}
            </span>
          </li>
        </ul>
      )}

      <div className="actions no-print">
        <button type="button" className="secondary" onClick={() => printPart('checklist')}>
          Print signing steps
        </button>
        {assets && (
          <button type="button" className="secondary" onClick={() => printPart('assets')}>
            Print asset list
          </button>
        )}
        <button type="button" className="secondary" onClick={() => downloadDraft(data)}>
          Save answers to a file
        </button>
      </div>

      <section className="checklist card print-doc">
        {data.docs.will && (
          <>
            <h3>How to sign your will in {rules.name}</h3>
            <p className="field-hint">A will isn’t valid until it’s signed the right way. {rules.witnessAgeNote}</p>
            <ol>
              {couple && (
                <li>
                  You can both sign at the same sitting with the same witnesses and notary. Each will needs its own full set of
                  signatures: {nameA} signs {nameA}’s will, {nameB} signs {nameB}’s, and the witnesses (and notary) sign both.
                  Don’t sign each other’s will by mistake.
                </li>
              )}
              {rules.checklist.map((c) => (
                <li key={c}>{c}</li>
              ))}
              {assets && <li>Keep the asset list with the will, but don’t staple it to the will. It isn’t part of the will.</li>}
            </ol>
          </>
        )}
        {data.docs.directive && (
          <>
            <h3>How to sign your medical directive in {rules.name}</h3>
            <ol>
              {DIRECTIVE_SIGNING[st].map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
            {[
              { who: couple ? nameA : 'You', dir: data.directive },
              ...(couple ? [{ who: nameB, dir: data.spouseDirective }] : []),
            ].map(({ who, dir }) => {
              const items = initialsGuide(st, dir);
              return (
                <div key={who} className="initials-guide">
                  <h4>{who === 'You' ? 'Initial these items' : `${who}: initial these items`}</h4>
                  {items.length ? (
                    <ul>
                      {items.map((t) => (
                        <li key={t}>☐ {t}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="field-hint">No choices made yet. Leave every initial line blank, or go back and make your choices.</p>
                  )}
                </div>
              );
            })}
          </>
        )}
        {data.docs.poa && (
          <>
            <h3>How to sign your financial power of attorney in {rules.name}</h3>
            <ol>
              {POA_SIGNING[st].map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
            {[
              { who: couple ? nameA : 'You', poa: data.poa },
              ...(couple ? [{ who: nameB, poa: data.spousePoa }] : []),
            ].map(({ who, poa }) => {
              const items = poaInitials(st, poa);
              return (
                <div key={who} className="initials-guide">
                  <h4>{who === 'You' ? 'Initial these powers' : `${who}: initial these powers`}</h4>
                  {items.length ? (
                    <ul>
                      {items.map((t) => (
                        <li key={t}>☐ {t}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="field-hint">No powers picked yet.</p>
                  )}
                </div>
              );
            })}
          </>
        )}
      </section>

      {data.docs.will && (
        <details className="card no-print lawyer-notes">
          <summary>Notes for your lawyer ({rules.name})</summary>
          <p className="field-hint">Each point checked against the statute text (November 2026). “Verified” means the app’s wording matches the statute; the rest are judgment calls.</p>
          <dl>
            {rules.reviewNotes.map((n) => (
              <div key={n.topic}>
                <dt>{n.topic}</dt>
                <dd>{n.note}</dd>
              </div>
            ))}
            {couple && (
              <div>
                <dt>Couples mode</dt>
                <dd>
                  The second will is generated by swapping the spouses (storage.ts → mirrorForSpouse). Executor, guardian and
                  residue plan carry over; each spouse has separate specific gifts. Stepchildren are labeled from each spouse’s
                  point of view and are excluded from “my children.”
                </dd>
              </div>
            )}
          </dl>
        </details>
      )}

      {data.docs.poa && (
        <details className="card no-print lawyer-notes">
          <summary>Notes for your lawyer: power of attorney ({rules.name})</summary>
          <dl>
            {POA_NOTES[st].map((n) => (
              <div key={n.topic}>
                <dt>{n.topic}</dt>
                <dd>{n.note}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      {data.docs.will && (
        <DocSection
          title="Will"
          couple={couple}
          nameA={nameA}
          nameB={nameB}
          partA="will-a"
          partB="will-b"
          className=""
          renderA={() => <WillDocument data={data} draft={willA.some((i) => i.level === 'error') || basics.some((i) => i.level === 'error')} />}
          renderB={() => (spouse ? <WillDocument data={spouse} draft={checkWill(spouse).some((i) => i.level === 'error')} /> : null)}
        />
      )}
      {data.docs.directive && (
        <DocSection
          title="Medical directive"
          couple={couple}
          nameA={nameA}
          nameB={nameB}
          partA="dir-a"
          partB="dir-b"
          className=""
          renderA={() => <DirectiveDocument state={data.state} name={data.name} dir={data.directive} />}
          renderB={() => <DirectiveDocument state={data.state} name={data.spouseName} dir={data.spouseDirective} />}
        />
      )}
      {data.docs.poa && (
        <DocSection
          title="Power of attorney"
          couple={couple}
          nameA={nameA}
          nameB={nameB}
          partA="poa-a"
          partB="poa-b"
          className=""
          renderA={() => <PoaDocument data={data} name={data.name} poa={data.poa} />}
          renderB={() => <PoaDocument data={data} name={data.spouseName} poa={data.spousePoa} />}
        />
      )}
      {assets && (
        <div className="print-doc print-assets screen-hidden">
          <AssetDocument data={data} />
        </div>
      )}

      <div className="card no-print">
        <h3>Save or start over</h3>
        <p className="field-hint">
          This page doesn’t remember anything. When you close it, your answers are gone. To come back later or send your
          answers to your lawyer, save them to a file, then load that file next time.
        </p>
        <div className="actions">
          <button type="button" className="secondary" onClick={() => fileRef.current?.click()}>
            Load answers from a file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) {
                try {
                  setData(await readDraftFile(f));
                } catch {
                  alert('That file couldn’t be read.');
                }
              }
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="link danger"
            onClick={() => {
              if (confirm('Clear all answers and start over? Save them to a file first if you want to keep them.')) {
                setData(emptyWill());
                goTo('start');
              }
            }}
          >
            Start over
          </button>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [data, setData] = useState<WillData>(emptyWill);
  const [step, setStep] = useState<StepId>('start');

  // Nothing is kept in the browser. Erase anything an earlier version saved.
  useEffect(() => purgeStoredDraft(), []);

  // Since nothing is saved, warn before the page is closed or reloaded with answers in it.
  const hasAnswers = JSON.stringify(data) !== JSON.stringify(emptyWill());
  useEffect(() => {
    if (!hasAnswers) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasAnswers]);

  const steps = STEPS.filter((s) => !s.show || s.show(data));
  const goTo = (s: StepId) => {
    setStep(s);
    window.scrollTo({ top: 0 });
  };
  const set = (patch: Partial<WillData>) => setData((d) => ({ ...d, ...patch }));
  // If the current step was hidden (document unchecked), fall back to the start.
  const idx = Math.max(0, steps.findIndex((s) => s.id === step));
  const current = steps[idx];
  const { all } = allIssues(data);
  const stepHasError = (id: StepId) => all.some((i) => i.step === id && i.level === 'error');
  const canContinue = !(current.id === 'start' && (!data.state || !Object.values(data.docs).some(Boolean)));

  return (
    <div className="app">
      <header className="topbar no-print">
        <span className="brand">Will Maker</span>
        {data.state && <span className="state-pill">{RULES[data.state].name}</span>}
        {isCouple(data) && data.spouseName.trim() && (
          <span className="state-pill">
            {firstName(data.name, 'You')} &amp; {firstName(data.spouseName)}
          </span>
        )}
      </header>
      <div className="layout">
        <nav className="steps no-print" aria-label="Steps">
          <ol>
            {steps.map((s, i) => (
              <li key={s.id}>
                <button type="button" className={`step ${s.id === current.id ? 'active' : ''} ${i < idx ? 'done' : ''}`} onClick={() => goTo(s.id)}>
                  <span className="step-num">{i + 1}</span>
                  {s.label}
                  {i < idx && stepHasError(s.id) && <span className="step-flag" title="Needs attention">!</span>}
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <main className={current.id === 'review' ? 'wide' : ''}>
          {current.Component ? <current.Component data={data} set={set} /> : <ReviewStep data={data} setData={setData} goTo={goTo} />}
          <div className="nav-buttons no-print">
            {idx > 0 && (
              <button type="button" className="secondary" onClick={() => goTo(steps[idx - 1].id)}>
                ← Back
              </button>
            )}
            {idx < steps.length - 1 && (
              <button type="button" className="primary" disabled={!canContinue} onClick={() => goTo(steps[idx + 1].id)}>
                Next →
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
