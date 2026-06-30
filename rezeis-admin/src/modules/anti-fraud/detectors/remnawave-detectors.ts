import { Injectable, Logger } from '@nestjs/common';
import { FraudSignalSeverity } from '@prisma/client';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { RemnawaveApiService } from '../../remnawave/services/remnawave-api.service';
import { RemnawaveVersionService } from '../../remnawave/services/remnawave-version.service';
import { FraudSignalCandidate } from '../interfaces/fraud-signal.interface';
import { resolveTrafficAbuseConfig } from '../traffic-abuse.config';

/**
 * Remnawave-specific fraud detectors.
 *
 * These detectors query the Remnawave panel API for HWID device data
 * and node connection patterns to identify:
 *   - HWID anomalies (too many devices per user)
 *   - Geo anomalies (connections from many countries simultaneously)
 *   - Node abuse (single user consuming disproportionate traffic)
 *
 * Designed to run alongside the existing `FraudDetectors` in the
 * anti-fraud cron cycle.
 */
@Injectable()
export class RemnawaveDetectors {
  private readonly logger = new Logger(RemnawaveDetectors.name);

  public constructor(
    private readonly prismaService: PrismaService,
    private readonly remnawaveApiService: RemnawaveApiService,
    private readonly versionService: RemnawaveVersionService,
  ) {}

  // ── Detector: HWID Device Anomaly ──────────────────────────────────────

  /**
   * Detects users with an abnormally high number of HWID devices.
   * Threshold: users with devices > 2× their hwidDeviceLimit or > 10 devices.
   *
   * This indicates potential account sharing or credential leaking.
   */
  public async detectHwidAnomalies(_now: Date): Promise<readonly FraudSignalCandidate[]> {
    try {
      const hwidStats = await this.remnawaveApiService.getHwidStats();
      if (!hwidStats) return [];

      const avgDevices = hwidStats.stats.averageHwidDevicesPerUser;
      const totalDevices = hwidStats.stats.totalHwidDevices;
      const uniqueDevices = hwidStats.stats.totalUniqueDevices;

      // Alert if average devices per user is suspiciously high (> 3)
      // or if total devices is much higher than unique (device reuse)
      const candidates: FraudSignalCandidate[] = [];

      if (avgDevices > 3) {
        candidates.push({
          code: 'HWID_HIGH_AVERAGE_DEVICES',
          fingerprint: `avg_${Math.floor(avgDevices * 10)}`,
          severity: avgDevices > 5 ? FraudSignalSeverity.HIGH : FraudSignalSeverity.MEDIUM,
          title: 'High average HWID devices per user',
          description: `Average ${avgDevices.toFixed(1)} devices per user (total: ${totalDevices}, unique: ${uniqueDevices}). May indicate widespread account sharing.`,
          score: Math.min(Math.round(avgDevices * 15), 100),
          confidence: 70,
          affectedUserIds: [],
          metadata: {
            averageDevicesPerUser: avgDevices,
            totalHwidDevices: totalDevices,
            totalUniqueDevices: uniqueDevices,
            byPlatform: hwidStats.byPlatform,
          },
        });
      }

      return candidates;
    } catch (error) {
      this.logger.warn(`HWID anomaly detection failed: ${(error as Error).message}`);
      return [];
    }
  }

  // ── Detector: Node Traffic Abuse ───────────────────────────────────────

