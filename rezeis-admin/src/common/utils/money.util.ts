import { Prisma } from '@prisma/client';

/**
 * Convert a major-unit monetary amount (Prisma `Decimal`, number, or numeric
 * string) into integer minor units (e.g. rubles/dollars → kopecks/cents).
 *
 * ALWAYS rounds: `Number(decimal) * 100` alone accumulates binary-float error
 * (e.g. `999.99 * 100 = 99998.99999…`), which would silently corrupt partner
 * earnings / balances. Use this everywhere a Decimal amount crosses into the
 * integer-minor-unit domain so every call site rounds identically.
 */
export function toMinorUnits(amount: Prisma.Decimal | number | string): number {
  const major = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(major)) return 0;
  return Math.round(major * 100);
}
