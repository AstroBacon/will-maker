import { useEffect, useRef, useState, type ComponentType } from 'react';
import { AssetDocument, AssetsStep, hasAssetList } from './assets';
import { checkAssets, checkWill, type Issue, type StepId } from './checks';
import { RULES } from './states';
import { ChildrenStep, ExecutorStep, GiftsStep, GuardianStep, ResidueStep, StartStep, YouStep, type StepProps } from './steps';
import { downloadDraft, mirrorForSpouse, purgeStoredDraft, readDraftFile } from './storage';
import { emptyWill, firstName, isCouple, type WillData } from './types';
import { WillDocument } from './WillDocument';

const STEPS: { id: StepId; label: string; Component?: ComponentType<StepProps> }[] = [
  { id: 'start', label: 'Start', Component: StartStep },
  { id: 'you', label: 'About you', Component: YouStep },
  { id: 'children', label: 'Children', Component: ChildrenStep },
  { id: 'executor', label: 'Executor', Component: ExecutorStep },
  { id: 'guardian', label: 'Guardian', Component: GuardianStep },
  { id: 'gifts', label: 'Specific gifts', Component: GiftsStep },
  { id: 'residue', label: 'Everything else', Component: ResidueStep },
  { id: 'assets', label: 'Asset list', Component: AssetsStep },
  { id: 'review', label: 'Review & print' },
];

type PrintPart = 'will-a' | 'will-b' | 'checklist' | 'assets';

function printPart(part: PrintPart) {
  document.body.dataset.print = part;
  window.print();
  delete document.body.dataset.print;
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

function ReviewStep({ data, setData, goTo }: { data: WillData; setData: (d: WillData) => void; goTo: (s: StepId) => void }) {
  const couple = isCouple(data);
  const spouseWill = couple ? mirrorForSpouse(data) : null;
  const [tab, setTab] = useState<'a' | 'b'>('a');
  const shown = tab === 'b' && spouseWill ? 'b' : 'a';

  const issuesA = checkWill(data);
  const issuesB = spouseWill ? checkWill(spouseWill).filter((i) => !issuesA.some((a) => a.text === i.text)) : [];
  const assetIssues = checkAssets(data);
  const errors = [...issuesA, ...issuesB].filter((i) => i.level === 'error');
  const rules = RULES[data.state || 'GA'];
  const fileRef = useRef<HTMLInputElement>(null);
  const nameA = firstName(data.name, 'Your');
  const nameB = firstName(data.spouseName);
  const assets = hasAssetList(data);

  return (
    <>
      <h2>Review and print</h2>
      {errors.length > 0 ? (
        <p className="lead">A few things still need to be filled in before {couple ? 'these are' : 'this is'} ready to sign.</p>
      ) : (
        <p className="lead">
          {couple ? 'Both wills are ready.' : 'Your will is ready.'} Read {couple ? 'them' : 'it'} carefully, then print and follow the signing steps below.
        </p>
      )}
      <IssueList issues={issuesA} goTo={goTo} title={couple ? `${nameA}’s will` : undefined} />
      <IssueList issues={issuesB} goTo={goTo} title={`${nameB}’s will`} />
      <IssueList issues={assetIssues} goTo={goTo} title="Accounts with a named beneficiary" />
      <ul className="issues">
        <li className="issue info">
          <span className="issue-icon" aria-hidden>i</span>
          <span>
            A will doesn’t control life insurance, retirement accounts, or accounts with a named beneficiary. Those go to
            whoever is named on the account.
            {!assets && (
              <>
                {' '}
                <button type="button" className="link" onClick={() => goTo('assets')}>
                  Make an asset list
                </button>
              </>
            )}
          </span>
        </li>
      </ul>

      <div className="actions no-print">
        <button type="button" className="primary" onClick={() => printPart('will-a')}>
          Print {couple ? `${nameA}’s will` : 'will'}
        </button>
        {couple && (
          <button type="button" className="primary" onClick={() => printPart('will-b')}>
            Print {nameB}’s will
          </button>
        )}
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
      </section>

      <details className="card no-print lawyer-notes">
        <summary>Notes for your lawyer ({rules.name})</summary>
        <p className="field-hint">These are the points to check before anyone relies on this will. Citations are starting points; verify each one.</p>
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

      <div className="doc-header no-print">
        <h3>{couple ? 'The wills' : 'Your will'}</h3>
        {couple && (
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={shown === 'a'} className={`tab ${shown === 'a' ? 'active' : ''}`} onClick={() => setTab('a')}>
              {nameA}’s will
            </button>
            <button type="button" role="tab" aria-selected={shown === 'b'} className={`tab ${shown === 'b' ? 'active' : ''}`} onClick={() => setTab('b')}>
              {nameB}’s will
            </button>
          </div>
        )}
      </div>
      <div className={`paper-wrap print-doc print-will-a ${shown === 'a' ? '' : 'screen-hidden'}`}>
        <WillDocument data={data} draft={issuesA.some((i) => i.level === 'error')} />
      </div>
      {spouseWill && (
        <div className={`paper-wrap print-doc print-will-b ${shown === 'b' ? '' : 'screen-hidden'}`}>
          <WillDocument data={spouseWill} draft={checkWill(spouseWill).some((i) => i.level === 'error')} />
        </div>
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

  const goTo = (s: StepId) => {
    setStep(s);
    window.scrollTo({ top: 0 });
  };
  const set = (patch: Partial<WillData>) => setData((d) => ({ ...d, ...patch }));
  const idx = STEPS.findIndex((s) => s.id === step);
  const current = STEPS[idx];
  const issues = [...checkWill(data), ...(isCouple(data) ? checkWill(mirrorForSpouse(data)) : [])];
  const stepHasError = (id: StepId) => issues.some((i) => i.step === id && i.level === 'error');

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
            {STEPS.map((s, i) => (
              <li key={s.id}>
                <button type="button" className={`step ${s.id === step ? 'active' : ''} ${i < idx ? 'done' : ''}`} onClick={() => goTo(s.id)}>
                  <span className="step-num">{i + 1}</span>
                  {s.label}
                  {i < idx && stepHasError(s.id) && <span className="step-flag" title="Needs attention">!</span>}
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <main className={step === 'review' ? 'wide' : ''}>
          {current.Component ? <current.Component data={data} set={set} /> : <ReviewStep data={data} setData={setData} goTo={goTo} />}
          <div className="nav-buttons no-print">
            {idx > 0 && (
              <button type="button" className="secondary" onClick={() => goTo(STEPS[idx - 1].id)}>
                ← Back
              </button>
            )}
            {idx < STEPS.length - 1 && (
              <button type="button" className="primary" disabled={step === 'start' && !data.state} onClick={() => goTo(STEPS[idx + 1].id)}>
                Next →
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
