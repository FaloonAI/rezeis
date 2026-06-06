import * as os from 'node:os';

/**
 * Adaptive runtime resource profiling.
 *
 * Lets a single image/compose self-tune to the box it lands on instead of
 * shipping hardcoded pool sizes. The detected budget is the CONTAINER's
 * budget (cgroup limit) when available, so it stays correct even when the
 * panel is co-hosted with other stacks (e.g. reiwa) as long as each service
 * has a memory limit (the compose file sets these).
 *
 * Only used to derive sensible DEFAULTS — any explicit env override always
 * wins (see `resolveDbPoolMax`).
 */

export type ResourceTier = 'small' | 'medium' | 'large';

export interface ResourceProfile {
  /** Memory budget in MiB (cgroup limit when constrained, else host total). */
  readonly memoryBudgetMb: number;
  /** Logical CPU budget (cgroup-aware when the runtime supports it). */
  readonly cpuBudget: number;
  /** Coarse size class derived from the memory budget. */
  readonly tier: ResourceTier;
  /** Where the memory budget came from. */
  readonly memorySource: 'cgroup' | 'host';
  /** Auto-derived Postgres connection-pool max for this process. */
  readonly dbPoolMax: number;
}

/** Upper bound (exclusive) of the "small" tier, in MiB (~1.5 GB). */
const SMALL_TIER_MAX_MB = 1536;
/** Upper bound (exclusive) of the "medium" tier, in MiB (~3 GB). */
const MEDIUM_TIER_MAX_MB = 3072;

/** Per-process Postgres pool max by tier (API and worker each get their own). */
const DB_POOL_MAX_BY_TIER: Record<ResourceTier, number> = {
  small: 5,
  medium: 10,
  large: 20,
};

/**
 * Resolve the memory budget for THIS process. Prefers
 * `process.constrainedMemory()` (the cgroup limit, in bytes; `0`/`undefined`
 * when unconstrained) so we size to the container, not the whole host.
 */
export function getMemoryBudget(): { readonly mb: number; readonly source: 'cgroup' | 'host' } {
  const constrained =
    typeof process.constrainedMemory === 'function' ? process.constrainedMemory() : 0;
  if (typeof constrained === 'number' && constrained > 0) {
    return { mb: Math.floor(constrained / (1024 * 1024)), source: 'cgroup' };
  }
  return { mb: Math.floor(os.totalmem() / (1024 * 1024)), source: 'host' };
}

/** Logical CPU budget, cgroup-aware where the runtime exposes it. */
export function getCpuBudget(): number {
  const parallelism =
    typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length;
  return Math.max(1, parallelism);
}

/** Classify a memory budget (MiB) into a coarse size tier. */
export function classifyTier(memoryBudgetMb: number): ResourceTier {
  if (memoryBudgetMb < SMALL_TIER_MAX_MB) {
    return 'small';
  }
  if (memoryBudgetMb < MEDIUM_TIER_MAX_MB) {
    return 'medium';
  }
  return 'large';
}

/** Compute the full resource profile for the current process. */
export function resolveResourceProfile(): ResourceProfile {
  const { mb, source } = getMemoryBudget();
  const tier = classifyTier(mb);
  return {
    memoryBudgetMb: mb,
    cpuBudget: getCpuBudget(),
    tier,
    memorySource: source,
    dbPoolMax: DB_POOL_MAX_BY_TIER[tier],
  };
}

/**
 * Resolve the Postgres connection-pool max. An explicit, valid
 * `DATABASE_POOL_SIZE` always overrides; otherwise the value is auto-derived
 * from the detected resource tier.
 */
export function resolveDbPoolMax(env: NodeJS.ProcessEnv = process.env): number {
  const explicit = env.DATABASE_POOL_SIZE;
  if (typeof explicit === 'string' && explicit.trim().length > 0) {
    const parsed = Number.parseInt(explicit, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return resolveResourceProfile().dbPoolMax;
}
