import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { FraudSignalSeverity } from '@prisma/client';

import { SharingDetectors } from '../src/modules/anti-fraud/detectors/sharing-detectors';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { RemnawaveApiService } from '../src/modules/remnawave/services/remnawave-api.service';

const NOW = new Date('2026-06-18T12:00:00.000Z');

interface RemnaMock {
  hwidTopUsers?: Array<{ userUuid: string; username: string; telegramId: string | null; devicesCount: number; lastSeenAt: string | null }>;
  panelUsers?: Array<{ uuid: string; panelId: number | null; hwidDeviceLimit: number }>;
  nodes?: Array<{ uuid: string; name: string; countryCode: string | null; isConnected: boolean; isDisabled: boolean }>;
  usersIpsByNode?: Record<string, Array<{ userId: string; ips: Array<{ ip: string; lastSeen: string }> }>>;
}

function makeDetectors(
  remna: RemnaMock,
  subs: Array<{ remnawaveId: string; userId: string }> = [],
): SharingDetectors {
  const prismaMock = {
    subscription: {
      findMany: () => Promise.resolve(subs),
    },
  } as unknown as PrismaService;

  const remnaMock = {
    getHwidTopUsers: () => Promise.resolve(remna.hwidTopUsers ?? []),
    getAllPanelUsers: () => Promise.resolve(remna.panelUsers ?? []),
    getAllNodes: () => Promise.resolve(remna.nodes ?? []),
    fetchUsersIpsForNode: (nodeUuid: string) =>
      Promise.resolve(remna.usersIpsByNode?.[nodeUuid] ?? []),
  } as unknown as RemnawaveApiService;

  return new SharingDetectors(prismaMock, remnaMock);
}

describe('SharingDetectors — HWID overage', () => {
  it('flags a user whose device count exceeds the limit (MEDIUM) and resolves the rezeis user', async () => {
    const detectors = makeDetectors(
      {
        hwidTopUsers: [
          { userUuid: 'u1', username: 'alice', telegramId: null, devicesCount: 5, lastSeenAt: null },
        ],
        panelUsers: [{ uuid: 'u1', panelId: 1, hwidDeviceLimit: 3 }],
      },
      [{ remnawaveId: 'u1', userId: 'user-1' }],
    );
    const candidates = await detectors.detectHwidOverage(NOW);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].code, 'SUBSCRIPTION_SHARING_HWID');
    assert.equal(candidates[0].severity, FraudSignalSeverity.MEDIUM);
    assert.deepEqual(candidates[0].affectedUserIds, ['user-1']);
    assert.equal((candidates[0].metadata as { deviceCount: number }).deviceCount, 5);
  });

  it('escalates to HIGH when devices reach 2x the limit', async () => {
    const detectors = makeDetectors({
      hwidTopUsers: [
        { userUuid: 'u1', username: 'a', telegramId: null, devicesCount: 6, lastSeenAt: null },
      ],
      panelUsers: [{ uuid: 'u1', panelId: 1, hwidDeviceLimit: 3 }],
    });
    const candidates = await detectors.detectHwidOverage(NOW);
    assert.equal(candidates[0].severity, FraudSignalSeverity.HIGH);
  });

  it('does not flag at or below the limit (boundary)', async () => {
    const detectors = makeDetectors({
      hwidTopUsers: [
        { userUuid: 'u1', username: 'a', telegramId: null, devicesCount: 3, lastSeenAt: null },
      ],
      panelUsers: [{ uuid: 'u1', panelId: 1, hwidDeviceLimit: 3 }],
    });
    assert.deepEqual(await detectors.detectHwidOverage(NOW), []);
  });

  it('skips users with an unlimited (<=0) device limit', async () => {
    const detectors = makeDetectors({
      hwidTopUsers: [
        { userUuid: 'u1', username: 'a', telegramId: null, devicesCount: 99, lastSeenAt: null },
      ],
      panelUsers: [{ uuid: 'u1', panelId: 1, hwidDeviceLimit: 0 }],
    });
    assert.deepEqual(await detectors.detectHwidOverage(NOW), []);
  });
});

