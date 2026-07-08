import 'reflect-metadata';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Prisma } from '@prisma/client';

import { PlansStatsService } from '../src/modules/plans/services/plans-stats.service';

/**
 * Golden-output coverage for PlansStatsService.getStats. Pins the exact
 * aggregation result for a fixed dataset so the DB-side planId pre-filter
 * optimization (and any future edit) provably does not change the numbers:
 * totals, per-plan breakdown, timeline buckets, per-currency revenue and
 * unique-buyer counts.
 */

interface Row {
  userId: string;
  amount: string;
  currency: string;
  planSnapshot: unknown;
  createdAt: Date;
  user: { name: string; username: string | null; telegramId: bigint | null };
}

const DATASET: Row[] = [
  {
    userId: 'u1',
    amount: '100.00',
    currency: 'RUB',
    planSnapshot: { plan: { id: 'planA', name: 'Plan A' } },
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
    user: { name: 'Alice', username: 'alice', telegramId: 111n },
  },
  {
    userId: 'u1',
    amount: '50.00',
    currency: 'RUB',
    planSnapshot: { plan: { id: 'planA', name: 'Plan A' } },
    createdAt: new Date('2026-01-01T12:00:00.000Z'),
    user: { name: 'Alice', username: 'alice', telegramId: 111n },
  },
  {
    userId: 'u2',
    amount: '9.99',
    currency: 'USD',
    planSnapshot: { plan: { id: 'planB', name: 'Plan B' } },
    createdAt: new Date('2026-01-02T09:00:00.000Z'),
    user: { name: 'Bob', username: null, telegramId: 222n },
  },
];

function makeService(rows: Row[], captureWhere?: (w: unknown) => void): PlansStatsService {
  const prisma = {
    transaction: {
      findMany: async (args: { where: unknown }) => {
        captureWhere?.(args.where);
        return rows.map((r) => ({ ...r, amount: new Prisma.Decimal(r.amount) }));
      },
    },
  };
  return new PlansStatsService(prisma as never);
}

describe('PlansStatsService.getStats (golden)', () => {
  it('produces the exact aggregation for the fixed dataset', async () => {
    const result = await makeService(DATASET).getStats({});

    assert.equal(result.totals.purchases, 3);
    assert.equal(result.totals.uniqueBuyers, 2);
    assert.deepEqual(result.totals.revenueByCurrency, { RUB: '150.00', USD: '9.99' });

    // byPlan sorted by purchases desc → Plan A (2) then Plan B (1)
    assert.equal(result.byPlan.length, 2);
    assert.equal(result.byPlan[0].planId, 'planA');
    assert.equal(result.byPlan[0].purchases, 2);
    assert.equal(result.byPlan[0].uniqueBuyers, 1);
    assert.deepEqual(result.byPlan[0].revenueByCurrency, { RUB: '150.00' });
    assert.equal(result.byPlan[1].planId, 'planB');
    assert.deepEqual(result.byPlan[1].revenueByCurrency, { USD: '9.99' });

    // timeline: two UTC days ascending
    assert.deepEqual(
      result.timeline.map((t) => t.bucket),
      ['2026-01-01', '2026-01-02'],
    );
    assert.equal(result.timeline[0].purchases, 2);
    assert.deepEqual(result.timeline[0].revenueByCurrency, { RUB: '150.00' });

    // topBuyers sorted by purchases desc → u1 (2) then u2 (1)
    assert.equal(result.topBuyers[0].userId, 'u1');
    assert.equal(result.topBuyers[0].purchases, 2);
    assert.equal(result.topBuyers[0].displayName, 'Alice');
    assert.equal(result.topBuyers[1].userId, 'u2');
    assert.equal(result.topBuyers[1].telegramId, '222');
  });

  it('planId filter yields only the matching plan and pushes a JSON-path filter into the DB where', async () => {
    let capturedWhere: Record<string, unknown> | null = null;
    const result = await makeService(DATASET, (w) => {
      capturedWhere = w as Record<string, unknown>;
    }).getStats({ planId: 'planA' });

    // Output: only Plan A rows aggregate (JS filter remains the authority).
    assert.equal(result.totals.purchases, 2);
    assert.equal(result.byPlan.length, 1);
    assert.equal(result.byPlan[0].planId, 'planA');
    assert.deepEqual(result.totals.revenueByCurrency, { RUB: '150.00' });

    // Perf: a JSON-path pre-filter is now pushed to the DB query.
    assert.ok(capturedWhere !== null);
    assert.ok('planSnapshot' in (capturedWhere as Record<string, unknown>));
  });
});
