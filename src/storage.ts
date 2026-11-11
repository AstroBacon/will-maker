import { emptyDirective, emptyWill, newId, sameName, type Child, type ChildParent, type Directive, type WillData } from './types';

const KEY = 'will-maker:draft:v1';

/** Fills in fields added after a draft was saved, so older drafts keep working. */
export function normalize(raw: unknown): WillData {
  const base = emptyWill();
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<WillData>;
  return {
    ...base,
    ...r,
    info: { ...base.info, ...(r.info ?? {}) },
    children: (r.children ?? []).map((c) => ({ ...c, parent: c.parent ?? 'both' })),
    spouseGifts: r.spouseGifts ?? [],
    assets: r.assets ?? [],
    docs: { ...base.docs, ...(r.docs ?? {}) },
    directive: mergeDirective(r.directive),
    spouseDirective: mergeDirective(r.spouseDirective),
  };
}

function mergeDirective(raw?: Partial<Directive>): Directive {
  const base = emptyDirective();
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    ga: { ...base.ga, ...(raw.ga ?? {}) },
    or: { ...base.or, ...(raw.or ?? {}), abilities: { ...base.or.abilities, ...(raw.or?.abilities ?? {}) } },
  };
}

/**
 * The app no longer keeps answers in the browser. This erases anything an earlier version saved there.
 */
export function purgeStoredDraft(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable — nothing to erase */
  }
}

export function downloadDraft(d: WillData): void {
  const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `will-draft-${(d.name || 'unnamed').replace(/\W+/g, '-').toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function readDraftFile(file: File): Promise<WillData> {
  return normalize(JSON.parse(await file.text()));
}

const CHILD_TERMS = ['child', 'son', 'daughter'];
const flipParent = (p: ChildParent): ChildParent => (p === 'me' ? 'spouse' : p === 'spouse' ? 'me' : 'both');

/**
 * Builds the spouse's matching will. The two people swap places; children, executor, guardian and the
 * residue plan carry over. Relationship labels are corrected from the spouse's point of view
 * (e.g. the will-maker's own daughter becomes the spouse's stepdaughter).
 */
export function mirrorForSpouse(d: WillData): WillData {
  const me = d.name;
  const spouse = d.spouseName;
  const children: Child[] = d.children.map((c) => ({ ...c, parent: flipParent(c.parent) }));

  const relFor = (name: string, rel: string): string => {
    if (sameName(name, me)) return 'spouse';
    const kid = children.find((c) => sameName(c.name, name));
    if (!kid) return rel;
    const r = rel.trim().toLowerCase();
    if (kid.parent === 'spouse') return CHILD_TERMS.includes(r) ? `step${r}` : rel;
    if (r.startsWith('step') && CHILD_TERMS.includes(r.slice(4))) return r.slice(4);
    return rel;
  };
  const swap = <T extends { name: string; relationship: string }>(p: T): T => {
    const name = sameName(p.name, spouse) ? me : p.name;
    return { ...p, name, relationship: relFor(name, p.relationship) };
  };
  const swapTier = (t: WillData['primary']) => ({
    ...t,
    beneficiaries: t.beneficiaries.map((b) => ({ ...swap(b), id: newId() })),
  });

  return {
    ...d,
    name: spouse,
    spouseName: me,
    children,
    executor: swap(d.executor),
    altExecutor: swap(d.altExecutor),
    guardian: swap(d.guardian),
    altGuardian: swap(d.altGuardian),
    gifts: d.spouseGifts,
    spouseGifts: d.gifts,
    primary: swapTier(d.primary),
    contingent: swapTier(d.contingent),
    assets: d.assets.map((a) => ({ ...a, owner: a.owner === 'me' ? 'spouse' : a.owner === 'spouse' ? 'me' : 'joint' })),
    directive: d.spouseDirective,
    spouseDirective: d.directive,
  };
}
