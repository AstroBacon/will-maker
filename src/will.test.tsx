import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AssetDocument } from './assets';
import { checkDirective, DirectiveDocument, initialsGuide } from './directive';
import { checkPoa, PoaDocument, poaInitials } from './poa';
import { cleanCity, COUNTIES, matchCounty } from './counties';
import { checkAssets, checkBasics, checkWill } from './checks';
import { BLANK, generateWill } from './generate';
import { mirrorForSpouse, normalize } from './storage';
import { emptyWill, newId, type Asset, type WillData } from './types';
import { WillDocument } from './WillDocument';

const share = (name: string, relationship: string, percent = 0) => ({ id: newId(), name, relationship, percent });

function parents(state: 'GA' | 'OR' = 'GA'): WillData {
  return {
    ...emptyWill(),
    state,
    name: 'Robert Lee Smith',
    city: 'Macon',
    county: 'Bibb',
    maritalStatus: 'married',
    spouseName: 'Linda Ann Smith',
    children: [
      { id: '1', name: 'Amy Smith', isMinor: false, parent: 'both' },
      { id: '2', name: 'Ben Smith', isMinor: false, parent: 'both' },
    ],
    executor: { name: 'Linda Ann Smith', relationship: 'spouse', cityState: 'Macon, Georgia' },
    altExecutor: { name: 'Amy Smith', relationship: 'daughter', cityState: 'Atlanta, Georgia' },
    primary: { beneficiaries: [share('Linda Ann Smith', 'spouse')], split: 'equal', lapse: 'others' },
    contingent: { beneficiaries: [share('Amy Smith', 'child'), share('Ben Smith', 'child')], split: 'equal', lapse: 'descendants' },
  };
}

const text = (d: WillData) => generateWill(d).articles.flatMap((a) => a.paragraphs).join('\n');

describe('generateWill', () => {
  it('produces a complete spouse-then-children Georgia will with no blanks', () => {
    const d = parents();
    const t = text(d);
    expect(t).not.toContain(BLANK);
    expect(t).toContain('I, Robert Lee Smith, a resident of Macon, Bibb County, Georgia');
    expect(t).toContain('A. I give the residue of my estate to Linda Ann Smith (my spouse).');
    expect(t).toContain('the residue shall pass under Paragraph B');
    expect(t).toContain('B. I give the residue of my estate in equal shares to my children.');
    expect(t).toContain('O.C.G.A. § 53-12-261');
    expect(t).toContain('Georgia Transfers to Minors Act');
    expect(t).not.toContain('intentionally made no provision');
    expect(checkWill(d).filter((i) => i.level !== 'info')).toEqual([]);
  });

  it('uses Oregon terminology and law', () => {
    const t = text(parents('OR'));
    expect(t).toContain('as Personal Representative of this will');
    expect(t).toContain('Oregon Uniform Transfers to Minors Act');
    expect(t).not.toContain('O.C.G.A.');
  });

  it('includes guardian article only when there are minor children', () => {
    const d = parents();
    expect(generateWill(d).articles.map((a) => a.title)).not.toContain('Guardian of Minor Children');
    d.children[1].isMinor = true;
    d.guardian = { name: 'Carol Jones', relationship: 'sister', cityState: '' };
    const g = generateWill(d).articles.find((a) => a.title === 'Guardian of Minor Children');
    expect(g?.paragraphs[0]).toContain('I nominate Carol Jones (my sister) as testamentary guardian.');
    const og = generateWill({ ...d, state: 'OR' }).articles.find((a) => a.title === 'Guardian of Minor Children');
    expect(og?.paragraphs[0]).toContain('I nominate Carol Jones (my sister) as guardian.');
    expect(og?.paragraphs.at(-1)).toContain('request that the court give effect to this preference');
  });

  it('names children who receive nothing as intentionally omitted', () => {
    const d = parents();
    d.contingent.beneficiaries = [share('Amy Smith', 'child')];
    expect(text(d)).toContain('intentionally made no provision in this will for Ben Smith');
    expect(checkWill(d).some((i) => i.text.includes('Ben Smith'))).toBe(true);
  });

  it('writes percentage splits and validates totals', () => {
    const d = parents();
    d.contingent = { beneficiaries: [share('Amy Smith', 'child', 60), share('Ben Smith', 'child', 30)], split: 'percent', lapse: 'others' };
    expect(text(d)).toContain('Amy Smith (my child), 60%; Ben Smith (my child), 30%');
    expect(checkWill(d).some((i) => i.level === 'error' && i.text.includes('90%'))).toBe(true);
  });

  it('falls back to heirs at law when there is no backup group', () => {
    const d = parents();
    d.contingent.beneficiaries = [];
    expect(text(d)).toContain('under the laws of Georgia then in effect');
    expect(checkWill(d).some((i) => i.level === 'warning' && i.text.includes('backup'))).toBe(true);
  });

  it('warns when a spouse is left out, with state-specific wording', () => {
    const ga = parents();
    ga.primary = ga.contingent;
    ga.contingent = { ...ga.contingent, beneficiaries: [] };
    expect(checkWill(ga).some((i) => i.text.includes('year’s support'))).toBe(true);
    const or = { ...ga, state: 'OR' as const };
    expect(checkWill(or).some((i) => i.text.includes('elective share'))).toBe(true);
  });

  it('writes specific gifts with lapse rules', () => {
    const d = parents();
    d.gifts = [{ id: 'g', description: 'my fishing boat', recipient: 'Ben Smith', relationship: 'son', ifRecipientDies: 'descendants' }];
    expect(text(d)).toContain('I give my fishing boat to Ben Smith (my son), if Ben Smith survives me.');
    expect(text(d)).toContain('pass to Ben Smith’s descendants');
  });

  it('flags missing required info on an empty will', () => {
    const errs = [...checkBasics(emptyWill()), ...checkWill(emptyWill())].filter((i) => i.level === 'error').map((i) => i.step);
    expect(errs).toEqual(expect.arrayContaining(['start', 'you', 'executor', 'residue']));
  });
});

