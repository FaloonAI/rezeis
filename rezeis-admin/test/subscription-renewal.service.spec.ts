import 'reflect-metadata';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BadRequestException } from '@nestjs/common';
import { Currency, PaymentGatewayType, Prisma } from '@prisma/client';
import fc from 'fast-check';

import { SubscriptionRenewalService } from '../src/modules/subscriptions/services/subscription-renewal.service';

interface SubFixture {
  readonly id: string;
  readonly planId: string;
  readonly durationDays: number;
  readonly currency: Currency;
  readonly price: string;
  readonly discountPercent: number;
  /** Durations the target plan offers (defaults to `[durationDays]`). */
  readonly durations?: readonly number[];
  /** When true, the discovery quote returns no available plans (not renewable). */
  readonly notRenewable?: boolean;
  /** When true, the subscription has no plan snapshot (panel-imported). */
  readonly planLess?: boolean;
  /** Catalog plan ids offered for a plan-less subscription's renewal. */
  readonly catalogPlanIds?: readonly string[];
}

const GATEWAY = PaymentGatewayType.YOOKASSA;

describe('SubscriptionRenewalService.priceRenewalItems', () => {
  it('prices each item and sums the combined total in one currency', async () => {
    const service = createService([
      sub({ id: 's1', price: '10.00' }),
      sub({ id: 's2', price: '5.50' }),
    ]);

    const result = await service.priceRenewalItems({
      identity: { userId: 'user-1' },
      subscriptionIds: ['s1', 's2'],
      gatewayType: GATEWAY,
    });

    assert.equal(result.items.length, 2);
    assert.equal(result.currency, Currency.USD);
    assert.equal(result.total, '15.5');
    assert.equal(result.items[0]?.amount, '10.00');
    assert.equal(result.items[1]?.amount, '5.50');
  });

  it('rejects an empty selection (RENEWAL_NO_ITEMS)', async () => {
    const service = createService([sub({ id: 's1' })]);
    await assert.rejects(
      () => service.priceRenewalItems({ identity: { userId: 'u' }, subscriptionIds: [], gatewayType: GATEWAY }),
      (e: unknown) => e instanceof BadRequestException && e.message === 'RENEWAL_NO_ITEMS',
    );
  });

  it('rejects a mixed-currency selection (MIXED_CURRENCY)', async () => {
    const service = createService([
      sub({ id: 's1', currency: Currency.USD, price: '10.00' }),
      sub({ id: 's2', currency: Currency.RUB, price: '900.00' }),
    ]);
    await assert.rejects(
      () =>
        service.priceRenewalItems({
          identity: { userId: 'u' },
          subscriptionIds: ['s1', 's2'],
          gatewayType: GATEWAY,
        }),
      (e: unknown) => e instanceof BadRequestException && e.message === 'MIXED_CURRENCY',
    );
  });

  it('rejects when an item cannot be priced (RENEWAL_ITEM_NOT_PRICEABLE)', async () => {
    const service = createService([
      sub({ id: 's1', price: '10.00' }),
      sub({ id: 's2', notRenewable: true }),
    ]);
    await assert.rejects(
      () =>
        service.priceRenewalItems({
          identity: { userId: 'u' },
          subscriptionIds: ['s1', 's2'],
          gatewayType: GATEWAY,
        }),
      (e: unknown) => e instanceof BadRequestException && e.message === 'RENEWAL_ITEM_NOT_PRICEABLE',
    );
  });

  it('carries each item discount through from the quote', async () => {
    const service = createService([sub({ id: 's1', price: '8.00', discountPercent: 20 })]);
    const result = await service.priceRenewalItems({
      identity: { userId: 'u' },
      subscriptionIds: ['s1'],
      gatewayType: GATEWAY,
    });
    assert.equal(result.items[0]?.discountPercent, 20);
    assert.equal(result.items[0]?.amount, '8.00');
  });

  it('Property 1: combined total equals the sum of item amounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 0, max: 100_000 }), { minLength: 1, maxLength: 6 }),
        async (cents) => {
          const fixtures = cents.map((c, i) =>
            sub({ id: `s${i}`, price: (c / 100).toFixed(2) }),
          );
          const service = createService(fixtures);
          const result = await service.priceRenewalItems({
            identity: { userId: 'u' },
            subscriptionIds: fixtures.map((f) => f.id),
            gatewayType: GATEWAY,
          });
          const expected = cents
            .reduce((sum, c) => sum.add(new Prisma.Decimal(c).div(100)), new Prisma.Decimal(0))
            .toString();
          assert.equal(result.total, expected);
          assert.equal(result.items.length, fixtures.length);
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('SubscriptionRenewalService duration selection', () => {
  const MULTI = [30, 90, 180] as const;

  it('exposes the plan available durations on each renewal option', async () => {
    const service = createService([sub({ id: 's1', durationDays: 30, durations: MULTI })]);
    const result = await service.getRenewalOptions({
      identity: { userId: 'u' },
      gatewayType: GATEWAY,
    });
    assert.deepEqual(
      result.items[0]?.availableDurations.map((d) => d.days),
      [...MULTI],
    );
  });

  it('Property 2: honours a chosen duration the plan offers', async () => {
    const service = createService([sub({ id: 's1', durationDays: 30, durations: MULTI })]);
    for (const chosen of MULTI) {
      const result = await service.getRenewalOptions({
        identity: { userId: 'u' },
        gatewayType: GATEWAY,
        durations: new Map([['s1', chosen]]),
      });
      assert.equal(result.items[0]?.durationDays, chosen);
      assert.ok(!result.items[0]?.warnings.some((w) => w.code === 'DURATION_INVALID'));
    }
  });

  it('Property 3: defaults to the originally purchased duration when none is chosen', async () => {
    const service = createService([sub({ id: 's1', durationDays: 90, durations: MULTI })]);
    const result = await service.getRenewalOptions({
      identity: { userId: 'u' },
      gatewayType: GATEWAY,
    });
    assert.equal(result.items[0]?.durationDays, 90);
    assert.ok(!result.items[0]?.warnings.some((w) => w.code === 'DURATION_INVALID'));
  });

  it('Property 4: rejects an unoffered choice and falls back to the original (DURATION_INVALID)', async () => {
    const service = createService([sub({ id: 's1', durationDays: 30, durations: MULTI })]);
    const result = await service.getRenewalOptions({
      identity: { userId: 'u' },
      gatewayType: GATEWAY,
      durations: new Map([['s1', 45]]), // not in MULTI
    });
    assert.equal(result.items[0]?.durationDays, 30);
    assert.ok(result.items[0]?.warnings.some((w) => w.code === 'DURATION_INVALID'));
  });

  it('Property 5: a single-duration plan auto-selects that duration', async () => {
    const service = createService([sub({ id: 's1', durationDays: 30, durations: [30] })]);
    const result = await service.getRenewalOptions({
      identity: { userId: 'u' },
      gatewayType: GATEWAY,
    });
    assert.equal(result.items[0]?.availableDurations.length, 1);
    assert.equal(result.items[0]?.durationDays, 30);
  });

  it('priceRenewalItems carries a chosen duration into the line item', async () => {
    const service = createService([sub({ id: 's1', durationDays: 30, durations: MULTI })]);
    const result = await service.priceRenewalItems({
      identity: { userId: 'u' },
      subscriptionIds: ['s1'],
      gatewayType: GATEWAY,
      durations: new Map([['s1', 180]]),
    });
    assert.equal(result.items[0]?.durationDays, 180);
  });
});

describe('SubscriptionRenewalService plan-less (panel-imported) subscriptions', () => {
  it('lists a plan-less sub as renewable but requiring plan selection (no price yet)', async () => {
    const service = createService([
      sub({ id: 'p1', planLess: true, catalogPlanIds: ['cat-a', 'cat-b'] }),
    ]);
    const result = await service.getRenewalOptions({ identity: { userId: 'u' }, gatewayType: GATEWAY });
    const item = result.items[0];
    assert.equal(item?.renewable, true);
    assert.equal(item?.requiresPlanSelection, true);
    assert.equal(item?.amount, null);
    assert.equal(item?.planId, null);
    // Not priced → not counted in the combined total.
    assert.equal(result.total, null);
  });

  it('prices a plan-less sub once a plan is chosen', async () => {
    const service = createService([
      sub({ id: 'p1', planLess: true, catalogPlanIds: ['cat-a', 'cat-b'], price: '12.00' }),
    ]);
    const result = await service.getRenewalOptions({
      identity: { userId: 'u' },
      gatewayType: GATEWAY,
      plans: new Map([['p1', 'cat-b']]),
    });
    const item = result.items[0];
    assert.equal(item?.renewable, true);
    assert.equal(item?.requiresPlanSelection, false);
    assert.equal(item?.planId, 'cat-b');
    assert.equal(item?.amount, '12.00');
  });

  it('checkout pricing of a plan-less sub requires a chosen plan', async () => {
    const service = createService([sub({ id: 'p1', planLess: true })]);
    await assert.rejects(
      () =>
        service.priceRenewalItems({
          identity: { userId: 'u' },
          subscriptionIds: ['p1'],
          gatewayType: GATEWAY,
        }),
      (e: unknown) => e instanceof BadRequestException && e.message === 'RENEWAL_ITEM_NOT_PRICEABLE',
    );
  });

  it('checkout prices a plan-less sub with a chosen plan + duration', async () => {
    const service = createService([
      sub({ id: 'p1', planLess: true, catalogPlanIds: ['cat-a', 'cat-b'], durations: [30, 90], price: '9.00' }),
    ]);
    const result = await service.priceRenewalItems({
      identity: { userId: 'u' },
      subscriptionIds: ['p1'],
      gatewayType: GATEWAY,
      plans: new Map([['p1', 'cat-a']]),
      durations: new Map([['p1', 90]]),
    });
    assert.equal(result.items[0]?.planId, 'cat-a');
    assert.equal(result.items[0]?.durationDays, 90);
    assert.equal(result.items[0]?.amount, '9.00');
  });
});

function sub(input: {
  readonly id: string;
  readonly planId?: string;
  readonly durationDays?: number;
  readonly currency?: Currency;
  readonly price?: string;
  readonly discountPercent?: number;
  readonly durations?: readonly number[];
  readonly notRenewable?: boolean;
  readonly planLess?: boolean;
  readonly catalogPlanIds?: readonly string[];
}): SubFixture {
  return {
    id: input.id,
    planId: input.planId ?? `plan-${input.id}`,
    durationDays: input.durationDays ?? 30,
    currency: input.currency ?? Currency.USD,
    price: input.price ?? '10.00',
    discountPercent: input.discountPercent ?? 0,
    durations: input.durations,
    notRenewable: input.notRenewable ?? false,
    planLess: input.planLess ?? false,
    catalogPlanIds: input.catalogPlanIds,
  };
}

function createService(fixtures: readonly SubFixture[]): SubscriptionRenewalService {
  const byId = new Map(fixtures.map((f) => [f.id, f]));

  const prismaService = {
    subscription: {
      findMany: async (args: { where: { id?: { in: string[] } } }) => {
        const ids = args.where.id?.in ?? [...byId.keys()];
        return ids
          .map((id) => byId.get(id))
          .filter((f): f is SubFixture => f !== undefined)
          .map((f) => ({
            id: f.id,
            planSnapshot: f.planLess ? {} : { id: f.planId, selectedDurationDays: f.durationDays },
          }));
      },
      findUnique: async (args: { where: { id: string } }) => {
        const f = byId.get(args.where.id);
        if (f === undefined) return null;
        return {
          id: f.id,
          planSnapshot: f.planLess ? {} : { id: f.planId, selectedDurationDays: f.durationDays },
        };
      },
    },
    user: { findUnique: async () => ({ id: 'user-1' }) },
  };

  const buildPlan = (id: string, days: readonly number[]) => ({
    id,
    name: `Plan ${id}`,
    tag: null,
    type: 'BOTH',
    trafficLimit: 1024,
    deviceLimit: 1,
    trafficLimitStrategy: 'NO_RESET',
    durations: days.map((d) => ({ id: `d${d}`, days: d })),
  });

  const quoteService = {
    getQuote: async (input: { subscriptionId?: string; planId?: string; durationDays?: number }) => {
      const f = input.subscriptionId ? byId.get(input.subscriptionId) : undefined;
      if (f === undefined || f.notRenewable) {
        return {
          isEligible: false,
          price: null,
          selectedPlan: null,
          selectedDuration: null,
          selectedSubscriptionId: input.subscriptionId ?? null,
          availablePlans: [],
          warnings: [{ code: 'SOURCE_PLAN_MISSING', message: 'missing' }],
        };
      }
      const durationDaysList =
        f.durations !== undefined && f.durations.length > 0 ? f.durations : [f.durationDays];
      // Plan-less subscriptions: the discovery quote offers a catalog of plans
      // (mirrors the real getSourceSelection fallback) the user must choose from.
      const availablePlans = f.planLess
        ? (f.catalogPlanIds ?? ['cat-a', 'cat-b']).map((id) => buildPlan(id, durationDaysList))
        : [buildPlan(f.planId, durationDaysList)];
      if (input.planId === undefined) {
        // discovery pass
        return {
          isEligible: false,
          price: null,
          selectedPlan: null,
          selectedDuration: null,
          selectedSubscriptionId: f.id,
          availablePlans,
          warnings: f.planLess ? [{ code: 'PLAN_SELECTION_REQUIRED', message: 'choose' }] : [],
        };
      }
      // pricing pass — resolve the requested plan + echo the requested duration.
      const plan = availablePlans.find((p) => p.id === input.planId) ?? availablePlans[0]!;
      const requestedDays = input.durationDays ?? durationDaysList[0]!;
      return {
        isEligible: true,
        price: {
          gatewayType: GATEWAY,
          currency: f.currency,
          originalPrice: f.price,
          price: f.price,
          discountPercent: f.discountPercent,
          discountSource: f.discountPercent > 0 ? 'PURCHASE' : 'NONE',
        },
        selectedPlan: plan,
        selectedDuration: { id: `d${requestedDays}`, days: requestedDays },
        selectedSubscriptionId: f.id,
        availablePlans,
        warnings: [],
      };
    },
  };

  return new SubscriptionRenewalService(prismaService as never, quoteService as never);
}
