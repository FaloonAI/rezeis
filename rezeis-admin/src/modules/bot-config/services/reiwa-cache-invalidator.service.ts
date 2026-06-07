import { Injectable, Logger } from '@nestjs/common';

import { buildWebhookSignature } from '../../../common/http/webhook-signature.util';

/**
 * ReiwaCacheInvalidatorService
 * ────────────────────────────
 * Tells reiwa that the bot-config changed so the running reiwa-bot drops
 * its in-memory cache and re-pulls within ~50ms instead of waiting up to
 * 5 minutes for the periodic refresh.
 *
 * Delivery model (snoups/Remnawave-style webhook — NOT a direct bot push):
 *   admin → POST <REIWA_URL>/api/v1/webhooks/rezeis
 *           body   { event: "reiwa.bot.invalidate", metadata: { reason } }
 *           header X-Rezeis-Signature: t=<sec>,v1=<hmac>  (keyed by
 *                  WEBHOOK_SECRET_HEADER, same scheme as the webhook system)
 *
 * reiwa-api verifies the signature against `REZEIS_WEBHOOK_SECRET` and
 * relays the bust to the bot over its private docker hop. The bot is never
 * exposed publicly and admin only ever knows reiwa's public domain
 * (`REIWA_URL`).
 *
 * Enabled only when BOTH `REIWA_URL` and `WEBHOOK_SECRET_HEADER` are set.
 * All calls are best-effort and fire-and-forget: a save in admin must NEVER
 * fail because reiwa is down.
 */
@Injectable()
export class ReiwaCacheInvalidatorService {
  private readonly logger = new Logger(ReiwaCacheInvalidatorService.name);
  private readonly endpoint: string | null;
  private readonly secret: string | null;
  private readonly timeoutMs = 3_000;

  public constructor() {
    const baseUrl = (process.env.REIWA_URL ?? '').trim().replace(/\/+$/, '');
    this.secret = (process.env.WEBHOOK_SECRET_HEADER ?? '').trim() || null;
    this.endpoint = baseUrl.length > 0 ? `${baseUrl}/api/v1/webhooks/rezeis` : null;
    if (this.endpoint === null || this.secret === null) {
      this.logger.log(
        'Reiwa cache invalidation disabled (set REIWA_URL and WEBHOOK_SECRET_HEADER)',
      );
    }
  }

  /**
   * Notify reiwa that the cached bot-config is stale. Returns `true` when
   * the webhook was accepted (HTTP 2xx), `false` otherwise. Never throws.
   */
  public async invalidate(reason: string): Promise<boolean> {
    if (this.endpoint === null || this.secret === null) return false;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);
    try {
      const body = JSON.stringify({
        event: 'reiwa.bot.invalidate',
        category: 'REIWA',
        severity: 'INFO',
        message: 'reiwa.bot.invalidate',
        metadata: { reason },
        timestamp: new Date().toISOString(),
      });
      const { header } = buildWebhookSignature({ secret: this.secret, body });
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Rezeis-Event': 'reiwa.bot.invalidate',
          'X-Rezeis-Signature': header,
        },
        body,
        signal: controller.signal,
      });
      if (!response.ok && response.status !== 204) {
        this.logger.warn(
          `Cache invalidate non-2xx: ${response.status} ${response.statusText} (reason=${reason})`,
        );
        return false;
      }
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Cache invalidate request failed (reason=${reason}): ${message}`,
      );
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