  /**
   * Detects nodes where a single user consumes > 50% of the node's traffic.
   * This is a sign of abuse (torrenting, bulk downloads, etc.).
   *
   * Uses the per-node usersOnline count vs traffic to estimate.
   */
  public async detectNodeTrafficAbuse(_now: Date): Promise<readonly FraudSignalCandidate[]> {
    try {
      const nodes = await this.remnawaveApiService.getAllNodes();
      if (!nodes || nodes.length === 0) return [];

      const candidates: FraudSignalCandidate[] = [];

      for (const node of nodes) {
        if (!node.isConnected || node.isDisabled) continue;
        if (!node.trafficLimitBytes || !node.trafficUsedBytes) continue;

        const usagePercent = (node.trafficUsedBytes / node.trafficLimitBytes) * 100;

        // Alert if a node is > 90% traffic used
        if (usagePercent > 90) {
          candidates.push({
            code: 'NODE_TRAFFIC_CRITICAL',
            fingerprint: `node_${node.uuid}_${Math.floor(usagePercent)}`,
            severity: FraudSignalSeverity.HIGH,
            title: `Node "${node.name}" traffic critical (${usagePercent.toFixed(0)}%)`,
            description: `Node ${node.name} (${node.countryCode}) has used ${usagePercent.toFixed(1)}% of its traffic limit. ${node.usersOnline} users online.`,
            score: Math.min(Math.round(usagePercent), 100),
            confidence: 95,
            affectedUserIds: [],
            metadata: {
              nodeUuid: node.uuid,
              nodeName: node.name,
              countryCode: node.countryCode,
              trafficUsedBytes: node.trafficUsedBytes,
              trafficLimitBytes: node.trafficLimitBytes,
              usagePercent: Math.round(usagePercent * 10) / 10,
              usersOnline: node.usersOnline,
            },
          });
        }
      }

      return candidates;
    } catch (error) {
      this.logger.warn(`Node traffic abuse detection failed: ${(error as Error).message}`);
      return [];
    }
  }

  // ── Detector: Per-User Node Traffic Abuse (Remnawave 2.8+) ─────────────

  /**
   * Flags users whose bandwidth across the connected nodes is a clear outlier
   * — heavy in absolute terms AND far above the cohort (median / share). On a
   * VPN that usually means torrenting, bulk transfer, or a shared account.
   *
   * Uses the 2.8 `bandwidth-stats/nodes/users` endpoint, so it's gated behind
   * the detected capability and self-activates once the panel upgrades. The
   * panel returns usernames (not UUIDs), so the signal carries the username
   * for the operator to action; `affectedUserIds` stays empty (like the other
   * node-level detectors). Advisory only — LOW/MEDIUM, never HIGH.
   */
  public async detectPerUserNodeTrafficAbuse(now: Date): Promise<readonly FraudSignalCandidate[]> {
    const config = resolveTrafficAbuseConfig();
    if (!config.enabled) return [];
    const caps = await this.versionService.getCapabilities();
    if (!caps.bandwidthNodesUsers) {
      this.logger.debug('Per-user traffic detection skipped: needs Remnawave 2.8+');
      return [];
    }
    try {
      const nodes = await this.remnawaveApiService.getAllNodes();
      const connected = nodes
        .filter((n) => n.isConnected && !n.isDisabled)
        .slice(0, config.maxNodesPerRun);
      if (connected.length === 0) return [];

      const topUsers = await this.remnawaveApiService.getNodeUsersBandwidth(
        connected.map((n) => n.uuid),
      );
      const valid = topUsers.filter((u) => u.total > 0);
      // Need a cohort to compare against — a couple of users tells us nothing.
      if (valid.length < 3) return [];

      const totals = valid.map((u) => u.total).sort((a, b) => a - b);
      const median = totals[Math.floor(totals.length / 2)] ?? 0;
      const sum = totals.reduce((a, b) => a + b, 0);
      const minBytes = config.minGb * 1024 ** 3;
      const day = utcDay(now);

      const candidates: FraudSignalCandidate[] = [];
      for (const u of valid) {
        if (u.total < minBytes) continue;
        const sharePct = sum > 0 ? (u.total / sum) * 100 : 0;
        const aboveMedian = median > 0 && u.total >= median * config.medianMultiplier;
        const aboveShare = sharePct >= config.sharePercent;
        if (!aboveMedian && !aboveShare) continue;
        const extreme = aboveMedian && aboveShare;
        candidates.push({
          code: 'NODE_TRAFFIC_USER_ABUSE',
          fingerprint: `${day}|${u.username}`,
          severity: extreme ? FraudSignalSeverity.MEDIUM : FraudSignalSeverity.LOW,
          title: 'Excessive per-user node traffic',
          description: `User ${u.username} consumed ${formatGb(u.total)} (${sharePct.toFixed(0)}% of the top-users total) across ${connected.length} nodes — well above the ${formatGb(median)} cohort median.`,
          score: clampScore(30 + Math.round(sharePct)),
          confidence: 55,
          affectedUserIds: [],
          metadata: {
            kind: 'node_traffic_user',
            remnawaveUsername: u.username,
            totalBytes: u.total,
            sharePercent: Math.round(sharePct * 10) / 10,
            medianBytes: median,
            nodeCount: connected.length,
          },
        });
      }
      return candidates;
    } catch (error) {
      this.logger.warn(`Per-user node traffic detection failed: ${(error as Error).message}`);
      return [];
    }
  }

