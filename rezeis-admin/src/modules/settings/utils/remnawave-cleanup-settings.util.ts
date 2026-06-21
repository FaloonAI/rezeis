/**
 * Remnawave expired-profile cleanup settings (panel-managed)
 * ──────────────────────────────────────────────────────────
 * Stored in `Settings.remnawaveCleanupSettings` (JSON). Controls whether — and
 * how long after a subscription lapses — the panel removes the upstream
 * Remnawave **panel profile** for that subscription.
 *
 * Why this is configurable:
 *   A single Remnawave panel can be shared by several projects/panels. Deleting
 *   a profile the moment a subscription expires is dangerous in that setup — it
 *   can wipe a user that another project still owns. So operators get:
 *     - `deleteEnabled`  — turn the auto-deletion off entirely (never touch the
 *                          Remnawave profile; the local row still expires).
 *     - `graceDays`      — only delete N days AFTER expiry (default 3), giving
 *                          the user a window to renew before the profile is
 *                          detached from the panel.
 *
 * Defaults preserve a safe, non-aggressive behaviour: deletion ON with a 3-day
 * grace.
 */

/** Raw JSON shape persisted in the settings column. */
export interface StoredRemnawaveCleanupSettings {
  deleteEnabled?: boolean;
  graceDays?: number;
}

/** Effective view returned to the SPA and consumed by the cleanup sweep. */
export interface RemnawaveCleanupSettingsView {
  /** When false, the sweep never deletes Remnawave panel profiles. */
  readonly deleteEnabled: boolean;
  /** Days to wait AFTER a subscription expires before deleting its profile. */
  readonly graceDays: number;
}

export const DEFAULT_CLEANUP_GRACE_DAYS = 3;
const MIN_GRACE_DAYS = 0;
const MAX_GRACE_DAYS = 365;

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? Math.trunc(value) : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function toRemnawaveCleanupSettingsView(
  stored: StoredRemnawaveCleanupSettings,
): RemnawaveCleanupSettingsView {
  return {
    deleteEnabled: typeof stored.deleteEnabled === 'boolean' ? stored.deleteEnabled : true,
    graceDays:
      typeof stored.graceDays === 'number'
        ? clampInt(stored.graceDays, MIN_GRACE_DAYS, MAX_GRACE_DAYS, DEFAULT_CLEANUP_GRACE_DAYS)
        : DEFAULT_CLEANUP_GRACE_DAYS,
  };
}

export interface RemnawaveCleanupSettingsPatch {
  deleteEnabled?: boolean;
  graceDays?: number;
}

export function mergeRemnawaveCleanupSettings(
  previous: StoredRemnawaveCleanupSettings,
  patch: RemnawaveCleanupSettingsPatch,
): StoredRemnawaveCleanupSettings {
  const next: StoredRemnawaveCleanupSettings = { ...previous };
  if (patch.deleteEnabled !== undefined) next.deleteEnabled = patch.deleteEnabled;
  if (patch.graceDays !== undefined) {
    next.graceDays = clampInt(
      patch.graceDays,
      MIN_GRACE_DAYS,
      MAX_GRACE_DAYS,
      DEFAULT_CLEANUP_GRACE_DAYS,
    );
  }
  return next;
}
