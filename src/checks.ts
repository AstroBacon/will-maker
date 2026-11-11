import { matchCounty } from './counties';
import { minorChildren, omittedChildren } from './generate';
import { RULES } from './states';
import { firstName, sameName, type Asset, type ResiduaryTier, type WillData } from './types';

export type StepId = 'start' | 'you' | 'children' | 'executor' | 'guardian' | 'gifts' | 'residue' | 'assets' | 'directive' | 'poa' | 'review';

export interface Issue {
  level: 'error' | 'warning' | 'info';
  step: StepId;
  text: string;
}

function tierIssues(tier: ResiduaryTier, label: string): Issue[] {
  const out: Issue[] = [];
  if (tier.beneficiaries.some((b) => !b.name.trim())) out.push({ level: 'error', step: 'residue', text: `A name is missing in ${label}.` });
  if (tier.split === 'percent' && tier.beneficiaries.length > 1) {
    const total = tier.beneficiaries.reduce((s, b) => s + (Number(b.percent) || 0), 0);
    if (Math.abs(total - 100) > 0.001) out.push({ level: 'error', step: 'residue', text: `The percentages in ${label} add up to ${total}%. They need to add up to 100%.` });
  }
  return out;
}

/** Checks that apply whatever documents are being made. */
export function checkBasics(d: WillData): Issue[] {
  const issues: Issue[] = [];
  if (!d.state) issues.push({ level: 'error', step: 'start', text: 'Choose your state.' });
  if (!Object.values(d.docs).some(Boolean)) issues.push({ level: 'error', step: 'start', text: 'Choose at least one document to make.' });
  if (!d.name.trim()) issues.push({ level: 'error', step: 'you', text: 'Enter your full legal name.' });
  if (d.maritalStatus === 'married' && !d.spouseName.trim()) issues.push({ level: 'error', step: 'you', text: 'Enter your spouse’s name.' });
  return issues;
}

/** Checks one will. `d` is always written from the will-maker's point of view. */
export function checkWill(d: WillData): Issue[] {
  const issues: Issue[] = [];
  const err = (step: StepId, text: string) => issues.push({ level: 'error', step, text });
  const warn = (step: StepId, text: string) => issues.push({ level: 'warning', step, text });
  const info = (step: StepId, text: string) => issues.push({ level: 'info', step, text });

  if (!d.city.trim()) err('you', 'Enter the city you live in.');
  if (d.state && !matchCounty(d.state, d.county)) {
    err('you', d.county.trim() ? `“${d.county.trim()}” isn’t a county in ${RULES[d.state].name}. Choose your county from the list.` : 'Choose your county.');
  }
  if (d.children.some((c) => !c.name.trim())) err('children', 'One of your children is missing a name.');

  if (!d.executor.name.trim()) err('executor', 'Choose someone to be in charge of your estate.');
  else if (!d.altExecutor.name.trim()) warn('executor', 'Consider naming a backup in case your first choice can’t do it.');

  if (minorChildren(d).length && !d.guardian.name.trim()) warn('guardian', 'You have minor children but haven’t named a guardian. If you don’t, a judge will choose one.');

  d.gifts.forEach((g, i) => {
    if (!g.description.trim() || !g.recipient.trim()) err('gifts', `Gift #${i + 1} in ${firstName(d.name, 'this')}’s will needs both an item and a person.`);
  });

  if (!d.primary.beneficiaries.length) err('residue', 'Choose who gets everything else (the “residue”). This is the most important part of the will.');
  issues.push(...tierIssues(d.primary, 'the main group'), ...tierIssues(d.contingent, 'the backup group'));

  if (d.primary.beneficiaries.length && !d.contingent.beneficiaries.length) {
    const p = d.primary.beneficiaries;
    if (p.length === 1 && d.primary.lapse === 'others') {
      warn('residue', `If ${p[0].name || 'your main beneficiary'} dies before you, no one else is named, so state law would decide who inherits. Consider adding a backup group.`);
    }
  }

  if (d.maritalStatus === 'married' && d.spouseName.trim() && d.state) {
    if (!d.primary.beneficiaries.some((b) => sameName(b.name, d.spouseName))) warn('residue', RULES[d.state].spouseWarning);
  }

  const omitted = omittedChildren(d);
  if (omitted.length) {
    info('residue', `In ${firstName(d.name, 'this')}’s will, ${omitted.join(', ')} ${omitted.length === 1 ? 'gets' : 'get'} nothing directly, and the will says that’s on purpose. If that isn’t what you mean, add them.`);
  }

  const minorNames = d.children.filter((c) => c.isMinor).map((c) => c.name);
  const minorBeneficiary = [...d.primary.beneficiaries, ...d.contingent.beneficiaries].some((b) => minorNames.some((k) => sameName(k, b.name)));
  if (minorBeneficiary) info('residue', 'Anything left to a child under 21 can be held by a custodian until they turn 21. The will already covers this.');

  return issues;
}

