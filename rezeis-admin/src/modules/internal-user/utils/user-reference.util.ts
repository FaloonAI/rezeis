import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * A "user reference" is whatever identifier the reiwa edge has on hand
 * for the caller:
 *   - a **reiwa_id** (`User.id`, a CUID like `cmphfcr6i007v01jg0lcu653h`)
 *     for web / web-first users (no Telegram required), or
 *   - a **telegramId** (a positive integer string) for Telegram flows.
 *
 * The two formats are disjoint — a telegramId is digits-only, a reiwa_id
 * is a CUID that always starts with a letter — so a single reference
 * field can carry either and be discriminated unambiguously. This is the
 * backbone of the reiwa_id-first identity model: every user-edge read
 * endpoint accepts either and resolves to the canonical `User.id`.
 */

const TELEGRAM_ID_PATTERN = /^\d{1,19}$/;
// CUID v1: starts with 'c', 25 chars, base36. We stay lenient (letter +
// alnum, length 20-32) to tolerate id-format drift while still excluding
// pure-numeric telegram ids.
const REIWA_ID_PATTERN = /^[a-z][a-z0-9]{19,31}$/i;

export type UserReferenceKind = 'telegramId' | 'reiwaId';

export interface ParsedUserReference {
  readonly kind: UserReferenceKind;
  readonly value: string;
}

/**
 * Discriminates a raw reference string into a telegramId or a reiwa_id.
 * Throws `BadRequestException` when it matches neither shape.
 */
export function parseUserReference(reference: string): ParsedUserReference {
  const trimmed = reference.trim();
  if (TELEGRAM_ID_PATTERN.test(trimmed)) {
    return { kind: 'telegramId', value: trimmed };
  }
  if (REIWA_ID_PATTERN.test(trimmed)) {
    return { kind: 'reiwaId', value: trimmed };
  }
  throw new BadRequestException(
    'User reference must be a numeric telegramId or a reiwa_id (CUID)',
  );
}

/**
 * Builds a Prisma `where` selector for `user.findUnique` from a raw
 * reference (telegramId or reiwa_id).
 */
export function buildUserReferenceWhere(
  reference: string,
): Prisma.UserWhereUniqueInput {
  const parsed = parseUserReference(reference);
  if (parsed.kind === 'telegramId') {
    return { telegramId: BigInt(parsed.value) };
  }
  return { id: parsed.value };
}

/**
 * Picks the best available reference from an identity pair, preferring
 * the canonical reiwa_id. Returns `null` when neither is present.
 */
export function pickUserReference(input: {
  readonly userId?: string | null;
  readonly telegramId?: string | null;
}): string | null {
  if (typeof input.userId === 'string' && input.userId.trim().length > 0) {
    return input.userId.trim();
  }
  if (typeof input.telegramId === 'string' && input.telegramId.trim().length > 0) {
    return input.telegramId.trim();
  }
  return null;
}

/**
 * Like `pickUserReference` but throws `BadRequestException` when neither
 * identifier is present — for controllers that require an identity.
 */
export function requireUserReference(input: {
  readonly userId?: string | null;
  readonly telegramId?: string | null;
}): string {
  const reference = pickUserReference(input);
  if (reference === null) {
    throw new BadRequestException('A userId or telegramId is required');
  }
  return reference;
}