describe('SharingDetectors — concurrent IP (network-grouped)', () => {
  // The IP detector is OFF by default (HWID overage is the authoritative
  // signal). Enable it for this block and restore the env afterwards.
  let prevEnabled: string | undefined;
  beforeEach(() => {
    prevEnabled = process.env.ANTIFRAUD_SHARING_IP_ENABLED;
    process.env.ANTIFRAUD_SHARING_IP_ENABLED = 'true';
  });
  afterEach(() => {
    if (prevEnabled === undefined) delete process.env.ANTIFRAUD_SHARING_IP_ENABLED;
    else process.env.ANTIFRAUD_SHARING_IP_ENABLED = prevEnabled;
  });

  it('is disabled by default (no env) — returns nothing even with many IPs', async () => {
    delete process.env.ANTIFRAUD_SHARING_IP_ENABLED;
    const recent = NOW.toISOString();
    const detectors = makeDetectors({
      panelUsers: [{ uuid: 'u1', panelId: 10, hwidDeviceLimit: 1 }],
      nodes: [{ uuid: 'n1', name: 'N1', countryCode: 'DE', isConnected: true, isDisabled: false }],
      usersIpsByNode: {
        n1: [{ userId: '10', ips: [
          { ip: '1.1.1.1', lastSeen: recent },
          { ip: '2.2.2.2', lastSeen: recent },
          { ip: '3.3.3.3', lastSeen: recent },
        ] }],
      },
    });
    assert.deepEqual(await detectors.detectConcurrentIpSharing(NOW), []);
  });

  it('flags when distinct networks exceed the limit + margin (LOW severity)', async () => {
    const recent = NOW.toISOString();
    const detectors = makeDetectors(
      {
        panelUsers: [{ uuid: 'u1', panelId: 10, hwidDeviceLimit: 2 }],
        nodes: [{ uuid: 'n1', name: 'N1', countryCode: 'DE', isConnected: true, isDisabled: false }],
        usersIpsByNode: {
          n1: [
            {
              userId: '10',
              ips: [
                // 4 distinct /24 networks; limit 2 + margin 1 → tolerated 3 → flagged.
                { ip: '1.1.1.1', lastSeen: recent },
                { ip: '2.2.2.2', lastSeen: recent },
                { ip: '3.3.3.3', lastSeen: recent },
                { ip: '4.4.4.4', lastSeen: recent },
              ],
            },
          ],
        },
      },
      [{ remnawaveId: 'u1', userId: 'user-1' }],
    );
    const candidates = await detectors.detectConcurrentIpSharing(NOW);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].code, 'SUBSCRIPTION_SHARING_IP');
    assert.equal(candidates[0].severity, FraudSignalSeverity.LOW);
    assert.equal((candidates[0].metadata as { distinctNetworkCount: number }).distinctNetworkCount, 4);
    assert.equal((candidates[0].metadata as { distinctIpCount: number }).distinctIpCount, 4);
    assert.deepEqual(candidates[0].affectedUserIds, ['user-1']);
  });

  it('does NOT flag a single user roaming within one /24 (false-positive fix)', async () => {
    const recent = NOW.toISOString();
    const detectors = makeDetectors({
      panelUsers: [{ uuid: 'u1', panelId: 10, hwidDeviceLimit: 1 }],
      nodes: [{ uuid: 'n1', name: 'N1', countryCode: 'DE', isConnected: true, isDisabled: false }],
      usersIpsByNode: {
        n1: [
          {
            userId: '10',
            ips: [
              // 4 raw IPs but all in one carrier /24 → 1 network → not flagged.
              { ip: '100.64.10.1', lastSeen: recent },
              { ip: '100.64.10.55', lastSeen: recent },
              { ip: '100.64.10.120', lastSeen: recent },
              { ip: '100.64.10.200', lastSeen: recent },
            ],
          },
        ],
      },
    });
    assert.deepEqual(await detectors.detectConcurrentIpSharing(NOW), []);
  });

  it('does NOT flag at limit + margin (tolerance boundary: home Wi-Fi + mobile)', async () => {
    const recent = NOW.toISOString();
    const detectors = makeDetectors({
      panelUsers: [{ uuid: 'u1', panelId: 10, hwidDeviceLimit: 1 }],
      nodes: [{ uuid: 'n1', name: 'N1', countryCode: 'DE', isConnected: true, isDisabled: false }],
      usersIpsByNode: {
        n1: [
          {
            userId: '10',
            // 2 networks; limit 1 + margin 1 → tolerated 2 → 2 is NOT > 2.
            ips: [
              { ip: '85.10.20.5', lastSeen: recent },
              { ip: '100.64.10.1', lastSeen: recent },
            ],
          },
        ],
      },
    });
    assert.deepEqual(await detectors.detectConcurrentIpSharing(NOW), []);
  });

  it('ignores IPs outside the time window', async () => {
    const recent = NOW.toISOString();
    const old = new Date(NOW.getTime() - 60 * 60_000).toISOString(); // 60m ago, window 10m
    const detectors = makeDetectors({
      panelUsers: [{ uuid: 'u1', panelId: 10, hwidDeviceLimit: 1 }],
      nodes: [{ uuid: 'n1', name: 'N1', countryCode: 'DE', isConnected: true, isDisabled: false }],
      usersIpsByNode: {
        n1: [
          {
            userId: '10',
            ips: [
              { ip: '1.1.1.1', lastSeen: recent },
              { ip: '9.9.9.9', lastSeen: old }, // stale → excluded
            ],
          },
        ],
      },
    });
    // 1 in-window network <= tolerated 2 → no candidate
    assert.deepEqual(await detectors.detectConcurrentIpSharing(NOW), []);
  });

  it('returns nothing when there are no connected nodes', async () => {
    const detectors = makeDetectors({
      panelUsers: [{ uuid: 'u1', panelId: 10, hwidDeviceLimit: 1 }],
      nodes: [{ uuid: 'n1', name: 'N1', countryCode: 'DE', isConnected: false, isDisabled: false }],
    });
    assert.deepEqual(await detectors.detectConcurrentIpSharing(NOW), []);
  });
});
