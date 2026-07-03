/**
 * Result of resolving a free-text identifier (reiwa_id / Telegram ID / login /
 * email) to a single reiwa user for the "Allowed users" plan picker.
 */
export interface AdminUserResolveResultInterface {
  /** Canonical reiwa user id (CUID) — the value stored in `plan.allowedUserIds`. */
  readonly id: string;
  /** Human-friendly label for the resolved user (name / login / email / tg id). */
  readonly label: string;
}
