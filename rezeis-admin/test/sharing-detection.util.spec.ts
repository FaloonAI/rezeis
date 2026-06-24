import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  countDistinctNetworks,
  expandIpv6,
  ipNetworkKey,
  ipv4NetworkKey,
  ipv6NetworkKey,
  isNetworkSharingOffender,
} from '../src/modules/anti-fraud/sharing-detection.util';

const GROUP = { grouping: true, v4Prefix: 24, v6Prefix: 48 };

describe('ipv4NetworkKey', () => {
  it('masks to /24 by default', () => {
    assert.equal(ipv4NetworkKey('192.168.1.42', 24), '192.168.1.0/24');
    assert.equal(ipv4NetworkKey('192.168.1.200', 24), '192.168.1.0/24');
  });

  it('supports other prefix lengths', () => {
    assert.equal(ipv4NetworkKey('10.20.30.40', 16), '10.20.0.0/16');
    assert.equal(ipv4NetworkKey('10.20.30.40', 8), '10.0.0.0/8');
    assert.equal(ipv4NetworkKey('10.20.30.40', 32), '10.20.30.40/32');
  });

  it('returns the raw string for malformed IPv4', () => {
    assert.equal(ipv4NetworkKey('not-an-ip', 24), 'not-an-ip');
    assert.equal(ipv4NetworkKey('1.2.3.999', 24), '1.2.3.999');
  });
});

describe('expandIpv6 / ipv6NetworkKey', () => {
  it('expands :: shorthand', () => {
    assert.deepEqual(expandIpv6('2001:db8::1'), ['2001', 'db8', '0', '0', '0', '0', '0', '1']);
    assert.deepEqual(expandIpv6('::1'), ['0', '0', '0', '0', '0', '0', '0', '1']);
  });

  it('groups two privacy addresses in the same /48 site into one network', () => {
    // IPv6 privacy extensions rotate the host portion — same site, same /48.
    const a = ipv6NetworkKey('2001:db8:abcd:1::dead:beef', 48);
    const b = ipv6NetworkKey('2001:db8:abcd:9::1234:5678', 48);
    assert.equal(a, b);
  });

  it('returns raw for unparseable IPv6', () => {
    assert.equal(ipv6NetworkKey('xyz', 48), 'xyz');
  });
});

describe('ipNetworkKey dispatch', () => {
  it('routes v4 and v6 correctly', () => {
    assert.equal(ipNetworkKey('1.2.3.4', 24, 48), '1.2.3.0/24');
    assert.equal(ipNetworkKey('2001:db8:abcd:1::1', 24, 48), '2001:db8:abcd::/48');
  });
});

describe('countDistinctNetworks', () => {
  it('collapses a single mobile carrier hopping CGNAT IPs in one /24 to one network', () => {
    const ips = ['100.64.10.1', '100.64.10.55', '100.64.10.200'];
    assert.equal(countDistinctNetworks(ips, GROUP), 1);
  });

  it('counts home Wi-Fi + mobile as two networks (legitimate dual-network)', () => {
    const ips = ['85.10.20.5', '100.64.10.1'];
    assert.equal(countDistinctNetworks(ips, GROUP), 2);
  });

  it('falls back to raw distinct-IP count when grouping is off', () => {
    const ips = ['100.64.10.1', '100.64.10.55', '100.64.10.200'];
    assert.equal(countDistinctNetworks(ips, { ...GROUP, grouping: false }), 3);
  });

  it('ignores empty / non-string entries', () => {
    assert.equal(countDistinctNetworks(['1.2.3.4', ''], GROUP), 1);
  });
});

describe('isNetworkSharingOffender', () => {
  it('does not flag a single user with limit+margin networks (no false positive)', () => {
    // limit 1, margin 1 → tolerate up to 2 networks (home Wi-Fi + mobile).
    assert.equal(isNetworkSharingOffender(2, 1, 1), false);
  });

  it('flags genuine sharing above the tolerated limit', () => {
    assert.equal(isNetworkSharingOffender(3, 1, 1), true);
  });

  it('never flags when the device limit is unknown (<= 0)', () => {
    assert.equal(isNetworkSharingOffender(10, 0, 1), false);
  });

  it('treats a negative margin as zero', () => {
    assert.equal(isNetworkSharingOffender(2, 1, -5), true);
  });
});
