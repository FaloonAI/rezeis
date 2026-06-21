/**
 * Pure helpers for the broadcast promo-code tag (Wave 4 of bot-studio-redesign).
 *
 * Keeping the status evaluation and button synthesis free of DI lets the
 * compose-time validation, the dispatch-time gate and the unit tests all share
 * the exact same logic. The status semantics mirror
 * `PromocodeValidationService` (donor `is_expired` / `is_depleted`) so a code
 * that the activation pipeline would reject is also rejected here.
 */
import type { NotifyButton } from '../../notifications/services/bot-notifier.client';

export type BroadcastPromoStatus = 'OK' | 'INACTIVE' | 'EXPIRED' | 'DEPLETED';

export interface BroadcastPromocodeSnapshot {
  readonly isActive: boolean;
  readonly createdAt: Date;
  /** Days until the code expires. `-1`/`null` = unlimited. */
  readonly lifetime: number | null;
  /** Absolute expiry timestamp. Takes precedence over `lifetime` when set. */
  readonly expiresAt: Date | null;
  /** Maximum total activations. `-1`/`null` = unlimited. */
  readonly maxActivations: number | null;
  readonly activationsCount: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** donor parity: `is_expired` — absolute deadline OR creation + lifetime days. */
function isExpired(snapshot: BroadcastPromocodeSnapshot, now: number): boolean {
  if (snapshot.expiresAt != null && snapshot.expiresAt.getTime() < now) {
    return true;
  }
  if (snapshot.lifetime === null || snapshot.lifetime <= 0) {
    return false;
  }
  return snapshot.createdAt.getTime() + snapshot.lifetime * DAY_MS < now;
}

/** donor parity: `is_depleted` — `max_activations <= 0`/`null` means unlimited. */
function isDepleted(snapshot: BroadcastPromocodeSnapshot): boolean {
  if (snapshot.maxActivations === null || snapshot.maxActivations <= 0) {
    return false;
  }
  return snapshot.activationsCount >= snapshot.maxActivations;
}

/**
 * Classifies a promocode for broadcast use. Returns `OK` only when the code is
 * active, not past any deadline, and still has activations left. The order
 * matches the activation pipeline: inactive → expired → depleted.
 */
export function evaluateBroadcastPromocode(
  snapshot: BroadcastPromocodeSnapshot,
  now: Date = new Date(),
): BroadcastPromoStatus {
  if (!snapshot.isActive) return 'INACTIVE';
  if (isExpired(snapshot, now.getTime())) return 'EXPIRED';
  if (isDepleted(snapshot)) return 'DEPLETED';
  return 'OK';
}

export function isBroadcastPromocodeUsable(status: BroadcastPromoStatus): boolean {
  return status === 'OK';
}

/**
 * Relative Mini App path the promo button deep-links to. The reiwa bot resolves
 * it against its own `miniAppUrl`, so rezeis never needs the public URL.
 */
export function buildPromoWebAppPath(code: string): string {
  return `/promo?code=${encodeURIComponent(code)}`;
}

/** Builds the `web_app` notify button appended to promo-tagged broadcasts. */
export function buildPromoButton(code: string, label: string): NotifyButton {
  return { text: label, webAppPath: buildPromoWebAppPath(code) };
}
