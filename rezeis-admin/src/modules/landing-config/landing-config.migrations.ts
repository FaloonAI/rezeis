import { LANDING_SCHEMA_VERSION, readJsonObject } from './landing-config.schema';

/**
 * Forward-migration of stored landing configs across `schemaVersion` bumps.
 *
 * When the section catalog / field shapes evolve we bump
 * `LANDING_SCHEMA_VERSION` and add a step here. On every read, a stored config
 * whose `schemaVersion` is behind the current one is upgraded through the
 * ordered steps so old published/draft snapshots keep rendering. Migrations
 * are pure functions `(config) => config` and MUST be idempotent-safe for the
 * version they target.
 */

type MigrationStep = (config: Record<string, unknown>) => Record<string, unknown>;

/**
 * Ordered steps keyed by the version they upgrade FROM. `migrations[1]` turns a
 * v1 config into a v2 config, etc. Empty until the first breaking bump.
 */
const migrations: Readonly<Record<number, MigrationStep>> = {
  // 1: (config) => ({ ...config, schemaVersion: 2, /* new fields */ }),
};

/**
 * Upgrades a raw stored config to the current `LANDING_SCHEMA_VERSION`.
 * Unknown/ahead versions are returned untouched (the renderer/validator then
 * ignores unknown fields and skips unknown sections — fail-closed).
 */
export function migrateLandingConfig(raw: unknown): Record<string, unknown> {
  let config = readJsonObject(raw as never);
  let version = typeof config['schemaVersion'] === 'number' ? (config['schemaVersion'] as number) : 1;

  while (version < LANDING_SCHEMA_VERSION) {
    const step = migrations[version];
    if (step === undefined) {
      // No step for this version — stamp forward so we don't loop forever.
      config = { ...config, schemaVersion: version + 1 };
      version += 1;
      continue;
    }
    config = step(config);
    version = typeof config['schemaVersion'] === 'number' ? (config['schemaVersion'] as number) : version + 1;
  }

  return config;
}
