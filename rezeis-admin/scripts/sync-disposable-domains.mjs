// @ts-check
/**
 * Regenerates `src/modules/external-auth/data/disposable-domains.ts` from the
 * canonical, community-maintained disposable-email blocklist (CC0):
 *
 *   https://github.com/disposable-email-domains/disposable-email-domains
 *
 * Why a generated bundle (not a runtime dependency): the disposable defense
 * sits on the auth path, so we want a deterministic, offline, in-repo dataset
 * (no network / supply-chain surprise at request time, deterministic tests).
 * Re-run this whenever we want to refresh the list:
 *
 *   node scripts/sync-disposable-domains.mjs
 *
 * The generated file keeps the SAME export (`DISPOSABLE_EMAIL_DOMAINS`) the
 * policy engine already consumes, so no service code changes on refresh.
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SOURCE_URL =
  'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf';

const OUT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../src/modules/external-auth/data/disposable-domains.ts',
);

/** Keeps only well-formed bare domains, lower-cased, de-duplicated and sorted. */
function normalizeDomains(raw) {
  const seen = new Set();
  for (const line of raw.split('\n')) {
    const domain = line.trim().toLowerCase();
    // Skip blanks, comments, and anything that isn't a plausible domain.
    if (domain.length === 0 || domain.startsWith('#')) continue;
    if (domain.includes(' ') || !domain.includes('.')) continue;
    if (!/^[a-z0-9.-]+$/.test(domain)) continue;
    seen.add(domain);
  }
  return Array.from(seen).sort();
}

function renderFile(domains) {
  const header = `/**
 * Disposable / one-time email domains — GENERATED FILE, DO NOT EDIT BY HAND.
 *
 * Source: disposable-email-domains/disposable-email-domains (CC0).
 * Regenerate with: node scripts/sync-disposable-domains.mjs
 * Last synced: ${new Date().toISOString()}
 * Entries: ${domains.length}
 *
 * The policy engine (DisposableEmailService) treats this as a blocklist seed;
 * operators can extend it at runtime with a custom blocklist from the admin UI,
 * and verified provider emails bypass the check entirely.
 */
export const DISPOSABLE_EMAIL_DOMAINS: readonly string[] = [
`;
  const body = domains.map((d) => `  '${d}',`).join('\n');
  return `${header}${body}\n];\n`;
}

async function main() {
  process.stdout.write(`Fetching ${SOURCE_URL}\n`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  const raw = await res.text();
  const domains = normalizeDomains(raw);
  if (domains.length < 500) {
    throw new Error(`Refusing to write a suspiciously small list (${domains.length} entries)`);
  }
  await writeFile(OUT_PATH, renderFile(domains), 'utf8');
  process.stdout.write(`Wrote ${domains.length} domains to ${OUT_PATH}\n`);
}

main().catch((err) => {
  process.stderr.write(`sync-disposable-domains failed: ${err.message}\n`);
  process.exit(1);
});
