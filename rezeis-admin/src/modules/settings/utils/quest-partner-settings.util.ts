import { Prisma } from '@prisma/client';

import { decryptTotpSecret, encryptTotpSecret } from '../../two-factor/utils/secret-cipher';

/**
 * Quest PARTNER_TASK per-partner HMAC secret store, persisted (encrypted) in
 * `Settings.questPartnerSettings`. Mirrors the support/Turnstile secret pattern:
 * secrets are AES-256-GCM at rest, only a presence view reaches the SPA, and an
 * empty secret on update clears the partner. Shape: { partners: [{ slug,
 * secretEnc, label? }] }.
 */
export interface QuestPartnerEntry {
  readonly slug: string;
  readonly secretEnc: string;
  readonly label?: string;
}

export interface QuestPartnerStore {
  readonly partners: QuestPartnerEntry[];
}

/** Admin-safe projection — never carries the secret, only a presence flag. */
export interface QuestPartnerView {
  readonly slug: string;
  readonly label?: string;
  readonly configured: boolean;
}

/** Upsert instruction from the admin API. secret: undefined=keep, ''=clear, else set. */
export interface QuestPartnerUpsert {
  readonly slug: string;
  readonly secret?: string;
  readonly label?: string;
}

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{1,63}$/;

/** Parse the `QUEST_PARTNER_SECRETS` env JSON `{slug:secret}` into a clean map. */
export function parseQuestPartnerEnv(raw: string | undefined): Record<string, string> {
  if (typeof raw !== 'string' || raw.trim() === '') return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const clean: Record<string, string> = {};
  for (const [slug, secret] of Object.entries(parsed as Record<string, unknown>)) {
    if (SLUG_RE.test(slug) && typeof secret === 'string' && secret.length > 0) clean[slug] = secret;
  }
  return clean;
}

/** Strictly parse the untrusted JSON column into a clean store (junk-safe). */
export function readQuestPartnerStore(value: Prisma.JsonValue | undefined | null): QuestPartnerStore {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return { partners: [] };
  const raw = (value as Record<string, unknown>).partners;
  if (!Array.isArray(raw)) return { partners: [] };
  const partners: QuestPartnerEntry[] = [];
  for (const item of raw) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) continue;
    const rec = item as Record<string, unknown>;
    const slug = typeof rec.slug === 'string' ? rec.slug.trim() : '';
    const secretEnc = typeof rec.secretEnc === 'string' ? rec.secretEnc : '';
    if (!SLUG_RE.test(slug) || secretEnc.length === 0) continue;
    const label = typeof rec.label === 'string' && rec.label.trim() !== '' ? rec.label.trim() : undefined;
    partners.push(label !== undefined ? { slug, secretEnc, label } : { slug, secretEnc });
  }
  return { partners };
}

/** Admin-safe view: slug + label + configured flag, never the secret. */
export function toQuestPartnerView(store: QuestPartnerStore): QuestPartnerView[] {
  return store.partners.map((p) =>
    p.label !== undefined
      ? { slug: p.slug, label: p.label, configured: true }
      : { slug: p.slug, configured: true },
  );
}

/** Decrypt into a slug->plaintext map for server-side signature verification. */
export function decryptQuestPartnerSecrets(
  store: QuestPartnerStore,
  cryptKey: string,
): Record<string, string> {
  const map: Record<string, string> = {};
  if (cryptKey.length === 0) return map;
  for (const p of store.partners) {
    try {
      map[p.slug] = decryptTotpSecret(p.secretEnc, cryptKey);
    } catch {
      // Skip an undecryptable entry rather than throwing — a rotated/corrupt
      // key must not take down the whole partner-callback path.
    }
  }
  return map;
}

/**
 * Apply upserts to the store. Per entry: empty secret removes the partner;
 * a non-empty secret encrypts and sets it; an omitted secret keeps the existing
 * ciphertext (label-only update). Rejects an upsert that would create a partner
 * with no secret at all.
 */
export function mergeQuestPartnerSecrets(
  current: QuestPartnerStore,
  upserts: readonly QuestPartnerUpsert[],
  cryptKey: string,
): QuestPartnerStore {
  const byslug = new Map(current.partners.map((p) => [p.slug, p]));
  for (const up of upserts) {
    const slug = up.slug.trim();
    if (!SLUG_RE.test(slug)) continue;
    const existing = byslug.get(slug);

    if (up.secret !== undefined && up.secret.trim() === '') {
      byslug.delete(slug); // clear
      continue;
    }

    const label = up.label !== undefined && up.label.trim() !== '' ? up.label.trim() : existing?.label;
    if (up.secret !== undefined) {
      const secretEnc = encryptTotpSecret(up.secret.trim(), cryptKey);
      byslug.set(slug, label !== undefined ? { slug, secretEnc, label } : { slug, secretEnc });
    } else if (existing !== undefined) {
      byslug.set(slug, label !== undefined ? { ...existing, label } : existing);
    }
    // secret omitted AND no existing entry → nothing to store (ignored).
  }
  return { partners: [...byslug.values()] };
}
