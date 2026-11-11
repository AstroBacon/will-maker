import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AssetDocument } from './assets';
import { cleanCity, COUNTIES, matchCounty } from './counties';
import { checkAssets, checkWill } from './checks';
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
    const errs = checkWill(emptyWill()).filter((i) => i.level === 'error').map((i) => i.step);
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