describe('lawyer as executor', () => {
  it('names the attorney in both spouses’ wills', () => {
    const d = parents();
    d.altExecutor = { name: 'Jane Doe', relationship: 'attorney', cityState: 'Macon, Georgia' };
    expect(text(d)).toContain('I appoint Jane Doe (my attorney), of Macon, Georgia, as Executor.');
    expect(text(mirrorForSpouse(d))).toContain('I appoint Jane Doe (my attorney), of Macon, Georgia, as Executor.');
  });
});

describe('mirrorForSpouse', () => {
  it('swaps the couple and keeps the plan', () => {
    const m = mirrorForSpouse(parents());
    expect(m.name).toBe('Linda Ann Smith');
    expect(m.spouseName).toBe('Robert Lee Smith');
    expect(m.executor.name).toBe('Robert Lee Smith');
    expect(m.primary.beneficiaries[0].name).toBe('Robert Lee Smith');
    expect(m.contingent.beneficiaries.map((b) => b.name)).toEqual(['Amy Smith', 'Ben Smith']);
    expect(checkWill(m).filter((i) => i.level !== 'info')).toEqual([]);
  });
});

describe('WillDocument', () => {
  it('renders both states with the right affidavit', () => {
    const ga = renderToStaticMarkup(<WillDocument data={parents('GA')} draft={false} />);
    expect(ga).toContain('Self-Proving Affidavit');
    expect(ga).toContain('STATE OF GEORGIA');
    // Statutory form, O.C.G.A. § 53-4-24(b)
    expect(ga).toContain('whose names are subscribed to the annexed or foregoing instrument in their respective capacities');
    expect(ga).toContain('the testator was 14 years of age or over and of sound mind; and that each of the witnesses was then at least 14 years of age');
    expect(ga).toContain('Sworn to and subscribed before me by Robert Lee Smith, testator');
    expect(ga).toContain('(Official Capacity of Officer)');
    const or = renderToStaticMarkup(<WillDocument data={parents('OR')} draft={false} />);
    expect(or).toContain('Affidavit of Attesting Witnesses');
    expect(or).toContain('saw Robert Lee Smith sign');
  });
});

