export type StateCode = 'GA' | 'OR';
export type MaritalStatus = 'married' | 'single' | 'divorced' | 'widowed';

/** Whose child this is, from the will-maker's point of view (matters for blended families). */
export type ChildParent = 'both' | 'me' | 'spouse';

export interface Child {
  id: string;
  name: string;
  isMinor: boolean;
  parent: ChildParent;
}

/** An executor/personal representative or guardian. */
export interface Fiduciary {
  name: string;
  relationship: string;
  cityState: string;
}

export interface Share {
  id: string;
  name: string;
  relationship: string;
  percent: number;
}

/** What happens to a beneficiary's share if they die before the will-maker. */
export type LapseRule = 'descendants' | 'others';

export interface ResiduaryTier {
  beneficiaries: Share[];
  split: 'equal' | 'percent';
  lapse: LapseRule;
}

export interface SpecificGift {
  id: string;
  description: string;
  recipient: string;
  relationship: string;
  ifRecipientDies: 'residue' | 'descendants';
}

export type AssetKind = 'bank' | 'retirement' | 'investment' | 'insurance' | 'real_estate' | 'vehicle' | 'other' | 'debt';
/** How an asset passes at death. Only 'will' assets are controlled by the will. */
export type PassesBy = 'beneficiary' | 'joint' | 'will' | 'unsure';

export interface Asset {
  id: string;
  kind: AssetKind;
  description: string;
  institution: string;
  last4: string;
  owner: 'me' | 'spouse' | 'joint';
  passesBy: PassesBy;
  beneficiary: string;
  value: string;
  notes: string;
}

/** Practical information for the executor. Printed with the asset list, never in the will. */
export interface ExecutorInfo {
  documents: string;
  contacts: string;
  digital: string;
  wishes: string;
}

/** Which documents the user is making. Each can be made (or remade) on its own. */
export interface Docs {
  will: boolean;
  assets: boolean;
  directive: boolean;
  poa: boolean;
}

/** The 13 subjects of general authority in the Georgia statutory form (O.C.G.A. § 10-6B-70). */
export type PoaSubject =
  | 'realProperty' | 'tangible' | 'stocks' | 'commodities' | 'banks' | 'business' | 'insurance'
  | 'estates' | 'claims' | 'maintenance' | 'benefits' | 'retirement' | 'taxes';

/** Powers that can shrink the estate or change who inherits; off unless initialed. */
export type PoaSpecific =
  | 'trust' | 'gift' | 'survivorship' | 'beneficiary' | 'delegate' | 'waiveAnnuity' | 'electronic' | 'fiduciary' | 'renounce';

/** Financial power of attorney choices. */
export interface Poa {
  agent: HealthPerson;
  successor1: HealthPerson;
  successor2: HealthPerson;
  allSubjects: boolean;
  subjects: Record<PoaSubject, boolean>;
  specific: Record<PoaSpecific, boolean>;
  specialInstructions: string;
  conservator: '' | 'agent' | 'other';
  conservatorPerson: HealthPerson;
  /** Oregon only: effective now, or only once financially incapable (ORS 127.005(2)). */
  effective: 'now' | 'incapacity';
}

/** Someone named in the advance directive (health care agent/representative, guardian, etc.). */
export interface HealthPerson {
  name: string;
  relationship: string;
  address: string;
  phone: string;
}

/** Georgia advance directive choices (O.C.G.A. § 31-32-4). */
export interface GaDirective {
  noAutopsy: boolean;
  noMedicalStudy: boolean;
  noOrganDonation: boolean;
  dispositionByOther: boolean;
  dispositionPerson: HealthPerson;
  body: '' | 'buried' | 'cremated';
  condTerminal: boolean;
  condUnconscious: boolean;
  preference: '' | 'A' | 'B' | 'C';
  cNutrition: boolean;
  cFluids: boolean;
  cVentilator: boolean;
  cCpr: boolean;
  additional: string;
  pregnancy: boolean;
  guardian: '' | 'A' | 'B';
  guardianPerson: HealthPerson;
}

/** One answer to an Oregon life-support question: options 1–4 of ORS 127.529 § 3.A. */
export type OrOption = '' | '1' | '2' | '3' | '4';

/** Oregon advance directive choices (ORS 127.529). */
export interface OrDirective {
  terminal: OrOption;
  progressive: OrOption;
  unconscious: OrOption;
  moreCare: string;
  knowAboutMe: string;
  valueMost: string;
  importantFor: string;
  abilities: { express: boolean; pain: boolean; know: boolean; noMachines: boolean; activities: boolean };
  activitiesText: string;
  sayMore: string;
  spiritual: string;
  lifeValues: string;
  placeOfCare: string;
  attachments: string;
  inform: HealthPerson;
}

