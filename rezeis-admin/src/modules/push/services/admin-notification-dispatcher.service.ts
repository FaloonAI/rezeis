import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  EVENT_TYPES,
  SystemEventsService,
  type SystemEventPayload,
} from '../../../common/services/system-events.service';
import { RbacService } from '../../rbac/services/rbac.service';
import { WebPushService } from './web-push.service';

/** Notification category routed to admins via web-push. */
export type AdminNotificationCategory =
  | 'support'
  | 'payment'
  | 'fraud'
  | 'withdrawal'
  | 'system';

interface CategoryRoute {
  readonly category: AdminNotificationCategory;
  /** RBAC gating permission — an admin must hold it to receive the category. */
  readonly resource: string;
  readonly action: string;
  /** SPA deep-link the notification opens. */
  readonly url: string;
  /** Short title shown on the OS notification. */
  readonly title: string;
}

/**
 * Maps a `SystemEvents` event type to the admin notification category it
 * fans out as. Only mapped types produce an admin push; everything else is
 * ignored. Categories are gated by EXISTING RBAC permissions, so a role's
 * normal grants decide which categories it can receive (Phase 3 layers
 * per-admin preferences on top).
 */
const EVENT_ROUTES: Readonly<Record<string, CategoryRoute>> = {
  [EVENT_TYPES.SUPPORT_TICKET_CREATED]: {
    category: 'support',
    resource: 'support_tickets',
    action: 'view',
    url: '/support-tickets',
    title: 'Поддержка',
  },
  [EVENT_TYPES.SUPPORT_TICKET_USER_REPLY]: {
    category: 'support',
    resource: 'support_tickets',
    action: 'view',
    url: '/support-tickets',
    title: 'Поддержка',
  },
  [EVENT_TYPES.PAYMENT_FAILED]: {
    category: 'payment',
    resource: 'payments',
    action: 'view',
    url: '/payments',
    title: 'Платёж',
  },
  [EVENT_TYPES.FRAUD_SIGNAL_OPENED]: {
    category: 'fraud',
    resource: 'fraud_signals',
    action: 'view',
    url: '/fraud',
    title: 'Антифрод',
  },
  [EVENT_TYPES.PARTNER_WITHDRAWAL_REQUESTED]: {
    category: 'withdrawal',
    resource: 'withdrawals',
    action: 'view',
    url: '/partners#withdrawals',
    title: 'Запрос на вывод',
  },
};

/**
 * AdminNotificationDispatcher
 * ───────────────────────────
 * Subscribes once to `SystemEventsService` and fans mapped events out to
 * admins as browser/phone web-push, in addition to the existing
 * Telegram/webhook/realtime delivery. An admin receives a category only when
 * they are subscribed AND hold the category's gating RBAC permission
 * (Phase 3 adds per-admin preferences). Delivery is best-effort and never
 * blocks the originating action.
 */
@Injectable()
export class AdminNotificationDispatcher implements OnModuleInit {
  private readonly logger = new Logger(AdminNotificationDispatcher.name);

  public constructor(
    private readonly prismaService: PrismaService,
    private readonly webPushService: WebPushService,
    private readonly rbacService: RbacService,
    private readonly systemEvents: SystemEventsService,
  ) {}

  public onModuleInit(): void {
    this.systemEvents.registerHook((event) => {
      void this.handleEvent(event);
    });
  }

  private resolveRoute(event: SystemEventPayload): CategoryRoute | null {
    const mapped = EVENT_ROUTES[event.type];
    if (mapped) return mapped;
    // Any ERROR-severity SYSTEM event becomes a low-noise `system` alert.
    if (event.category === 'SYSTEM' && event.severity === 'ERROR') {
      return {
        category: 'system',
        resource: 'dashboard',
        action: 'view',
        url: '/',
        title: 'Система',
      };
    }
    return null;
  }

  private async handleEvent(event: SystemEventPayload): Promise<void> {
    const route = this.resolveRoute(event);
    if (route === null) return;

    try {
      // Admins that own at least one push subscription.
      const subscribers = await this.prismaService.adminWebPushSubscription.findMany({
        distinct: ['adminId'],
        select: { adminId: true },
      });
      if (subscribers.length === 0) return;

      const admins = await this.prismaService.adminUser.findMany({
        where: { id: { in: subscribers.map((s) => s.adminId) }, isActive: true },
        select: { id: true, role: true, rbacRoleId: true },
      });

      const body = event.message.slice(0, 160);
      await Promise.all(
        admins.map(async (admin) => {
          const permitted = await this.rbacService.hasPermission(
            admin,
            route.resource,
            route.action,
          );
          if (!permitted) return;
          await this.webPushService.sendToAdmin({
            adminId: admin.id,
            title: route.title,
            body,
            url: route.url,
          });
        }),
      );
    } catch (err) {
      // Best-effort: a dispatch failure must never affect the originating action.
      this.logger.warn(`Admin push dispatch failed for ${event.type}: ${(err as Error).message}`);
    }
  }
}