describe('couples mode', () => {
  it('uses each spouse’s own gifts', () => {
    const d = parents();
    d.gifts = [{ id: 'g1', description: 'my golf clubs', recipient: 'Ben Smith', relationship: 'son', ifRecipientDies: 'residue' }];
    d.spouseGifts = [{ id: 'g2', description: 'my pearl necklace', recipient: 'Amy Smith', relationship: 'daughter', ifRecipientDies: 'residue' }];
    expect(text(d)).toContain('golf clubs');
    expect(text(d)).not.toContain('pearl necklace');
    const m = text(mirrorForSpouse(d));
    expect(m).toContain('I give my pearl necklace to Amy Smith (my daughter)');
    expect(m).not.toContain('golf clubs');
  });

  it('round-trips back to the original will', () => {
    const d = parents();
    expect(text(mirrorForSpouse(mirrorForSpouse(d)))).toBe(text({ ...d, executor: { ...d.executor, relationship: 'spouse' } }));
  });

  it('handles a blended family from each spouse’s point of view', () => {
    const d = parents();
    d.children = [
      { id: '1', name: 'Amy Smith', isMinor: false, parent: 'both' },
      { id: '2', name: 'Ben Smith', isMinor: false, parent: 'me' },
    ];
    d.altExecutor = { name: 'Ben Smith', relationship: 'son', cityState: '' };
    d.contingent = { beneficiaries: [share('Amy Smith', 'child'), share('Ben Smith', 'child')], split: 'equal', lapse: 'descendants' };

    const mine = text(d);
    expect(mine).toContain('I have two children now living: Amy Smith and Ben Smith.');
    expect(mine).toContain('B. I give the residue of my estate in equal shares to my children.');

    const spouse = mirrorForSpouse(d);
    const theirs = text(spouse);
    expect(theirs).toContain('I have one child now living: Amy Smith.');
    expect(theirs).toContain('My spouse’s child from another relationship, Ben Smith, is not included in references to “my children,”');
    expect(theirs).toContain('I appoint Ben Smith (my stepson) as Executor');
    // Not a class gift, because Ben isn't the spouse's child: both are named so Ben still inherits.
    expect(theirs).toContain('in equal shares to Amy Smith (my child) and Ben Smith (my stepchild)');
    expect(checkWill(spouse).filter((i) => i.level === 'error')).toEqual([]);
  });

  it('upgrades drafts saved before couples mode existed', () => {
    const old = JSON.parse(JSON.stringify(parents())) as Record<string, unknown>;
    delete old.couple; delete old.spouseGifts; delete old.assets; delete old.info;
    (old.children as Record<string, unknown>[]).forEach((c) => delete c.parent);
    const d = normalize(old);
    expect(d.children[0].parent).toBe('both');
    expect(d.assets).toEqual([]);
    expect(d.info.documents).toBe('');
    expect(text(d)).toBe(text(parents()));
  });
});

describe('asset list', () => {
  const asset = (p: Partial<Asset>): Asset => ({
    id: newId(), kind: 'insurance', description: '', institution: 'MetLife', last4: '', owner: 'me',
    passesBy: 'beneficiary', beneficiary: '', value: '', notes: '', ...p,
  });

  it('flags missing, minor, unknown and out-of-plan beneficiaries', () => {
    const d = parents();
    d.children[1].isMinor = true;
    d.assets = [
      asset({ description: 'Work life policy' }),
      asset({ description: '401(k)', kind: 'retirement', beneficiary: 'Ben Smith' }),
      asset({ description: 'Savings', kind: 'bank', passesBy: 'unsure', institution: 'Truist' }),
      asset({ description: 'Old IRA', kind: 'retirement', beneficiary: 'Martha Jones' }),
      asset({ description: 'Brokerage', kind: 'investment', beneficiary: 'Linda Ann Smith' }),
      asset({ description: 'Our house', kind: 'real_estate', passesBy: 'unsure', institution: 'Wells Fargo' }),
      asset({ description: 'Mortgage', kind: 'debt' }),
    ];
    const flags = checkAssets(d).map((f) => `${f.level}: ${f.text}`);
    expect(flags).toHaveLength(5);
    expect(flags[4]).toMatch(/^warning: Check the deed for your Our house/);
    expect(flags[0]).toMatch(/^warning: Who is the named beneficiary on your Work life policy/);
    expect(flags[1]).toMatch(/^warning: Ben Smith is under 18/);
    expect(flags[2]).toMatch(/^warning: Find out whether your Savings.*Truist/);
    expect(flags[3]).toMatch(/^info: Your Old IRA goes straight to Martha Jones/);
  });

  it('prints as a clearly separate, non-legal document', () => {
    const d = parents();
    d.assets = [asset({ description: 'Work life policy', beneficiary: 'Linda Ann Smith', last4: '1234' })];
    d.info.documents = 'Fireproof box in the hall closet';
    const html = renderToStaticMarkup(<AssetDocument data={d} />);
    expect(html).toContain('NOT part of my will');
    expect(html).toContain('MetLife (…1234)');
    expect(html).toContain('Named beneficiary: Linda Ann Smith');
    expect(html).toContain('Fireproof box in the hall closet');
  });
});

