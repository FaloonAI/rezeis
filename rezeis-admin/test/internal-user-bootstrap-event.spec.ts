import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { InternalUserEdgeService } from '../src/modules/internal-user/services/internal-user-edge.service';

/**
 * Regression: `USER_REGISTERED` was defined but never emitted, so a user
 * starting the bot (Telegram-first bootstrap) created a row silently — devs
 * got no "new user registered" notification. `bootstrapByTelegram` must emit
 * exactly once for a brand-new user and stay quiet for a returning one.
 */

const STUB_SETTINGS = {
  getInternalPlatformPolicy: async () => ({ accessMode: 'PUBLIC' as const }),
};
const STUB_GUARD = { evaluate: () => null };

function fakeUser(): unknown {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'user-cuid-1',
    telegramId: BigInt(1036459677),
    username: 'Frodmaker',
    name: 'Maylo',
    email: null,
    role: 'USER',
    language: 'RU',
    personalDiscount: 0,
    purchaseDiscount: 0,
    points: 0,
    maxSubscriptions: 1,
    isBlocked: false,
    isBotBlocked: false,
    isRulesAccepted: false,
    onboardingCompletedAt: null,
    createdAt: now,
    updatedAt: now,
    webAccount: null,
  };
}

interface EmittedEvent {
  readonly type: string;
  readonly category: string;
  readonly metadata?: Record<string, unknown>;
}

function buildService(existing: { id: string } | null) {
  const events: EmittedEvent[] = [];
  const prisma = {
    user: {
      findUnique: async () => existing,
      upsert: async () => fakeUser(),
    },
  };
  const systemEvents = {
    info: (type: string, category: string, _message: string, metadata?: Record<string, unknown>) => {
      events.push({ type, category, metadata });
    },
  };
  const service = new InternalUserEdgeService(
    prisma as never,
    STUB_SETTINGS as never,
    STUB_GUARD as never,
    systemEvents as never,
  );
  return { service, events };
}

describe('InternalUserEdgeService.bootstrapByTelegram registration event', () => {
  it('emits USER_REGISTERED once for a brand-new Telegram user', async () => {
    const { service, events } = buildService(null);
    await service.bootstrapByTelegram({
      telegramId: '1036459677',
      username: 'Frodmaker',
      name: 'Maylo',
      language: 'RU',
    });
    const reg = events.filter((e) => e.type === 'user.registered');
    assert.equal(reg.length, 1);
    assert.equal(reg[0].category, 'USER');
    assert.equal(reg[0].metadata?.source, 'telegram_bot');
    assert.equal(reg[0].metadata?.telegramId, '1036459677');
    assert.equal(reg[0].metadata?.reiwaId, 'user-cuid-1');
  });

  it('does not emit when the user already exists (returning user)', async () => {
    const { service, events } = buildService({ id: 'user-cuid-1' });
    await service.bootstrapByTelegram({
      telegramId: '1036459677',
      username: 'Frodmaker',
      name: 'Maylo',
      language: 'RU',
    });
    assert.equal(events.filter((e) => e.type === 'user.registered').length, 0);
  });
});
