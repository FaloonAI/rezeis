/**
 * remnawave-overlay.util
 * ──────────────────────
 * Bot backups (STEALTHNET / Remnashop / Altshop) are NOT the source of truth:
 * their subscription rows are a point-in-time snapshot that may already be
 * stale (the user's plan could have expired since the dump). Remnawave itself
 * is the live truth.
 *
 * So at import time we cross-check every backup subscription that carries a
 * Remnawave UUID against the live panel and, when the panel still knows the
 * profile, overlay its FRESH state (status / expiry / limits / squads / url).
 * Profiles the panel no longer has are treated as expired — kept locally so
 * the user can re-buy through the bot, but never resurrected as "active".
 *
 * The import is READ-ONLY toward Remnawave: it never pushes the (possibly
 * stale) backup state back, so live profiles are never clobbered.
 */
import { SubscriptionStatus } from '@prisma/client';

import type { RemnawavePanelUser } from '../../remnawave/services/remnawave-api.service';

/** Fresh subscription fields projected from a live Remnawave panel profile. */
export interface PanelSubscriptionState {
  readonly status: SubscriptionStatus;
  readonly expiresAt: Date | null;
  /** GB; `null` = unlimited (panel stores bytes, we store GB). */
  readonly trafficLimit: number | null;
  readonly deviceLimit: number;
  readonly internalSquads: string[];
  readonly externalSquad: string | null;
  readonly configUrl: string | null;
}

/** Map a Remnawave status string to our enum. Unknown → EXPIRED (not live). */
export function mapPanelStatus(raw: string | null | undefined): SubscriptionStatus {
  switch ((raw ?? '').toUpperCase()) {
    case 'ACTIVE':
      return SubscriptionStatus.ACTIVE;
    case 'DISABLED':
      return SubscriptionStatus.DISABLED;
    case 'LIMITED':
      return SubscriptionStatus.LIMITED;
    case 'EXPIRED':
      return SubscriptionStatus.EXPIRED;
    case 'DELETED':
      return SubscriptionStatus.DELETED;
    default:
      return SubscriptionStatus.EXPIRED;
  }
}

/** Statuses we treat as "live" — the user still has a usable subscription. */
export function isLivePanelStatus(status: SubscriptionStatus): boolean {
  return status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.LIMITED;
}

/**
 * Decide a subscription's status when the panel has NO profile for its UUID:
 *   • panel unreachable (we couldn't read it) → trust the backup status as-is
 *     (fail-soft — never mass-expire on a transient outage);
 *   • panel reachable but the profile is gone → a backup that still claims the
 *     sub is live is stale, so it's EXPIRED; any already-non-live backup status
 *     is kept as-is ("остальные остаются как есть").
 */
export function reconcileMissingPanelStatus(
  panelReachable: boolean,
  backupStatus: SubscriptionStatus,
): SubscriptionStatus {
  if (!panelReachable) return backupStatus;
  return isLivePanelStatus(backupStatus) ? SubscriptionStatus.EXPIRED : backupStatus;
}

/** Convert the panel's byte cap to our GB cap (0/negative → unlimited). */
export function panelTrafficGb(trafficLimitBytes: number | null | undefined): number | null {
  if (typeof trafficLimitBytes !== 'number' || !Number.isFinite(trafficLimitBytes)) return null;
  return trafficLimitBytes > 0 ? Math.max(1, Math.round(trafficLimitBytes / 1024 ** 3)) : null;
}

/** Project a live panel profile into our subscription fields (panel = truth). */
export function panelSubscriptionState(panel: RemnawavePanelUser): PanelSubscriptionState {
  return {
    status: mapPanelStatus(panel.status),
    expiresAt: panel.expireAt ? new Date(panel.expireAt) : null,
    trafficLimit: panelTrafficGb(panel.trafficLimitBytes),
    deviceLimit:
      typeof panel.hwidDeviceLimit === 'number' && panel.hwidDeviceLimit >= 0
        ? panel.hwidDeviceLimit
        : 0,
    internalSquads: (panel.activeInternalSquads ?? []).map((s) => s.uuid),
    externalSquad: panel.externalSquadUuid ?? null,
    configUrl: panel.subscriptionUrl || null,
  };
}

/**
 * `getAllPanelUsers` paginates with a hard ceiling (50 × 500). On panels above
 * that ceiling the bulk map is INCOMPLETE — a UUID missing from it might just
 * be past the cap rather than genuinely gone. We must not mass-EXPIRE those.
 * Mirror the ceiling here so we can detect "the bulk read was truncated".
 */
const PANEL_BULK_CEILING = 25_000;

/** Resolved bulk view of the panel for an import run. */
export interface PanelLookup {
  readonly map: ReadonlyMap<string, RemnawavePanelUser>;
  /** False when the panel could not be read at all (fail-soft to backup). */
  readonly reachable: boolean;
  /** True when the bulk read returned the whole panel (under the ceiling). */
  readonly complete: boolean;
}

/**
 * Bulk-load the panel once into a {@link PanelLookup} that scales: on a normal
 * panel (under the ceiling) the map is authoritative and per-sub resolution
 * needs zero extra calls; on a huge panel the lookup is flagged incomplete so
 * misses are confirmed with a targeted per-UUID fetch instead of being blindly
 * expired.
 */
export async function buildPanelLookup(
  fetchAll: () => Promise<readonly RemnawavePanelUser[]>,
): Promise<PanelLookup> {
  try {
    const users = await fetchAll();
    const map = new Map<string, RemnawavePanelUser>();
    for (const user of users) {
      if (typeof user.uuid === 'string' && user.uuid.length > 0) map.set(user.uuid, user);
    }
    return { map, reachable: true, complete: users.length < PANEL_BULK_CEILING };
  } catch {
    return { map: new Map(), reachable: false, complete: false };
  }
}

/**
 * Resolve one subscription's live panel profile + whether we actually KNOW its
 * panel state:
 *   • bulk map hit                         → { panel, known: true }
 *   • miss on a COMPLETE bulk map          → { panel: null, known: true } (gone)
 *   • miss on an INCOMPLETE map            → targeted `fetchOne(uuid)` to be sure
 *   • panel unreachable / lookup failed    → { panel: null, known: false } (keep backup)
 *
 * `known === false` means "couldn't determine" → callers must keep the backup
 * value rather than expiring a subscription on incomplete information.
 */
export async function resolvePanelProfile(
  uuid: string,
  lookup: PanelLookup,
  fetchOne: (uuid: string) => Promise<RemnawavePanelUser | null>,
): Promise<{ panel: RemnawavePanelUser | null; known: boolean }> {
  if (!lookup.reachable) return { panel: null, known: false };
  const hit = lookup.map.get(uuid);
  if (hit !== undefined) return { panel: hit, known: true };
  if (lookup.complete) return { panel: null, known: true };
  try {
    return { panel: await fetchOne(uuid), known: true };
  } catch {
    return { panel: null, known: false };
  }
}