describe('city and county', () => {
  it('has every county in each state', () => {
    expect(COUNTIES.GA).toHaveLength(159);
    expect(COUNTIES.OR).toHaveLength(36);
    expect(new Set(COUNTIES.GA).size).toBe(159);
    expect(new Set(COUNTIES.OR).size).toBe(36);
  });

  it('never writes a state abbreviation or made-up county into the will', () => {
    const d = { ...parents(), city: 'Lawrenceville, GA', county: 'GA' };
    const t = text(d);
    expect(t).toContain(`a resident of Lawrenceville, ${BLANK} County, Georgia`);
    expect(t).not.toContain('GA County');
    expect(checkWill(d).some((i) => i.level === 'error' && i.text.includes('“GA” isn’t a county in Georgia'))).toBe(true);
    const html = renderToStaticMarkup(<WillDocument data={d} draft />);
    expect(html).not.toContain('GA County');
  });

  it('accepts real counties in any case, with or without "County"', () => {
    const d = { ...parents(), city: 'Lawrenceville', county: 'gwinnett county' };
    expect(text(d)).toContain('a resident of Lawrenceville, Gwinnett County, Georgia');
    expect(checkWill(d).some((i) => i.step === 'you')).toBe(false);
    expect(matchCounty('OR', 'Gwinnett')).toBeNull();
    expect(matchCounty('OR', 'hood river')).toBe('Hood River');
  });

  it('strips the state from the city', () => {
    for (const c of ['Lawrenceville, GA', 'Lawrenceville GA', 'Lawrenceville, Georgia', 'Lawrenceville, Ga.']) expect(cleanCity(c)).toBe('Lawrenceville');
    expect(cleanCity('Portland, OR')).toBe('Portland');
    expect(cleanCity('Gainesville')).toBe('Gainesville');
    for (const c of ['Omega', 'Vega', 'Oregon City', 'Ortega']) expect(cleanCity(c)).toBe(c);
  });
});

