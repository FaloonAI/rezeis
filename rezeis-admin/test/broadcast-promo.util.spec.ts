import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as fc from 'fast-check';

import {
  BroadcastPromocodeSnapshot,
  buildPromoButton,
  buildPromoWebAppPath,
  evaluateBroadcastPromocode,
  isBroadcastPromocodeUsable,
} from '../src/modules/broadcast/utils/broadcast-promo.util';

const NOW = new Date('2026-06-21T12:00:00.000Z');

function snapshot(
  overrides: Partial<BroadcastPromocodeSnapshot> = {},
): BroadcastPromocodeSnapshot {
  return {
    isActive: true,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    lifetime: null,
    expiresAt: null,
    maxActivations: null,
    activationsCount: 0,
    ...overrides,
  };
}

describe('broadcast-promo.util', () => {
  describe('evaluateBroadcastPromocode', () => {
    it('returns OK for an active, unlimited, never-expiring code', () => {
      assert.equal(evaluateBroadcastPromocode(snapshot(), NOW), 'OK');
    });

    it('returns INACTIVE when the code is switched off', () => {
      assert.equal(
        evaluateBroadcastPromocode(snapshot({ isActive: false }), NOW),
        'INACTIVE',
      );
    });

    it('returns EXPIRED when the absolute deadline has passed', () => {
      assert.equal(
        evaluateBroadcastPromocode(
          snapshot({ expiresAt: new Date('2026-06-20T00:00:00.000Z') }),
          NOW,
        ),
        'EXPIRED',
      );
    });

    it('returns EXPIRED when createdAt + lifetime days is in the past', () => {
      assert.equal(
        evaluateBroadcastPromocode(
          snapshot({ createdAt: new Date('2026-06-01T00:00:00.000Z'), lifetime: 5 }),
          NOW,
        ),
        'EXPIRED',
      );
    });

    it('treats lifetime <= 0 / null as unlimited', () => {
      assert.equal(evaluateBroadcastPromocode(snapshot({ lifetime: -1 }), NOW), 'OK');
      assert.equal(evaluateBroadcastPromocode(snapshot({ lifetime: 0 }), NOW), 'OK');
    });

    it('returns DEPLETED when activations reached the cap', () => {
      assert.equal(
        evaluateBroadcastPromocode(
          snapshot({ maxActivations: 10, activationsCount: 10 }),
          NOW,
        ),
        'DEPLETED',
      );
    });

    it('treats maxActivations <= 0 / null as unlimited', () => {
      assert.equal(
        evaluateBroadcastPromocode(
          snapshot({ maxActivations: 0, activationsCount: 9999 }),
          NOW,
        ),
        'OK',
      );
    });

    it('checks inactive before expiry before depletion', () => {
      // inactive + expired + depleted → INACTIVE wins
      assert.equal(
        evaluateBroadcastPromocode(
          snapshot({
            isActive: false,
            expiresAt: new Date('2020-01-01T00:00:00.000Z'),
            maxActivations: 1,
            activationsCount: 5,
          }),
          NOW,
        ),
        'INACTIVE',
      );
    });

    it('only OK is usable', () => {
      assert.equal(isBroadcastPromocodeUsable('OK'), true);
      assert.equal(isBroadcastPromocodeUsable('EXPIRED'), false);
      assert.equal(isBroadcastPromocodeUsable('DEPLETED'), false);
      assert.equal(isBroadcastPromocodeUsable('INACTIVE'), false);
    });

    it('property: a code with future deadline + slack capacity is always OK', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 365 }),
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 101, max: 1000 }),
          (futureDays, used, cap) => {
            const future = new Date(NOW.getTime() + futureDays * 24 * 60 * 60 * 1000);
            const status = evaluateBroadcastPromocode(
              snapshot({ expiresAt: future, maxActivations: cap, activationsCount: used }),
              NOW,
            );
            return status === 'OK';
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('buildPromoWebAppPath / buildPromoButton', () => {
    it('builds a /promo?code= path with URL-encoding', () => {
      assert.equal(buildPromoWebAppPath('SUMMER25'), '/promo?code=SUMMER25');
      assert.equal(
        buildPromoWebAppPath('A B&C'),
        '/promo?code=A%20B%26C',
      );
    });

    it('builds a web_app notify button carrying the label + path', () => {
      const button = buildPromoButton('SUMMER25', '🎁 Activate');
      assert.deepStrictEqual(button, {
        text: '🎁 Activate',
        webAppPath: '/promo?code=SUMMER25',
      });
    });
  });
});
