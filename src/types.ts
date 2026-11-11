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