describe('medical directive', () => {
  const withDirective = (state: 'GA' | 'OR') => {
    const d = { ...parents(state), docs: { will: false, assets: false, directive: true, poa: false } };
    d.directive = { ...d.directive, dob: '12/23/1978', agent: { name: 'Linda Ann Smith', relationship: 'spouse', address: '', phone: '770-555-0100' }, alt1: { name: 'Amy Smith', relationship: 'child', address: '', phone: '' } };
    return d;
  };

  it('prints the Georgia statutory form with names filled in and every initial line blank', () => {
    const d = withDirective('GA');
    d.directive.ga = { ...d.directive.ga, condTerminal: true, condUnconscious: true, preference: 'B', body: 'cremated', additional: 'No dialysis.' };
    const html = renderToStaticMarkup(<DirectiveDocument state="GA" name={d.name} dir={d.directive} />);
    // Statutory text (O.C.G.A. § 31-32-4)
    for (const phrase of [
      'Georgia Advance Directive for Health Care',
      'My health care agent may accompany me in an ambulance or air ambulance',
      'Allow my natural death to occur.',
      'If I need assistance to breathe, I want to have a ventilator used.',
      'Cannot be a person who will knowingly inherit anything from you',
      'the witnesses do not have to be together or present with you when you sign this form',
      '[This form does not need to be notarized.]',
    ]) expect(html).toContain(phrase);
    expect(html).toContain('Linda Ann Smith');
    expect(html).toContain('12/23/1978');
    expect(html).toContain('No dialysis.');
    // Choices are not pre-marked: the form is identical whatever preference is chosen.
    const other = { ...d.directive, ga: { ...d.directive.ga, preference: 'A' as const, body: 'buried' as const } };
    const strip = (h: string) => h.replace('No dialysis.', '');
    expect(strip(renderToStaticMarkup(<DirectiveDocument state="GA" name={d.name} dir={other} />))).toBe(strip(html));
    // ...and the initials guide says exactly what to initial.
    expect(initialsGuide('GA', d.directive)).toEqual([
      'Section (5)(C): “Cremated.”',
      'Section (6): terminal condition.',
      'Section (6): state of permanent unconsciousness.',
      'Section (7)(B): “Allow my natural death to occur…”',
    ]);
  });

  it('prints the Oregon statutory form with acceptance lines for each representative', () => {
    const d = withDirective('OR');
    d.directive.or = { ...d.directive.or, terminal: '3', unconscious: '3', progressive: '4', abilities: { ...d.directive.or.abilities, know: true } };
    const html = renderToStaticMarkup(<DirectiveDocument state="OR" name={d.name} dir={d.directive} />);
    for (const phrase of [
      'Oregon Advance Directive for Health Care',
      'It is not the same as Portable Orders for Life Sustaining Treatment (POLST)',
      'Initial one option only.',
      'I want to be kept comfortable and be allowed to die naturally.',
      'COMPLETE EITHER A OR B WHEN YOU SIGN',
      'Notary Public - State of Oregon',
      'I accept this appointment and agree to serve as health care representative.',
      'Signature or other verification of acceptance',
    ]) expect(html).toContain(phrase);
    expect(html).not.toContain('an hydration');
    expect(initialsGuide('OR', d.directive)).toEqual([
      'Section 3.A.a (Terminal Condition): “I do not want treatments to sustain my life, such as artificial feeding and hydration with feeding tubes, IV fluids, kidney dialysis or breathing machines.”',
      'Section 3.A.b (Advanced Progressive Illness): “I want my health care representative to decide for me, after talking with my health care providers and taking into account the things that matter to me.”',
      'Section 3.A.c (Permanently Unconscious): “I do not want treatments to sustain my life, such as artificial feeding and hydration with feeding tubes, IV fluids, kidney dialysis or breathing machines.”',
      'Section 3.B: “Know who I am and who I am with.”',
    ]);
  });

  it('warns about choices that would never take effect', () => {
    const d = withDirective('GA');
    d.directive.ga.preference = 'B';
    expect(checkDirective('GA', d.directive, 'Robert').map((i) => i.text).join(' ')).toContain('no condition in Section (6)');
    d.directive.agent.name = '';
    d.directive.ga.guardian = 'A';
    const texts = checkDirective('GA', d.directive, 'Robert').map((i) => i.text).join(' ');
    expect(texts).toContain('no health care agent is named');
    expect(texts).toContain('nominated “my health care agent” as guardian');
    const o = withDirective('OR');
    o.directive.agent.name = '';
    o.directive.or.terminal = '4';
    expect(checkDirective('OR', o.directive, 'Robert').map((i) => i.text).join(' ')).toContain('let my representative decide');
  });

  it('keeps each spouse’s directive separate in couples mode', () => {
    const d = withDirective('GA');
    d.spouseDirective = { ...d.spouseDirective, agent: { name: 'Robert Lee Smith', relationship: 'spouse', address: '', phone: '' } };
    const m = mirrorForSpouse(d);
    expect(m.directive.agent.name).toBe('Robert Lee Smith');
    expect(m.spouseDirective.agent.name).toBe('Linda Ann Smith');
  });

  it('loads older answer files: will on, directive off', () => {
    const old = JSON.parse(JSON.stringify(parents())) as Record<string, unknown>;
    delete old.docs; delete old.directive; delete old.spouseDirective;
    const d = normalize(old);
    expect(d.docs).toEqual({ will: true, assets: false, directive: false, poa: false });
    expect(d.directive.ga.preference).toBe('');
    expect(d.spouseDirective.or.abilities.know).toBe(false);
  });
});

