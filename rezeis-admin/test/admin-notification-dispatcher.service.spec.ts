import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EVENT_TYPES, type SystemEventPayload } from '../src/common/services/system-events.service';
import { AdminNotificationDispatcher } from '../src/modules/push/services/admin-notification-dispatcher.service';

interface SentPush {
  adminId: string;
  title: string;
  url: string;
}

function buildDispatcher(options: {
  admins: Array<{ id: string; role: string; rbacRoleId: string | null; isActive?: boolean }>;
  permitted: Set<string>; // `${adminId}:${resource}:${action}`
}) {
  const sent: SentPush[] = [];
  let rbacThrows = false;

  const prisma = {
    adminWebPushSubscription: {
      findMany: async () => options.admins.map((a) => ({ adminId: a.id })),
    },
    adminUser: {
      findMany: async () =>
        options.admins
          .filter((a) => a.isActive !== false)
          .map((a) => ({ id: a.id, role: a.role, rbacRoleId: a.rbacRoleId })),
    },
  };
  const webPush = {
    sendToAdmin: async (input: { adminId: string; title: string; body: string; url: string }) => {
      sent.push({ adminId: input.adminId, title: input.title, url: input.url });
    },
  };
  const rbac = {
    hasPermission: async (
      admin: { id: string },
      resource: string,
      action: string,
    ): Promise<boolean> => {
      if (rbacThrows) throw new Error('rbac boom');
      return options.permitted.has(`${admin.id}:${resource}:${action}`);
    },
  };
  let hook: ((e: SystemEventPayload) => void) | null = null;
  const systemEvents = {
    registerHook: (h: (e: SystemEventPayload) => void) => {
      hook = h;
      return () => {};
    },
  };

  const dispatcher = new AdminNotificationDispatcher(
    prisma as never,
    webPush as never,
    rbac as never,
    systemEvents as never,
  );
  dispatcher.onModuleInit();

  // Access the private async handler deterministically for assertions.
  const handle = (event: SystemEventPayload): Promise<void> =>
    (dispatcher as unknown as { handleEvent: (e: SystemEventPayload) => Promise<void> }).handleEvent(
      event,
    );

  return {
    sent,
    handle,
    hookRegistered: () => hook !== null,
    setRbacThrows: (v: boolean) => {
      rbacThrows = v;
    },
  };
}

function event(type: string, category: string, severity: 'INFO' | 'WARNING' | 'ERROR' = 'INFO'): SystemEventPayload {
  return { type, category: category as SystemEventPayload['category'], severity, message: 'test message' };
}

describe('AdminNotificationDispatcher', () => {
  it('registers a SystemEvents hook on init', () => {
    const d = buildDispatcher({ admins: [], permitted: new Set() });
    assert.equal(d.hookRegistered(), true);
  });

  it('delivers a support push only to admins holding support_tickets:view (eligibility + isolation)', async () => {
    const d = buildDispatcher({
      admins: [
        { id: 'a1', role: 'ADMIN', rbacRoleId: 'support' },
        { id: 'a2', role: 'ADMIN', rbacRoleId: 'finance' },
      ],
      permitted: new Set(['a1:support_tickets:view']),
    });

    await d.handle(event(EVENT_TYPES.SUPPORT_TICKET_CREATED, 'SUPPORT'));

    assert.equal(d.sent.length, 1);
    assert.equal(d.sent[0]?.adminId, 'a1');
    assert.equal(d.sent[0]?.url, '/support-tickets');
  });

  it('maps withdrawal events to withdrawals:view gating', async () => {
    const d = buildDispatcher({
      admins: [{ id: 'a1', role: 'ADMIN', rbacRoleId: 'finance' }],
      permitted: new Set(['a1:withdrawals:view']),
    });

    await d.handle(event(EVENT_TYPES.PARTNER_WITHDRAWAL_REQUESTED, 'PARTNER'));

    assert.equal(d.sent.length, 1);
    assert.equal(d.sent[0]?.url, '/partners#withdrawals');
  });

  it('ignores unmapped event types', async () => {
    const d = buildDispatcher({
      admins: [{ id: 'a1', role: 'ADMIN', rbacRoleId: 'r' }],
      permitted: new Set(['a1:support_tickets:view']),
    });

    await d.handle(event('user.registered', 'USER'));

    assert.equal(d.sent.length, 0);
  });

  it('maps ERROR-severity SYSTEM events to the system category (dashboard:view)', async () => {
    const d = buildDispatcher({
      admins: [{ id: 'a1', role: 'ADMIN', rbacRoleId: 'r' }],
      permitted: new Set(['a1:dashboard:view']),
    });

    await d.handle(event('system.error', 'SYSTEM', 'ERROR'));

    assert.equal(d.sent.length, 1);
    assert.equal(d.sent[0]?.url, '/');
  });

  it('is non-blocking: a permission-check failure never throws out of the handler', async () => {
    const d = buildDispatcher({
      admins: [{ id: 'a1', role: 'ADMIN', rbacRoleId: 'r' }],
      permitted: new Set(['a1:support_tickets:view']),
    });
    d.setRbacThrows(true);

    await assert.doesNotReject(() => d.handle(event(EVENT_TYPES.SUPPORT_TICKET_CREATED, 'SUPPORT')));
    assert.equal(d.sent.length, 0);
  });

  it('does not deliver to inactive admins', async () => {
    const d = buildDispatcher({
      admins: [{ id: 'a1', role: 'ADMIN', rbacRoleId: 'r', isActive: false }],
      permitted: new Set(['a1:support_tickets:view']),
    });

    await d.handle(event(EVENT_TYPES.SUPPORT_TICKET_CREATED, 'SUPPORT'));

    assert.equal(d.sent.length, 0);
  });
});
