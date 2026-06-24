/**
 * Pure helpers for the subscription-sharing IP detector.
 *
 * WHY THIS EXISTS — research-backed false-positive reduction.
 * Counting *distinct source IPs* and flagging when the count exceeds the
 * device limit is a known-bad signal: a single legitimate user routinely
 * presents many IPs in a short window —
 *   • mobile carriers rotate CGNAT egress IPs per request,
 *   • a phone hops between Wi-Fi, LTE and different access points,
 *   • IPv6 privacy extensions rotate the host portion of the address
 *     constantly (a new /128 every few minutes for ONE device),
 *   • a load balancer (e.g. Remnawave node auto-selection) reconnects the
 *     same client across nodes.
 * Industry anti-fraud (device fingerprinting / household models) treats IP
 * as a weak contextual signal, never a standalone identity. So instead of
 * raw IPs we count distinct *networks* (prefix-grouped) and only flag when
 * that exceeds the device limit by a tolerance margin.
 *
 * These functions are intentionally pure + total (no throw) so they can be
 * unit-tested without the Remnawave panel or Prisma.
 */

/** Mask an IPv4 address to its network prefix, e.g. `1.2.3.4` /24 → `1.2.3.0/24`. */
export function ipv4NetworkKey(ip: string, prefix: number): string {
  const octets = ip.trim().split('.');
  if (octets.length !== 4) return ip;
  const nums = octets.map((o) => Number.parseInt(o, 10));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return ip;
  const p = clampPrefix(prefix, 32);
  const bits = (((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0) >>> 0;
  const mask = p === 0 ? 0 : p >= 32 ? 0xffffffff : (0xffffffff << (32 - p)) >>> 0;
  const net = (bits & mask) >>> 0;
  return `${(net >>> 24) & 0xff}.${(net >>> 16) & 0xff}.${(net >>> 8) & 0xff}.${net & 0xff}/${p}`;
}

/** Expand an IPv6 address to its 8 normalised hextets, or `null` if unparseable. */
export function expandIpv6(ip: string): string[] | null {
  // Strip brackets, zone id (`%eth0`) and any embedded port-less form.
  const clean = ip.trim().replace(/^\[/, '').replace(/\]$/, '').split('%')[0];
  if (clean.length === 0 || clean.indexOf(':') === -1) return null;
  const parts = clean.split('::');
  if (parts.length > 2) return null;
  const head = parts[0].length > 0 ? parts[0].split(':') : [];
  const tail = parts.length === 2 && parts[1].length > 0 ? parts[1].split(':') : [];
  let groups: string[];
  if (parts.length === 1) {
    if (head.length !== 8) return null;
    groups = head;
  } else {
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    groups = [...head, ...Array.from({ length: missing }, () => '0'), ...tail];
  }
  const out: string[] = [];
  for (const g of groups) {
    const n = Number.parseInt(g.length > 0 ? g : '0', 16);
    if (!Number.isFinite(n) || n < 0 || n > 0xffff) return null;
    out.push(n.toString(16));
  }
  return out;
}

/** Group an IPv6 address by its prefix (number of leading hextets). */
export function ipv6NetworkKey(ip: string, prefix: number): string {
  const expanded = expandIpv6(ip);
  if (expanded === null) return ip;
  const p = clampPrefix(prefix, 128);
  const groups = Math.min(8, Math.max(1, Math.ceil(p / 16)));
  return `${expanded.slice(0, groups).join(':')}::/${p}`;
}

/** Resolve the network key for an IP (v4 or v6) at the configured prefixes. */
export function ipNetworkKey(ip: string, v4Prefix: number, v6Prefix: number): string {
  if (ip.indexOf(':') !== -1) return ipv6NetworkKey(ip, v6Prefix);
  return ipv4NetworkKey(ip, v4Prefix);
}

/**
 * Count distinct *networks* among a set of source IPs. When `grouping` is off
 * this collapses to the raw distinct-IP count (legacy behaviour).
 */
export function countDistinctNetworks(
  ips: readonly string[],
  opts: { grouping: boolean; v4Prefix: number; v6Prefix: number },
): number {
  if (!opts.grouping) return new Set(ips).size;
  const networks = new Set<string>();
  for (const ip of ips) {
    if (typeof ip !== 'string' || ip.length === 0) continue;
    networks.add(ipNetworkKey(ip, opts.v4Prefix, opts.v6Prefix));
  }
  return networks.size;
}

/**
 * A subscription is a sharing offender only when its distinct-network count
 * exceeds the device limit *plus a tolerance margin*. The margin absorbs the
 * natural "one extra network" a single user produces (home Wi-Fi + mobile)
 * without tripping the detector.
 */
export function isNetworkSharingOffender(
  distinctNetworks: number,
  deviceLimit: number,
  margin: number,
): boolean {
  if (deviceLimit <= 0) return false;
  return distinctNetworks > deviceLimit + Math.max(0, margin);
}

function clampPrefix(prefix: number, max: number): number {
  if (!Number.isFinite(prefix)) return max;
  if (prefix < 0) return 0;
  if (prefix > max) return max;
  return Math.floor(prefix);
}