describe('financial power of attorney', () => {
  const withPoa = (state: 'GA' | 'OR') => {
    const d = { ...parents(state), docs: { will: false, assets: false, directive: false, poa: true } };
    d.poa = { ...d.poa, agent: { name: 'Linda Ann Smith', relationship: 'spouse', address: '12 Oak St', phone: '' }, successor1: { name: 'Amy Smith', relationship: 'child', address: '', phone: '' } };
    return d;
  };

  it('prints the Georgia statutory form (phrases verified against O.C.G.A. § 10-6B-70) with nothing pre-marked', () => {
    const d = withPoa('GA');
    d.poa = { ...d.poa, allSubjects: true, specific: { ...d.poa.specific, beneficiary: true } };
    const html = renderToStaticMarkup(<PoaDocument data={d} name={d.name} poa={d.poa} />);
    for (const phrase of [
      'Statutory Form Power of Attorney',
      'This power of attorney does not authorize the agent to make health care decisions for you.',
      'I grant my agent and any successor agent general authority to act for me',
      'Create, fund, amend, revoke, or terminate an inter vivos trust',
      'Exercise authority over the content of electronic communications sent or received by the principal',
      'Renounce an interest in property, including a power of appointment',
      'An agent that is not my ancestor, spouse, or descendant SHALL NOT use my property',
      'This document prepared by:',
      '(Principal’s name) by (Your signature) as Agent.',
      'The principal’s revocation of your authority or the power of attorney;',
    ]) expect(html).toContain(phrase);
    expect(html).toContain('Linda Ann Smith');
    expect(html).toContain('Bibb');
    const unmarked = { ...d.poa, allSubjects: false, specific: { ...d.poa.specific, beneficiary: false } };
    expect(renderToStaticMarkup(<PoaDocument data={d} name={d.name} poa={unmarked} />)).toBe(html);
    expect(poaInitials('GA', d.poa)).toEqual(['General authority: “All preceding subjects.”', 'Specific authority: “Create or change a beneficiary designation.”']);
  });

  it('drafts an Oregon durable power of attorney with the chosen effective date and Oregon notary block', () => {
    const d = withPoa('OR');
    d.poa.subjects = { ...d.poa.subjects, banks: true, taxes: true };
    const now = renderToStaticMarkup(<PoaDocument data={d} name={d.name} poa={d.poa} />);
    expect(now).toContain('Durable Power of Attorney (Financial)');
    expect(now).toContain('effective when I sign it');
    expect(now).toContain('This record was acknowledged before me on (date)');
    expect(now).toContain('ORS 127.045');
    const springing = renderToStaticMarkup(<PoaDocument data={d} name={d.name} poa={{ ...d.poa, effective: 'incapacity' }} />);
    expect(springing).toContain('becomes effective only when I become financially incapable');
    expect(springing).toContain('in writing by a physician');
    expect(poaInitials('OR', d.poa)).toEqual(['General authority: “Banks and other financial institutions.”', 'General authority: “Taxes.”']);
  });

  it('flags a missing agent, no powers, and naming yourself', () => {
    const d = withPoa('GA');
    d.poa.agent.name = '';
    let texts = checkPoa('GA', d.poa, 'Robert', d.name).map((i) => `${i.level}: ${i.text}`).join(' | ');
    expect(texts).toContain('error: Robert: name an agent');
    expect(texts).toContain('no areas of authority are picked');
    d.poa.agent.name = 'Robert Lee Smith';
    texts = checkPoa('GA', d.poa, 'Robert', d.name).map((i) => i.text).join(' ');
    expect(texts).toContain('you can’t be your own agent');
  });

  it('keeps each spouse’s power of attorney separate and loads old files with it off', () => {
    const d = withPoa('GA');
    d.spousePoa = { ...d.spousePoa, agent: { name: 'Robert Lee Smith', relationship: 'spouse', address: '', phone: '' } };
    expect(mirrorForSpouse(d).poa.agent.name).toBe('Robert Lee Smith');
    const old = JSON.parse(JSON.stringify(parents())) as Record<string, unknown>;
    delete old.poa; delete old.spousePoa; delete old.docs;
    const n = normalize(old);
    expect(n.docs.poa).toBe(false);
    expect(n.poa.specific.gift).toBe(false);
  });
});
