const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Decides whether a first purchase still counts for the placement that
 * acquired the user. A conversion is attributed iff the purchase happened
 * **on or after** the first touch and **within** `windowDays` of it; later
 * purchases are organic.
 *
 * The window is inclusive of the boundary instant (`acquisitionAt + windowDays`)
 * so a purchase exactly `windowDays` later still attributes. A non-positive
 * window or a missing/`null` `acquisitionAt` means "no attribution".
 */
export function isWithinAttributionWindow(
  acquisitionAt: Date | null | undefined,
  purchaseAt: Date,
  windowDays: number,
): boolean {
  if (acquisitionAt === null || acquisitionAt === undefined) {
    return false;
  }
  if (!Number.isFinite(windowDays) || windowDays <= 0) {
    return false;
  }
  const start = acquisitionAt.getTime();
  const purchase = purchaseAt.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(purchase)) {
    return false;
  }
  if (purchase < start) {
    return false;
  }
  const deadline = start + windowDays * MS_PER_DAY;
  return purchase <= deadline;
}

/** Whole days (rounded down, floored at 0) between two instants. */
export function daysBetween(from: Date, to: Date): number {
  const delta = to.getTime() - from.getTime();
  if (!Number.isFinite(delta) || delta <= 0) {
    return 0;
  }
  return Math.floor(delta / MS_PER_DAY);
}