export interface Directive {
  dob: string;
  address: string;
  phone: string;
  agent: HealthPerson;
  alt1: HealthPerson;
  alt2: HealthPerson;
  ga: GaDirective;
  or: OrDirective;
}

export interface WillData {
  state: StateCode | '';
  name: string;
  city: string;
  county: string;
  maritalStatus: MaritalStatus;
  spouseName: string;
  children: Child[];
  executor: Fiduciary;
  altExecutor: Fiduciary;
  guardian: Fiduciary;
  altGuardian: Fiduciary;
  gifts: SpecificGift[];
  /** Couples mode: also produce a matching will for the spouse. */
  couple: boolean;
  /** The spouse's own specific gifts (relationships are from the spouse's point of view). */
  spouseGifts: SpecificGift[];
  assets: Asset[];
  info: ExecutorInfo;
  docs: Docs;
  /** The will-maker's advance directive, and (couples mode) the spouse's. */
  directive: Directive;
  spouseDirective: Directive;
  /** The will-maker's financial power of attorney, and (couples mode) the spouse's. */
  poa: Poa;
  spousePoa: Poa;
  /** Who gets "everything else" first. */
  primary: ResiduaryTier;
  /** Backup group if nobody in the primary group (or their descendants, if applicable) survives. */
  contingent: ResiduaryTier;
}

export const newId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

export const emptyFiduciary = (): Fiduciary => ({ name: '', relationship: '', cityState: '' });

export const emptyTier = (lapse: LapseRule = 'descendants'): ResiduaryTier => ({
  beneficiaries: [],
  split: 'equal',
  lapse,
});

export const emptyHealthPerson = (): HealthPerson => ({ name: '', relationship: '', address: '', phone: '' });

export function emptyDirective(): Directive {
  return {
    dob: '',
    address: '',
    phone: '',
    agent: emptyHealthPerson(),
    alt1: emptyHealthPerson(),
    alt2: emptyHealthPerson(),
    ga: {
      noAutopsy: false,
      noMedicalStudy: false,
      noOrganDonation: false,
      dispositionByOther: false,
      dispositionPerson: emptyHealthPerson(),
      body: '',
      condTerminal: false,
      condUnconscious: false,
      preference: '',
      cNutrition: false,
      cFluids: false,
      cVentilator: false,
      cCpr: false,
      additional: '',
      pregnancy: false,
      guardian: '',
      guardianPerson: emptyHealthPerson(),
    },
    or: {
      terminal: '',
      progressive: '',
      unconscious: '',
      moreCare: '',
      knowAboutMe: '',
      valueMost: '',
      importantFor: '',
      abilities: { express: false, pain: false, know: false, noMachines: false, activities: false },
      activitiesText: '',
      sayMore: '',
      spiritual: '',
      lifeValues: '',
      placeOfCare: '',
      attachments: '',
      inform: emptyHealthPerson(),
    },
  };
}

export function emptyPoa(): Poa {
  return {
    agent: emptyHealthPerson(),
    successor1: emptyHealthPerson(),
    successor2: emptyHealthPerson(),
    allSubjects: false,
    subjects: {
      realProperty: false, tangible: false, stocks: false, commodities: false, banks: false, business: false, insurance: false,
      estates: false, claims: false, maintenance: false, benefits: false, retirement: false, taxes: false,
    },
    specific: { trust: false, gift: false, survivorship: false, beneficiary: false, delegate: false, waiveAnnuity: false, electronic: false, fiduciary: false, renounce: false },
    specialInstructions: '',
    conservator: '',
    conservatorPerson: emptyHealthPerson(),
    effective: 'now',
  };
}

export function emptyWill(): WillData {
  return {
    state: '',
    name: '',
    city: '',
    county: '',
    maritalStatus: 'married',
    spouseName: '',
    children: [],
    executor: emptyFiduciary(),
    altExecutor: emptyFiduciary(),
    guardian: emptyFiduciary(),
    altGuardian: emptyFiduciary(),
    gifts: [],
    couple: true,
    spouseGifts: [],
    assets: [],
    info: { documents: '', contacts: '', digital: '', wishes: '' },
    docs: { will: true, assets: false, directive: false, poa: false },
    directive: emptyDirective(),
    spouseDirective: emptyDirective(),
    poa: emptyPoa(),
    spousePoa: emptyPoa(),
    primary: emptyTier(),
    contingent: emptyTier(),
  };
}

export const sameName = (a: string, b: string) =>
  a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ') &&
  a.trim() !== '';

/** The will-maker's own children (excludes the spouse's children from another relationship). */
export const ownChildren = (d: WillData) => d.children.filter((c) => c.parent !== 'spouse');
export const stepChildren = (d: WillData) => d.children.filter((c) => c.parent === 'spouse');
export const isCouple = (d: WillData) => d.couple && d.maritalStatus === 'married';
export const firstName = (full: string, fallback = 'your spouse') => full.trim().split(/\s+/)[0] || fallback;