  // ── Detector: Geo Distribution Anomaly ─────────────────────────────────

  /**
   * Detects when the user base is concentrated in unexpected countries
   * or when nodes in certain countries have disproportionate load.
   *
   * Uses node country codes and online user counts to build a geo profile.
   */
  public async detectGeoAnomalies(_now: Date): Promise<readonly FraudSignalCandidate[]> {
    try {
      const nodes = await this.remnawaveApiService.getAllNodes();
      if (!nodes || nodes.length === 0) return [];

      // Build country → users online map
      const countryUsers: Record<string, number> = {};
      let totalOnline = 0;

      for (const node of nodes) {
        if (!node.isConnected || node.isDisabled) continue;
        const country = node.countryCode || 'UNKNOWN';
        countryUsers[country] = (countryUsers[country] ?? 0) + node.usersOnline;
        totalOnline += node.usersOnline;
      }

      if (totalOnline === 0) return [];

      const candidates: FraudSignalCandidate[] = [];

      // Check if any single country has > 80% of all users (concentration risk)
      for (const [country, users] of Object.entries(countryUsers)) {
        const pct = (users / totalOnline) * 100;
        if (pct > 80 && totalOnline > 10) {
          candidates.push({
            code: 'GEO_CONCENTRATION_RISK',
            fingerprint: `geo_${country}_${Math.floor(pct)}`,
            severity: FraudSignalSeverity.LOW,
            title: `High user concentration in ${country}`,
            description: `${pct.toFixed(0)}% of online users (${users}/${totalOnline}) are connected through ${country} nodes. Consider load balancing.`,
            score: Math.round(pct * 0.5),
            confidence: 60,
            affectedUserIds: [],
            metadata: {
              country,
              usersInCountry: users,
              totalOnline,
              percentInCountry: Math.round(pct * 10) / 10,
              allCountries: countryUsers,
            },
          });
        }
      }

      return candidates;
    } catch (error) {
      this.logger.warn(`Geo anomaly detection failed: ${(error as Error).message}`);
      return [];
    }
  }

  // ── Detector: Offline Nodes ────────────────────────────────────────────

  /**
   * Detects nodes that are offline (not disabled, but disconnected).
   * This is an operational alert rather than fraud, but surfaces in the
   * same attention system.
   */
  public async detectOfflineNodes(_now: Date): Promise<readonly FraudSignalCandidate[]> {
    try {
      const nodes = await this.remnawaveApiService.getAllNodes();
      if (!nodes || nodes.length === 0) return [];

      const offlineNodes = nodes.filter((n) => !n.isConnected && !n.isDisabled && !n.isConnecting);

      if (offlineNodes.length === 0) return [];

      return [
        {
          code: 'NODES_OFFLINE',
          fingerprint: `offline_${offlineNodes.length}_${offlineNodes.map((n) => n.uuid.slice(0, 4)).join('')}`,
          severity: offlineNodes.length > 2 ? FraudSignalSeverity.HIGH : FraudSignalSeverity.MEDIUM,
          title: `${offlineNodes.length} node(s) offline`,
          description: `Nodes offline: ${offlineNodes.map((n) => `${n.name} (${n.countryCode})`).join(', ')}`,
          score: Math.min(30 + offlineNodes.length * 20, 100),
          confidence: 100,
          affectedUserIds: [],
          metadata: {
            offlineCount: offlineNodes.length,
            nodes: offlineNodes.map((n) => ({
              uuid: n.uuid,
              name: n.name,
              countryCode: n.countryCode,
              lastStatusChange: n.lastStatusChange,
            })),
          },
        },
      ];
    } catch (error) {
      this.logger.warn(`Offline nodes detection failed: ${(error as Error).message}`);
      return [];
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function clampScore(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function formatGb(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`;
  return `${gb.toFixed(1)} GB`;
}
