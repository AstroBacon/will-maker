import type { StateCode } from './types';

/**
 * State-specific rules. Everything that differs between states lives here so
 * new states can be added without touching the will template.
 *
 * ALL TEXT AND CITATIONS BELOW ARE DRAFTS FOR ATTORNEY REVIEW.
 */
export interface StateRules {
  code: StateCode;
  name: string;
  executorTitle: string;
  minAgeNote: string;
  attestation: (testator: string) => string;
  witnessAgeNote: string;
  affidavit: 'GA' | 'OR';
  minorsAct: string;
  powers: (title: string) => string[];
  spouseWarning: string;
  checklist: string[];
  reviewNotes: { topic: string; note: string }[];
}

const commonChecklistEnd = [
  'Keep the signed original somewhere safe, like a fireproof box at home, and tell your executor where it is. Don’t staple, unstaple, or write on it after signing. To change anything, make a new will.',
  'Check the beneficiary designations on life insurance, retirement accounts, and bank or brokerage accounts. The will does not control those, so they need to match your wishes separately.',
  'Look at the will again after any big life change: marriage, divorce, a death in the family, a new child or grandchild, or a move to another state.',
];

export const RULES: Record<StateCode, StateRules> = {
  GA: {
    code: 'GA',
    name: 'Georgia',
    executorTitle: 'Executor',
    minAgeNote: 'Georgia lets anyone 14 or older make a will.',
    witnessAgeNote: 'Georgia requires witnesses to be at least 14. Use adults.',
    attestation: (t) =>
      `The foregoing instrument, consisting of this and the preceding pages, was on the date above signed by ${t}, the testator, and declared by the testator to be the testator’s Last Will and Testament, in our presence. At the testator’s request and in the testator’s presence, we have signed our names below as attesting witnesses. Each of us is at least fourteen years of age, and each of us believes ${t} to be of sound mind and to be acting freely and voluntarily.`,
    affidavit: 'GA',
    minorsAct: 'Georgia Transfers to Minors Act',
    powers: (title) => [
      `In addition to all powers granted by law, I grant my ${title} all of the powers contained in O.C.G.A. § 53-12-261, as amended, which are incorporated into this will by reference. My ${title} may sell, lease, or mortgage any property of my estate, publicly or privately, without an order of any court.`,
      `To the fullest extent permitted by Georgia law, I relieve my ${title} from making or filing any inventory, appraisal, or annual or other returns or reports to any court.`,
    ],
    spouseWarning:
      'In Georgia, a surviving spouse and minor children can ask the probate court for “year’s support,” money from the estate to live on for a year. The court can grant it no matter what the will says. If your spouse gets little or nothing under this will, talk to your lawyer.',
    checklist: [
      'Read the whole will carefully. If anything is wrong, fix it in the app and print it again. Don’t write corrections on the printed copy.',
      'Find two witnesses. Pick adults who get nothing under the will and aren’t married to anyone who does. In Georgia, a gift to a witness can be thrown out.',
      'Arrange for a notary to be there at the same signing; many banks do this for free. A notary is optional, but the notarized self-proving affidavit (the last page) means your witnesses won’t have to be found and questioned in court later.',
      'In front of both witnesses (and the notary), sign and date the will at the end, and initial the bottom of every page.',
      'Both witnesses sign while you watch, then print their names and addresses.',
      'You and both witnesses sign the self-proving affidavit in front of the notary. The notary fills in the rest and adds their seal.',
      'Optional: some Georgia county probate courts will hold a will for safekeeping. Call your county’s probate court to ask.',
      ...commonChecklistEnd,
    ],
    reviewNotes: [
      { topic: 'Execution', note: 'O.C.G.A. § 53-4-20 (writing, signature, 2 witnesses). Testator capacity at age 14: § 53-4-10. Witness age 14: § 53-4-22.' },
      { topic: 'Interested witness', note: '§ 53-4-23. The app advises using disinterested witnesses but does not check witness identities.' },
      { topic: 'Self-proving affidavit', note: 'Compare the generated affidavit word for word with the form in § 53-4-24.' },
      { topic: 'Revocation by marriage / birth', note: '§ 53-4-48. The will has a contemplation clause for after-born or adopted children, but NOT for a future marriage, so a later marriage would revoke the will. Is that the right default?' },
      { topic: 'After-born children', note: 'When the residue goes in equal shares to all of the listed children, the will treats it as a class gift (“my children”), which picks up after-born children. In every other setup, an after-born child gets nothing under the will.' },
      { topic: 'Divorce', note: '§ 53-4-49 (provisions for a former spouse are revoked). The will relies on the statute.' },
      { topic: 'Fiduciary powers / waivers', note: 'Powers are incorporated by reference to § 53-12-261. The waiver of inventory and returns uses general “to the fullest extent permitted” wording. Confirm that’s enough, or cite specific Code sections.' },
      { topic: 'Year’s support', note: '§ 53-3-1 et seq. The app shows a warning when a married testator leaves the spouse out of the primary residuary group.' },
      { topic: 'Guardian', note: 'Testamentary guardian of the person: § 29-2-4. Property for minors is handled through a custodian under the Transfers to Minors Act (§ 44-5-110 et seq.), held to age 21.' },
      { topic: 'Survivorship', note: 'The will requires beneficiaries to survive by 30 days. The statutory default is 120 hours.' },
    ],
  },
  OR: {
    code: 'OR',
    name: 'Oregon',
    executorTitle: 'Personal Representative',
    minAgeNote: 'In Oregon you must be at least 18 (or married, or emancipated) to make a will.',
    witnessAgeNote: 'Oregon requires competent witnesses. Use adults.',
    attestation: (t) =>
      `On the date above, ${t} signed the foregoing instrument, consisting of this and the preceding pages, in our presence, or acknowledged that signature to us, and declared it to be the testator’s will. Each of us either saw ${t} sign or heard ${t} acknowledge the signature, and each of us has signed below as an attesting witness in ${t}’s presence. ${t} appeared to us to be of sound mind and under no duress, fraud, or undue influence.`,
    affidavit: 'OR',
    minorsAct: 'Oregon Uniform Transfers to Minors Act',
    powers: (title) => [
      `My ${title} shall have all powers granted to personal representatives under Oregon law, including the authority to sell, lease, or mortgage any property of my estate, publicly or privately, without court order, to the extent permitted by law.`,
    ],
    spouseWarning:
      'In Oregon, a surviving spouse can claim an “elective share” of your estate no matter what the will says. The share grows with the length of the marriage, up to about one-third. If your spouse gets less than that under this will, talk to your lawyer.',
    checklist: [
      'Read the whole will carefully. If anything is wrong, fix it in the app and print it again. Don’t write corrections on the printed copy.',
      'Find two witnesses. Oregon doesn’t ban witnesses who inherit, but pick adults who get nothing under the will. That makes it much harder for anyone to challenge the will.',
      'Each witness has to either watch you sign or hear you say the signature is yours. It’s simplest to have everyone in the same room at once.',
      'Optional but helpful: have a notary there. The witnesses sign the affidavit on the last page in front of the notary, which makes probate easier.',
      'Sign and date the will at the end, and initial the bottom of every page.',
      'Both witnesses sign, then print their names and addresses.',
      ...commonChecklistEnd,
    ],
    reviewNotes: [
      { topic: 'Execution', note: 'ORS 112.235 (writing, signature, 2 witnesses who saw the signing or heard the acknowledgment). Capacity: ORS 112.225. FYI: harmless-error rule at ORS 112.238.' },
      { topic: 'Witness affidavit', note: 'The generated attesting-witness affidavit is meant to support proof of the will under ORS 113.055. Check the form and the notary block.' },
      { topic: 'Revocation by marriage', note: 'ORS 112.305. The will does NOT contemplate a future marriage, so a later marriage would revoke it. Is that the right default?' },
      { topic: 'Divorce', note: 'ORS 112.315. The will relies on the statute.' },
      { topic: 'Pretermitted children', note: 'ORS 112.405. The will includes a contemplation clause, and the residue becomes a class gift only when it goes equally to all listed children. In other setups, consider whether an after-born child should share.' },
      { topic: 'Elective share', note: 'ORS 114.600–114.725. The app shows a warning when a married testator leaves the spouse out of the primary residuary group.' },
      { topic: 'Bond / powers', note: 'The will waives bond (see ORS 113.105) and grants general powers (ORS 114.305).' },
      { topic: 'Guardian', note: 'Parental appointment of a guardian by will under ORS chapter 125. Confirm the wording and cite.' },
      { topic: 'Minors', note: 'Oregon UTMA (ORS 126.805 et seq.). The will uses age 21; Oregon allows extending custodianship to 25 if desired.' },
      { topic: 'Survivorship', note: 'The will requires beneficiaries to survive by 30 days. The statutory default is 120 hours (ORS 112.572).' },
    ],
  },
};
