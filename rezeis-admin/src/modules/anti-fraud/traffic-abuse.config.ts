/**
 * Tunables for the per-user node-traffic-abuse detector.
 *
 * Powered by Remnawave 2.8's `bandwidth-stats/nodes/users` endpoint (per-user
 * traffic across nodes). The detector is **advisory** — it flags users whose
 * bandwidth is a clear outlier (heavy enough in absolute terms AND far above
 * the cohort), which on a VPN usually means torrenting / bulk transfer / a
 * shared account. Conservative defaults keep false positives low; all values
 * are env-overridable.
 */
export interface TrafficAbuseConfig {
  /** Master switch for the detector (also gated by the 2.8 capability). */
  readonly enabled: boolean;
  /** Absolute floor: ignore anyone below this many GB over the panel window. */
  readonly minGb: number;
  /** Flag when a user's traffic is at least this multiple of the cohort median. */
  readonly medianMultiplier: number;
  /** …or when a single user holds at least this share (%) of the top-users total. */
  readonly sharePercent: number;
  /** Max connected nodes aggregated per run (bounds the panel call). */
  readonly maxNodesPerRun: number;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

function parseNumber(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value ?? '');
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
}

export function resolveTrafficAbuseConfig(
  env: NodeJS.ProcessEnv = process.env,
): TrafficAbuseConfig {
  return {
    enabled: parseBoolean(env.ANTIFRAUD_NODE_TRAFFIC_USER_ENABLED, true),
    minGb: parseNumber(env.ANTIFRAUD_NODE_TRAFFIC_MIN_GB, 200, 1, 100_000),
    medianMultiplier: parseNumber(env.ANTIFRAUD_NODE_TRAFFIC_MEDIAN_MULTIPLIER, 4, 1.5, 100),
    sharePercent: parseNumber(env.ANTIFRAUD_NODE_TRAFFIC_SHARE_PERCENT, 35, 5, 100),
    maxNodesPerRun: parseNumber(env.ANTIFRAUD_NODE_TRAFFIC_MAX_NODES, 25, 1, 500),
  };
}
