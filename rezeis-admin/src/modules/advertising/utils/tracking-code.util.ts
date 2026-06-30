import { randomBytes } from 'node:crypto';

/**
 * Tracking codes are carried in the Telegram deep-link `start` parameter as
 * `ad_<code>`. Telegram caps the `start`/`startapp` payload at 64 chars and
 * only allows `[A-Za-z0-9_-]`, so codes use a 3–32 char subset of that
 * alphabet, leaving ample room for the `ad_` prefix.
 */
export const AD_CODE_PREFIX = 'ad_';

/** Telegram's hard limit on a `start`/`startapp` payload. */
export const TELEGRAM_START_PAYLOAD_MAX = 64;

const TRACKING_CODE_RE = /^[A-Za-z0-9_-]{3,32}$/;

/** Alphabet for minted codes — unambiguous, URL/Telegram-safe. */
const CODE_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** True when `code` is a syntactically valid tracking code. */
export function isValidTrackingCode(code: string): boolean {
  return TRACKING_CODE_RE.test(code);
}

/**
 * Mints a random tracking code of `length` (default 10) chars from the safe
 * alphabet. Uses rejection sampling so the distribution is uniform.
 */
export function generateTrackingCode(length = 10): string {
  const safeLength = Math.min(Math.max(length, 3), 32);
  const out: string[] = [];
  while (out.length < safeLength) {
    const bytes = randomBytes(safeLength);
    for (let i = 0; i < bytes.length && out.length < safeLength; i += 1) {
      const idx = bytes[i];
      // Reject the tail that would bias the modulo (256 % 62 != 0).
      if (idx >= CODE_ALPHABET.length * Math.floor(256 / CODE_ALPHABET.length)) {
        continue;
      }
      out.push(CODE_ALPHABET[idx % CODE_ALPHABET.length]);
    }
  }
  return out.join('');
}

/** Builds the `ad_<code>` payload, throwing if it would exceed Telegram's cap. */
export function buildAdPayload(code: string): string {
  const payload = `${AD_CODE_PREFIX}${code}`;
  if (payload.length > TELEGRAM_START_PAYLOAD_MAX) {
    throw new Error(`Advertising payload exceeds ${TELEGRAM_START_PAYLOAD_MAX} chars`);
  }
  return payload;
}

/**
 * Extracts the tracking code from a raw `start`/`startapp` payload. Returns
 * `null` when the payload is not an advertising payload or the embedded code is
 * malformed — so callers can fall through to the referral/link routing.
 */
export function parseAdPayload(payload: string | null | undefined): string | null {
  if (typeof payload !== 'string') {
    return null;
  }
  const trimmed = payload.trim();
  if (!trimmed.startsWith(AD_CODE_PREFIX)) {
    return null;
  }
  const code = trimmed.slice(AD_CODE_PREFIX.length);
  return isValidTrackingCode(code) ? code : null;
}

/** Ready-to-share links for a placement's tracking code. */
export interface AdDeepLinks {
  readonly botStart: string;
  readonly miniAppStart: string | null;
  readonly miniAppWeb: string | null;
}

/**
 * Builds the deep links operators paste into ads. `botUsername` is required;
 * the Mini-App links are emitted only when a Mini-App short-name / web base is
 * configured.
 */
export function buildAdDeepLinks(input: {
  readonly botUsername: string;
  readonly miniAppShortName?: string | null;
  readonly miniAppWebBaseUrl?: string | null;
  readonly code: string;
}): AdDeepLinks {
  const payload = buildAdPayload(input.code);
  const bot = input.botUsername.replace(/^@+/, '').trim();
  const botStart = `https://t.me/${bot}?start=${payload}`;
  const shortName = (input.miniAppShortName ?? '').trim();
  const miniAppStart =
    shortName.length > 0 ? `https://t.me/${bot}/${shortName}?startapp=${payload}` : null;
  const webBase = (input.miniAppWebBaseUrl ?? '').replace(/\/+$/, '').trim();
  const miniAppWeb = webBase.length > 0 ? `${webBase}/?campaign=${payload}` : null;
  return { botStart, miniAppStart, miniAppWeb };
}
