/**
 * Coerces a Prisma JSON column value (or any unknown) into a plain object,
 * never `null`/array/primitive. The single source of truth for the pattern
 * that was previously reimplemented per-module (settings, subpage-config,
 * landing-config, advertising) — behaviorally identical to all of them:
 * `null`/`undefined`/non-object/array → `{}`, otherwise the object itself.
 */
export function readJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
