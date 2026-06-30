import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildAdDeepLinks,
  buildAdPayload,
  generateTrackingCode,
  isValidTrackingCode,
  parseAdPayload,
  TELEGRAM_START_PAYLOAD_MAX,
} from '../src/modules/advertising/utils/tracking-code.util';
import {
  daysBetween,
  isWithinAttributionWindow,
} from '../src/modules/advertising/utils/ad-attribution-window.util';

describe('tracking-code.util', () => {
  it('validates the 3-32 [A-Za-z0-9_-] alphabet', () => {
    assert.equal(isValidTrackingCode('ab'), false);
    assert.equal(isValidTrackingCode('abc'), true);
    assert.equal(isValidTrackingCode('a_b-C9'), true);
    assert.equal(isValidTrackingCode('has space'), false);
    assert.equal(isValidTrackingCode('a'.repeat(33)), false);
  });

  it('mints valid codes of the requested length within bounds', () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateTrackingCode(10);
      assert.equal(code.length, 10);
      assert.equal(isValidTrackingCode(code), true);
    }
    assert.equal(generateTrackingCode(1).length, 3); // floored at 3
    assert.equal(generateTrackingCode(99).length, 32); // capped at 32
  });

  it('builds an ad_<code> payload that fits Telegram cap and round-trips', () => {
    const payload = buildAdPayload('abc123');
    assert.equal(payload, 'ad_abc123');
    assert.ok(payload.length <= TELEGRAM_START_PAYLOAD_MAX);
    assert.equal(parseAdPayload(payload), 'abc123');
  });

  it('parseAdPayload returns null for non-ad / malformed payloads', () => {
    assert.equal(parseAdPayload('link_abc'), null);
    assert.equal(parseAdPayload('payment_return'), null);
    assert.equal(parseAdPayload('ad_'), null); // empty code
    assert.equal(parseAdPayload('ad_has space'), null);
    assert.equal(parseAdPayload(undefined), null);
  });

  it('builds deep links and omits Mini-App links when unconfigured', () => {
    const links = buildAdDeepLinks({ botUsername: '@RezeisBot', code: 'xy12' });
    assert.equal(links.botStart, 'https://t.me/RezeisBot?start=ad_xy12');
    assert.equal(links.miniAppStart, null);
    assert.equal(links.miniAppWeb, null);

    const full = buildAdDeepLinks({
      botUsername: 'RezeisBot',
      miniAppShortName: 'app',
      miniAppWebBaseUrl: 'https://reiwa.example/',
      code: 'xy12',
    });
    assert.equal(full.miniAppStart, 'https://t.me/RezeisBot/app?startapp=ad_xy12');
    assert.equal(full.miniAppWeb, 'https://reiwa.example/?campaign=ad_xy12');
  });
});

describe('ad-attribution-window.util', () => {
  const acq = new Date('2026-01-01T00:00:00.000Z');

  it('attributes a purchase inside the window (inclusive boundary)', () => {
    assert.equal(isWithinAttributionWindow(acq, new Date('2026-01-15T00:00:00.000Z'), 30), true);
    assert.equal(isWithinAttributionWindow(acq, new Date('2026-01-31T00:00:00.000Z'), 30), true);
  });

  it('rejects purchases beyond the window or before acquisition', () => {
    assert.equal(isWithinAttributionWindow(acq, new Date('2026-02-01T00:00:01.000Z'), 30), false);
    assert.equal(isWithinAttributionWindow(acq, new Date('2025-12-31T00:00:00.000Z'), 30), false);
  });

  it('rejects when acquisition is missing or window is non-positive', () => {
    assert.equal(isWithinAttributionWindow(null, new Date(), 30), false);
    assert.equal(isWithinAttributionWindow(acq, new Date('2026-01-02T00:00:00.000Z'), 0), false);
    assert.equal(isWithinAttributionWindow(acq, new Date('2026-01-02T00:00:00.000Z'), -5), false);
  });

  it('daysBetween floors at 0 and counts whole days', () => {
    assert.equal(daysBetween(acq, new Date('2026-01-04T12:00:00.000Z')), 3);
    assert.equal(daysBetween(acq, acq), 0);
    assert.equal(daysBetween(new Date('2026-01-10T00:00:00.000Z'), acq), 0);
  });
});