const KIND_LABEL: Record<Asset['kind'], string> = {
  bank: 'bank account',
  retirement: 'retirement account',
  investment: 'investment account',
  insurance: 'life insurance policy',
  real_estate: 'property',
  vehicle: 'vehicle',
  other: 'asset',
  debt: 'debt',
};

export const assetLabel = (a: Asset) => a.description.trim() || `${a.institution.trim() ? a.institution.trim() + ' ' : ''}${KIND_LABEL[a.kind]}`;

/** Flags beneficiary-designation problems: the most common way an estate plan goes wrong. */
export function checkAssets(d: WillData): Issue[] {
  const out: Issue[] = [];
  const inWill = [
    d.spouseName,
    d.name,
    ...d.primary.beneficiaries.map((b) => b.name),
    ...d.contingent.beneficiaries.map((b) => b.name),
  ];
  const minors = d.children.filter((c) => c.isMinor);

  for (const a of d.assets) {
    if (a.kind === 'debt') continue;
    const label = assetLabel(a);
    if (a.passesBy === 'unsure' && a.kind === 'real_estate') {
      out.push({ level: 'warning', step: 'assets', text: `Check the deed for your ${label}. If it says something like “joint tenants with right of survivorship,” it goes to the other owner automatically. Otherwise, your will decides. Your county’s deed records office can give you a copy.` });
      continue;
    }
    if (a.passesBy === 'unsure') {
      out.push({ level: 'warning', step: 'assets', text: `Find out whether your ${label} has a named beneficiary or co-owner. ${a.institution.trim() || 'The company'} can tell you, and it decides who gets this money, not the will.` });
      continue;
    }
    if (a.passesBy !== 'beneficiary') continue;
    if (!a.beneficiary.trim()) {
      out.push({ level: 'warning', step: 'assets', text: `Who is the named beneficiary on your ${label}? Check with ${a.institution.trim() || 'the company'}. Old forms often still name an ex-spouse, a parent who has died, or no one.` });
      continue;
    }
    const minor = minors.find((m) => a.beneficiary.toLowerCase().includes(m.name.trim().toLowerCase()) && m.name.trim());
    if (minor) {
      out.push({ level: 'warning', step: 'assets', text: `${minor.name} is under 18 and is named on your ${label}. Companies usually won’t pay money directly to a child, so a court may need to appoint someone to manage it. Ask ${a.institution.trim() || 'the company'} about naming a custodian for ${minor.name} instead, and mention it to your lawyer.` });
      continue;
    }
    const matches = inWill.some((n) => n.trim() && a.beneficiary.toLowerCase().includes(n.trim().toLowerCase()));
    if (!matches && !/estate/i.test(a.beneficiary)) {
      out.push({ level: 'info', step: 'assets', text: `Your ${label} goes straight to ${a.beneficiary.trim()}, outside your will. Make sure that’s what you want.` });
    }
  }
  return out;
}

export const willHasErrors = (d: WillData) => checkWill(d).some((i) => i.level === 'error');
