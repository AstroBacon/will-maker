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
  /** What the will calls the guardian of a minor child. */
  guardianTitle: string;
  /** Extra sentence for the guardian article, if the state's court treats the choice as a preference. */
  guardianRequest?: string;
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
    guardianTitle: 'testamentary guardian',
    powers: (title) => [
      `In addition to all powers granted by law, I grant my ${title} all of the powers contained in O.C.G.A. § 53-12-261, as amended, which are incorporated into this will by reference. My ${title} may sell, lease, or mortgage any property of my estate, publicly or privately, without an order of any court.`,
      `To the fullest extent permitted by Georgia law, I relieve my ${title} from making or filing any inventory, appraisal, or annual or other returns or reports to any court.`,
    ],
    spouseWarning:
      'In Georgia, a surviving spouse and minor children can ask the probate court for “year’s support,” money from the estate to live on for a year. The court can grant it no matter what the will says. If your spouse gets little or nothing under this will, talk to your lawyer.',
    checklist: [
      'Read the whole will carefully. If anything is wrong, fix it in the app and print it again. Don’t write corrections on the printed copy.',
      'Find two witnesses. Pick adults who get nothing under the will and aren’t married to anyone who does. In Georgia, a gift to a witness is void unless two other witnesses get nothing.',
      'Arrange for a notary to be there at the same signing; many banks do this for free. A notary is optional, but the notarized self-proving affidavit (the last page) means your witnesses won’t have to be found and questioned in court later.',
      'In front of both witnesses (and the notary), sign and date the will at the end, and initial the bottom of every page.',
      'Both witnesses sign while you watch, then print their names and addresses.',
      'You and both witnesses sign the self-proving affidavit in front of the notary. The notary fills in the rest and adds their seal.',
      'Optional: some Georgia county probate courts will hold a will for safekeeping. Call your county’s probate court to ask.',
      ...commonChecklistEnd,
    ],
    reviewNotes: [
      { topic: 'Execution — verified', note: 'O.C.G.A. § 53-4-20: writing; signed by testator (or by another in the testator’s presence at express direction); attested and subscribed in the testator’s presence by 2+ competent witnesses. No attestation clause required; witnesses need not sign in each other’s presence. Testator age 14 (§ 53-4-10); witness age 14 (§ 53-4-22).' },
      { topic: 'Interested witness — verified', note: '§ 53-4-23: a gift to a subscribing witness is void unless at least two other subscribing witnesses take nothing; a gift to a witness’s spouse only affects credibility. The checklist tells users to pick witnesses who take nothing; the app can’t check who actually signs.' },
      { topic: 'Self-proving affidavit — verified', note: 'Now tracks the § 53-4-24(b) form word for word (checked against two copies of the Code). The “My commission expires” line is an addition for notaries; delete it if you prefer the bare form.' },
      { topic: 'Later marriage / children — verified', note: '§ 53-4-48 (current text): a later marriage, birth, or adoption no longer revokes the whole will. The new spouse or child takes an intestate share unless the will provides for the event (gifts under the will count toward it). This will includes a contemplation clause for after-born/adopted children but not for a future marriage, so a later spouse would get an intestate share. Confirm both defaults.' },
      { topic: 'After-born children', note: 'Gifts to “my children” as a class are presumed to include after-born children (§ 53-4-48(b)). The app writes the residue as a class gift only when it goes equally to every listed child. With named shares plus the contemplation clause, an after-born child would get nothing. Fine for parents with grown children; flag for young families.' },
      { topic: 'Divorce — verified', note: '§ 53-4-49: unless the will provides for divorce, provisions take effect as if the former spouse predeceased. The will relies on the statute.' },
      { topic: 'Executor powers / waivers', note: 'Powers incorporated by reference to § 53-12-261 (common Georgia practice; § 53-7-1(b) separately lets beneficiaries ask the court for them). Testator relief from inventory: § 53-7-33; from annual returns: § 53-7-69 (per secondary sources, not yet read in the Code text). The will uses “to the fullest extent permitted by Georgia law.” Consider citing those sections.' },
      { topic: 'Year’s support', note: '§ 53-3-1 et seq. The app warns when a married testator leaves the spouse out of the main residuary group.' },
      { topic: 'Guardian — verified', note: '§ 29-2-4: a parent nominates a testamentary guardian in the will; letters issue on probate only if no other parent is living; certain relatives get notice and can object within 10 days (unfitness must be shown by clear and convincing evidence); no bond. The will now says “nominate … as testamentary guardian.”' },
      { topic: 'Minors — verified', note: 'Georgia Transfers to Minors Act: minor means under 21 (§ 44-5-111); the personal representative may transfer to a custodian and may pick themself if the will names none (§ 44-5-115); custodianship ends at 21 (§ 44-5-130).' },
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
    guardianTitle: 'guardian',
    guardianRequest: 'I request that the court give effect to this preference in appointing a guardian for any minor child of mine.',
    powers: (title) => [
      `My ${title} shall have all powers granted to personal representatives under Oregon law, including the authority to sell, lease, or mortgage any property of my estate, publicly or privately, without court order, to the extent permitted by law.`,
    ],
    spouseWarning:
      'In Oregon, a surviving spouse can claim an “elective share” of your estate no matter what the will says. It starts at 5% for marriages under 2 years and grows to 33% after 15 years. If your spouse gets less than that under this will, talk to your lawyer.',
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
      { topic: 'Execution — verified', note: 'ORS 112.235 (as amended effective 1/1/2026): testator signs (or acknowledges, or directs another to sign) in each witness’s presence; 2 witnesses each see the signing or hear the acknowledgment/direction and sign within a reasonable time. A witness’s signature on a contemporaneous affidavit counts as signing the will if needed (112.235(2)). “Writing” excludes electronic records. Capacity: 18, or lawfully married, or emancipated (112.225). Harmless-error rule: 112.238.' },
      { topic: 'Witness affidavit — verified', note: 'ORS 113.055: an attesting witness’s affidavit may be made at or after execution and replaces the witness’s presence on ex parte probate review. The statute prescribes no form; the generated one is a draft. Check the wording and notary block.' },
      { topic: 'Interested witness — verified', note: 'ORS 112.245: a will attested by an interested witness is not invalid. The app still recommends witnesses who take nothing.' },
      { topic: 'Later marriage — verified', note: 'ORS 112.305: a later marriage revokes the will if the spouse survives, unless the will shows contemplation of the marriage (or a prenup or domestic-partnership exception applies). This will does not contemplate a future marriage. Confirm that default.' },
      { topic: 'Divorce — verified', note: 'ORS 112.315: unless the will shows a different intent, divorce or annulment revokes gifts to the former spouse and their nomination as personal representative.' },
      { topic: 'Pretermitted children — verified', note: 'ORS 112.405: a pretermitted child is one born or adopted after the will who is “neither provided for … nor in any way mentioned.” The will defines “my children” to include after-born children, which probably counts as a mention. So unless the residue is the class gift (equal shares to all listed children), an after-born child likely gets nothing. Flag for young families.' },
      { topic: 'Elective share — verified', note: 'ORS 114.605: 5% of the augmented estate for marriages under 2 years, rising 2 points a year, to 33% at 15+ years. The app warns when a married testator leaves the spouse out of the main residuary group.' },
      { topic: 'Bond / powers — verified', note: 'ORS 113.105(2): no bond if the will waives it (court may still require one for good cause). ORS 114.305 powers apply “except as restricted … by the will”; the will adds nothing restrictive.' },
      { topic: 'Guardian — verified', note: 'Oregon has no automatic testamentary guardian. The court appoints “the most suitable person,” considering “any preference expressed by a parent” (ORS 125.200); notice goes to a person nominated in a parent’s will (ORS 125.060). The will now says “nominate” and asks the court to honor the preference.' },
      { topic: 'Minors — verified', note: 'Oregon UTMA (ORS 126.805–126.886): a personal representative may transfer to a custodian (126.819, 126.822); delivery at 21 by default, and a will may direct delay up to 25 (126.872). The will uses 21.' },
      { topic: 'Optional: property list', note: 'ORS 112.260 lets a will refer to a separate signed list of household items and personal effects. The app doesn’t use it; it could be added.' },
      { topic: 'Survivorship — verified', note: 'The will requires 30 days. Statutory default is 120 hours, by clear and convincing evidence (ORS 112.572).' },
    ],
  },
};
