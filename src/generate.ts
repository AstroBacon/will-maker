import { cleanCity, matchCounty } from './counties';
import { RULES, type StateRules } from './states';
import { ownChildren, sameName, stepChildren, type ResiduaryTier, type WillData } from './types';

export const BLANK = '____________';
const v = (s: string) => s.trim() || BLANK;

export interface Article {
  title: string;
  paragraphs: string[];
}

export interface WillDoc {
  title: string;
  rules: StateRules;
  articles: Article[];
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);

export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function who(p: { name: string; relationship: string }): string {
  const rel = p.relationship.trim();
  return rel ? `${v(p.name)} (my ${rel})` : v(p.name);
}

export const minorChildren = (d: WillData) => ownChildren(d).filter((c) => c.isMinor);

/** True when a tier is "all of my children, equally" — written as a class gift so after-born children share. */
export function isChildrenClassGift(d: WillData, tier: ResiduaryTier): boolean {
  const kids = ownChildren(d).filter((c) => c.name.trim());
  if (tier.split !== 'equal' || kids.length === 0 || tier.beneficiaries.length !== kids.length) return false;
  return kids.every((k) => tier.beneficiaries.some((b) => sameName(b.name, k.name)));
}

/** Children who are named in the will but receive nothing in it. */
export function omittedChildren(d: WillData): string[] {
  const recipients = [
    ...d.gifts.map((g) => g.recipient),
    ...d.primary.beneficiaries.map((b) => b.name),
    ...d.contingent.beneficiaries.map((b) => b.name),
  ];
  return ownChildren(d)
    .filter((c) => c.name.trim() && !recipients.some((r) => sameName(r, c.name)))
    .map((c) => c.name.trim());
}

function tierParagraphs(d: WillData, tier: ResiduaryTier, label: string, fallback: string): string[] {
  const out: string[] = [];
  const bs = tier.beneficiaries;
  const single = bs.length === 1;
  const desc = tier.lapse === 'descendants';

  if (isChildrenClassGift(d, tier)) {
    out.push(
      `${label} I give the residue of my estate in equal shares to my children. If any child of mine does not survive me, that child’s share shall pass to that child’s descendants who survive me, per stirpes, or, if none, shall be divided equally among the shares of my other children.`,
    );
    out.push(`If no child of mine and no descendant of a child of mine survives me, ${fallback}`);
    return out;
  }

  let gift: string;
  if (single) gift = `to ${who(bs[0])}`;
  else if (tier.split === 'equal') gift = `in equal shares to ${joinNames(bs.map(who))}`;
  else gift = `to the following beneficiaries in the shares stated: ${bs.map((b) => `${who(b)}, ${b.percent || 0}%`).join('; ')}`;
  out.push(`${label} I give the residue of my estate ${gift}.`);

  if (single) {
    if (desc) out.push(`If ${v(bs[0].name)} does not survive me, I give the residue to ${v(bs[0].name)}’s descendants who survive me, per stirpes.`);
    out.push(`If ${v(bs[0].name)} does not survive me${desc ? ' and leaves no descendant who survives me' : ''}, ${fallback}`);
  } else {
    out.push(
      desc
        ? 'If any beneficiary named in this paragraph does not survive me, that beneficiary’s share shall pass to their descendants who survive me, per stirpes. If that beneficiary leaves no descendant who survives me, their share shall be added proportionately to the other shares under this paragraph.'
        : 'If any beneficiary named in this paragraph does not survive me, that beneficiary’s share shall be added proportionately to the shares of the other beneficiaries named in this paragraph who survive me.',
    );
    out.push(`If no beneficiary named in this paragraph${desc ? ', and no descendant of any of them,' : ''} survives me, ${fallback}`);
  }
  return out;
}

