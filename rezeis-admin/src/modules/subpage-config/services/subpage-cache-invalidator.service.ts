import { Injectable, Logger } from '@nestjs/common';

/**
 * SubpageCacheInvalidatorService
 * ──────────────────────────────
 * Tells rezeis-subpage that the config changed so it drops its in-memory
 * cache and re-fetches immediately, instead of waiting for its TTL refresh.
 *
 * Delivery: admin → POST <REZEIS_SUBPAGE_URL>/internal/subpage-config/invalidate
 *           header Authorization: Bearer <REZEIS_SUBPAGE_WEBHOOK_SECRET>
 *
 * The subpage authenticates the call with a timing-safe bearer comparison
 * against the same secret. Enabled only when BOTH env vars are set. All calls
 * are best-effort and fire-and-forget — a save in admin must NEVER fail because
 * the subpage is down. Mirrors ReiwaCacheInvalidatorService.
 */
@Injectable()
export class SubpageCacheInvalidatorService {
  private readonly logger = new Logger(SubpageCacheInvalidatorService.name);
  private readonly endpoint: string | null;
  private readonly secret: string | null;
  private readonly timeoutMs = 3_000;

  public constructor() {
    const baseUrl = (process.env.REZEIS_SUBPAGE_URL ?? '').trim().replace(/\/+$/, '');
    this.secret = (process.env.REZEIS_SUBPAGE_WEBHOOK_SECRET ?? '').trim() || null;
    this.endpoint = baseUrl.length > 0 ? `${baseUrl}/internal/subpage-config/invalidate` : null;

    if (this.endpoint === null || this.secret === null) {
      this.logger.log(
        'Subpage cache invalidation disabled (set REZEIS_SUBPAGE_URL and ' +
          'REZEIS_SUBPAGE_WEBHOOK_SECRET).',
      );
    }
  }

  /**
   * Notify the subpage that its cached config is stale. Returns `true` when
   * the webhook was accepted (HTTP 2xx), `false` otherwise. Never throws.
   */
  public async invalidate(reason: string): Promise<boolean> {
    if (this.endpoint === null || this.secret === null) {
      return false;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.secret}`,
          // The subpage enforces a reverse-proxy + HTTPS check on every request
          // (proxyCheckMiddleware). Same-VPS we call it directly over the docker
          // network (no proxy), so set these so the internal call passes; a real
          // proxy on split-VPS overrides them.
          'X-Forwarded-For': '127.0.0.1',
          'X-Forwarded-Proto': 'https',
        },
        body: JSON.stringify({ reason, timestamp: new Date().toISOString() }),
        signal: controller.signal,
      });

      if (!response.ok && response.status !== 204) {
        this.logger.warn(`Subpage invalidate non-2xx: ${response.status} ${response.statusText}`);
        return false;
      }

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Subpage invalidate request failed: ${message}`);
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
