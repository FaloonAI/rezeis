import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveTelegramDeliveryTarget } from '../src/common/services/telegram-delivery-target.util';

/**
 * System-events Telegram delivery fallback contract.
 *
 * When the operator HASN'T configured a separate group/topics, events must
 * still reach the dev via the same bot's DM (devChatId) — and ONLY the dev
 * (a bot DM is private). When nothing is configured, no Telegram delivery.
 */
const BASE = {
  enabled: false,
  chatId: null as string | null,
  devChatId: null as string | null,
  topicMap: {} as Record<string, number | null>,
  defaultTopicId: null as number | null,
  events: [] as readonly string[],
};

const EVENT = { type: 'payment.completed', category: 'PAYMENT' };

describe('resolveTelegramDeliveryTarget', () => {
  it('routes to the primary chat + per-category topic when configured', () => {
    const target = resolveTelegramDeliveryTarget(
      { ...BASE, enabled: true, chatId: '-100123', topicMap: { PAYMENT: 42 } },
      EVENT,
    );
    assert.deepEqual(target, { chatId: '-100123', topicId: 42, isDevFallback: false });
  });

  it('uses the default topic when no per-category override exists', () => {
    const target = resolveTelegramDeliveryTarget(
      { ...BASE, enabled: true, chatId: '-100123', defaultTopicId: 7 },
      EVENT,
    );
    assert.equal(target?.topicId, 7);
    assert.equal(target?.isDevFallback, false);
  });

  it('falls back to the dev DM (no topic) when no primary chat is configured', () => {
    const target = resolveTelegramDeliveryTarget(
      { ...BASE, enabled: false, chatId: null, devChatId: '555000' },
      EVENT,
    );
    assert.deepEqual(target, { chatId: '555000', topicId: null, isDevFallback: true });
  });

  it('falls back to the dev DM when enabled but chatId is missing', () => {
    const target = resolveTelegramDeliveryTarget(
      { ...BASE, enabled: true, chatId: null, devChatId: '555000', defaultTopicId: 9 },
      EVENT,
    );
    // Dev fallback ignores topic routing — it's a firehose DM.
    assert.deepEqual(target, { chatId: '555000', topicId: null, isDevFallback: true });
  });

  it('returns null when neither a primary chat nor a dev chat is set', () => {
    assert.equal(resolveTelegramDeliveryTarget(BASE, EVENT), null);
  });

  it('respects the event allow-list on the primary chat', () => {
    const cfg = { ...BASE, enabled: true, chatId: '-100123', events: ['user.created'] };
    assert.equal(resolveTelegramDeliveryTarget(cfg, EVENT), null);
    assert.ok(
      resolveTelegramDeliveryTarget(cfg, { type: 'user.created', category: 'USER' }) !== null,
    );
  });

  it('does NOT apply the event allow-list to the dev fallback (dev sees everything)', () => {
    const target = resolveTelegramDeliveryTarget(
      { ...BASE, enabled: false, chatId: null, devChatId: '555000', events: ['user.created'] },
      EVENT,
    );
    assert.equal(target?.chatId, '555000');
  });
});