export function generateWill(d: WillData): WillDoc {
  const rules = RULES[d.state || 'GA'];
  const ex = rules.executorTitle;
  const st = rules.name;
  const articles: Article[] = [];

  // Declaration
  articles.push({
    title: 'Declaration',
    paragraphs: [
      `I, ${v(d.name)}, a resident of ${v(cleanCity(d.city))}, ${matchCounty(d.state, d.county) ?? BLANK} County, ${st}, declare this to be my Last Will and Testament. I revoke all wills and codicils that I have previously made.`,
    ],
  });

  // Family
  const fam: string[] = [];
  fam.push(
    d.maritalStatus === 'married'
      ? `I am married to ${v(d.spouseName)}. References in this will to “my spouse” are to ${v(d.spouseName)}.`
      : 'I am not married.',
  );
  const kids = ownChildren(d).map((c) => v(c.name));
  if (kids.length === 0) fam.push('I have no children now living.');
  else if (kids.length === 1) fam.push(`I have one child now living: ${kids[0]}.`);
  else fam.push(`I have ${numberWord(kids.length)} children now living: ${joinNames(kids)}.`);
  fam.push(
    'References in this will to “my children” include the children named above and any child born to or adopted by me after I sign this will. I make this will in contemplation of the birth or adoption of additional children, and this will shall not be revoked by such an event.',
  );
  const steps = stepChildren(d).map((c) => v(c.name));
  if (d.maritalStatus === 'married' && steps.length) {
    fam.push(
      `My spouse’s ${steps.length === 1 ? 'child' : 'children'} from another relationship, ${joinNames(steps)}, ${steps.length === 1 ? 'is' : 'are'} not included in references to “my children,” but will receive any gift made to them by name in this will.`,
    );
  }
  const omitted = omittedChildren(d);
  if (omitted.length) {
    fam.push(`I have intentionally made no provision in this will for ${joinNames(omitted)}, and this omission is not the result of accident or mistake.`);
  }
  articles.push({ title: 'Family', paragraphs: fam });

  // Executor
  const exP: string[] = [];
  const of = (c: string) => (c.trim() ? `, of ${c.trim()},` : '');
  exP.push(`I appoint ${who(d.executor)}${of(d.executor.cityState)} as ${ex} of this will.`);
  if (d.altExecutor.name.trim()) {
    exP.push(
      `If ${v(d.executor.name)} does not survive me, or is unable or unwilling to serve or to continue serving, I appoint ${who(d.altExecutor)}${of(d.altExecutor.cityState)} as ${ex}.`,
    );
  }
  exP.push(`References in this will to my “${ex}” include any successor. No bond or other security shall be required of any ${ex} named in this will, in any jurisdiction.`);
  exP.push(...rules.powers(ex));
  articles.push({ title: ex, paragraphs: exP });

  // Guardian
  if (minorChildren(d).length > 0 && d.guardian.name.trim()) {
    const gt = rules.guardianTitle;
    const g: string[] = [
      `If at my death any child of mine is a minor and a guardian of that child’s person is needed, I nominate ${who(d.guardian)}${of(d.guardian.cityState)} as ${gt}.`,
    ];
    if (d.altGuardian.name.trim()) {
      g.push(`If ${v(d.guardian.name)} is unable or unwilling to serve or to continue serving, I nominate ${who(d.altGuardian)}${of(d.altGuardian.cityState)} as ${gt}.`);
    }
    if (rules.guardianRequest) g.push(rules.guardianRequest);
    articles.push({ title: 'Guardian of Minor Children', paragraphs: g });
  }

  // Specific gifts
  if (d.gifts.length) {
    const gp = d.gifts.map((gift) => {
      const fallback =
        gift.ifRecipientDies === 'descendants'
          ? `this gift shall pass to ${v(gift.recipient)}’s descendants who survive me, per stirpes, or, if none, shall become part of the residue of my estate`
          : 'this gift shall lapse and become part of the residue of my estate';
      return `I give ${v(gift.description)} to ${who({ name: gift.recipient, relationship: gift.relationship })}, if ${v(gift.recipient)} survives me. If not, ${fallback}.`;
    });
    gp.push(
      'If I do not own an item described in this Article at my death, the gift of that item lapses. Each gift passes subject to any mortgage, lien, or other encumbrance on it, which my ' +
        ex +
        ' is not required to pay off.',
    );
    articles.push({ title: 'Specific Gifts', paragraphs: gp });
  }

  // Residue
  const heirs = `the residue shall pass to the persons who would be entitled to inherit it under the laws of ${st} then in effect, as if I had died at that time unmarried and domiciled in ${st}.`;
  const residue: string[] = [
    'My “residue” means all property I own at my death, real and personal, wherever located, that is not effectively given by an earlier Article of this will, including any lapsed gift.',
  ];
  const hasContingent = d.contingent.beneficiaries.length > 0;
  if (d.primary.beneficiaries.length) {
    residue.push(...tierParagraphs(d, d.primary, 'A.', hasContingent ? 'the residue shall pass under Paragraph B of this Article.' : heirs));
    if (hasContingent) residue.push(...tierParagraphs(d, d.contingent, 'B.', heirs));
  } else {
    residue.push(`I give the residue of my estate to ${BLANK}.`);
  }
  articles.push({ title: 'Residue of My Estate', paragraphs: residue });

  // Minors
  articles.push({
    title: 'Gifts to Young Beneficiaries',
    paragraphs: [
      `If any property becomes distributable under this will to a person who is under twenty-one years of age, my ${ex} may distribute it to a custodian for that person under the ${rules.minorsAct}, to be held until that person reaches twenty-one years of age. My ${ex} may choose the custodian, and may choose themself. A receipt from the custodian fully discharges my ${ex} as to that property.`,
    ],
  });

  // General provisions
  articles.push({
    title: 'General Provisions',
    paragraphs: [
      'Survival. A beneficiary who does not survive me by thirty days shall be treated as having died before me.',
      `Debts and expenses. My ${ex} shall pay from the residue of my estate my legally enforceable debts (except that debts secured by property need not be paid before they are due), my funeral expenses, the costs of administering my estate, and any estate or inheritance taxes payable because of my death.`,
      'Definitions. “Descendants” means children, grandchildren, and more remote descendants, including persons adopted while a minor. “Per stirpes” means that the share of a deceased person is divided equally among that person’s children, with the share of any deceased child passing in the same way to that child’s descendants.',
      `Governing law. This will shall be interpreted under the laws of ${st}. Headings are for convenience only. If any provision is held invalid, the remaining provisions remain in effect.`,
    ],
  });

  return { title: `Last Will and Testament of ${v(d.name)}`, rules, articles };
}
