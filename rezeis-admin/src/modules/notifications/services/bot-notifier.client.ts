import { Injectable, Logger } from '@nestjs/common';

import { buildWebhookSignature } from '../../../common/http/webhook-signature.util';

/**
 * BotNotifierClient
 * ─────────────────
 * Delivers per-user Telegram messages and channel broadcasts to reiwa as
 * signed webhooks (snoups/Remnawave-style — NOT a direct bot push):
 *
 *   admin → POST <REIWA_URL>/api/v1/webhooks/rezeis
 *           body   { event: "reiwa.user.notify" | "reiwa.channel.broadcast",
 *                    metadata: { eventId, telegramId|chatId, text, ... } }
 *           header X-Rezeis-Signature: t=<sec>,v1=<hmac> (WEBHOOK_SECRET_HEADER)
 *
 * reiwa-api verifies the signature (`REZEIS_WEBHOOK_SECRET`) and relays the
 * message to the bot process over its private docker hop — the bot is never
 * exposed publicly and admin only knows reiwa's public domain.
 *
 * Fire-and-forget: callers never await delivery confirmation. Persistence of
 * the notification (cabinet feed) is the caller's responsibility and runs
 * independently — a delivery failure never blocks cabinet UX.
 *
 * Idempotency: each call carries an `eventId` (the `UserNotificationEvent.id`
 * CUID). The bot keeps an LRU of delivered ids and no-ops on replays.
 *
 * Enabled only when BOTH `REIWA_URL` and `WEBHOOK_SECRET_HEADER` are set.
 */
@Injectable()
export class BotNotifierClient {
  private readonly logger = new Logger(BotNotifierClient.name);
  private readonly endpoint: string | null;
  private readonly secret: string | null;

  /** Per-call HTTP timeout — push paths run inline with admin requests. */
  private static readonly TIMEOUT_MS = 4_000;

  public constructor() {
    const baseUrl = (process.env.REIWA_URL ?? '').trim().replace(/\/+$/, '');
    this.secret = (process.env.WEBHOOK_SECRET_HEADER ?? '').trim() || null;
    this.endpoint = baseUrl.length > 0 ? `${baseUrl}/api/v1/webhooks/rezeis` : null;
    if (this.endpoint === null || this.secret === null) {
      this.logger.warn(
        'BotNotifierClient disabled — set REIWA_URL and WEBHOOK_SECRET_HEADER to enable',
      );
    }
  }

  /**
   * Deliver a per-user message to Telegram. `eventId` MUST be stable across
   * retries; reuse the source `UserNotificationEvent.id` CUID for free dedup.
   */
  public async notifyUser(input: {
    readonly eventId: string;
    readonly telegramId: string;
    readonly text: string;
    readonly parseMode?: 'MarkdownV2' | 'HTML';
    readonly buttons?: ReadonlyArray<NotifyButton>;
  }): Promise<void> {
    await this.deliver('reiwa.user.notify', {
      eventId: input.eventId,
      telegramId: input.telegramId,
      text: input.text,
      parseMode: input.parseMode,
      buttons: input.buttons,
    });
  }

  /**
   * Deliver a message to a Telegram chat or forum topic (operator-managed
   * broadcast channels).
   */
  public async notifyBroadcast(input: {
    readonly eventId: string;
    readonly chatId: string;
    readonly topicThreadId?: number;
    readonly text: string;
    readonly parseMode?: 'MarkdownV2' | 'HTML';
    readonly buttons?: ReadonlyArray<NotifyButton>;
  }): Promise<void> {
    await this.deliver('reiwa.channel.broadcast', {
      eventId: input.eventId,
      chatId: input.chatId,
      topicThreadId: input.topicThreadId,
      text: input.text,
      parseMode: input.parseMode,
      buttons: input.buttons,
    });
  }

  private async deliver(event: string, metadata: Record<string, unknown>): Promise<void> {
    if (this.endpoint === null || this.secret === null) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BotNotifierClient.TIMEOUT_MS);
    try {
      const body = JSON.stringify({
        event,
        category: 'REIWA',
        severity: 'INFO',
        message: event,
        metadata,
        timestamp: new Date().toISOString(),
      });
      const { header } = buildWebhookSignature({ secret: this.secret, body });
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Rezeis-Event': event,
          'X-Rezeis-Signature': header,
        },
        body,
        signal: controller.signal,
      });
      if (!response.ok && response.status !== 204) {
        this.logger.warn(
          `Bot notify ${event} returned ${response.status} ${response.statusText}`,
        );
      }
    } catch (err: unknown) {
      this.logger.warn(
        `Bot notify ${event} threw: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

export interface NotifyButton {
  readonly text: string;
  readonly url?: string;
  readonly callbackData?: string;
}
