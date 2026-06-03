import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Currency, PaymentGatewayType, TransactionStatus, UserRole } from '@prisma/client';

import { QuickSearchService } from '../src/modules/dashboard/services/quick-search.service';

describe('QuickSearchService RBAC filtering', () => {
  it('does not query or return payment transactions without payments:view', async () => {
    const calls: string[] = [];
    const service = createService({
      permissions: new Set(['users:view']),
      calls,
    });

    const results = await service.search({
      rawQuery: 'payment-provider-id',
      currentAdmin: createAdmin(),
    });

    assert.equal(calls.includes('transaction.findMany'), false);
    assert.equal(results.some((hit) => hit.type === 'transaction'), false);
  });

  it('returns payment transaction hits only when payments:view is granted', async () => {
    const calls: string[] = [];
    const service = createService({
      permissions: new Set(['payments:view']),
      calls,
    });

    const results = await service.search({
      rawQuery: 'payment-provider-id',
      currentAdmin: createAdmin(),
    });

    assert.equal(calls.includes('transaction.findMany'), true);
    assert.deepStrictEqual(results, [{
      type: 'transaction',
      id: 'payment-1',
      label: 'YOOKASSA · 12.50 USD',
      subtitle: 'COMPLETED · payment-1',
    }]);
  });
});

function createService(input: {
  readonly permissions: ReadonlySet<string>;
  readonly calls: string[];
}): QuickSearchService {
  const prismaService = {
    user: {
      findMany: async () => {
        input.calls.push('user.findMany');
        return [];
      },
    },
    subscription: {
      findMany: async () => {
        input.calls.push('subscription.findMany');
        return [];
      },
    },
    transaction: {
      findMany: async () => {
        input.calls.push('transaction.findMany');
        return [{
          id: 'transaction-1',
          paymentId: 'payment-1',
          status: TransactionStatus.COMPLETED,
          gatewayType: PaymentGatewayType.YOOKASSA,
          amount: { toString: () => '12.50' },
          currency: Currency.USD,
        }];
      },
    },
    promocode: {
      findMany: async () => {
        input.calls.push('promocode.findMany');
        return [];
      },
    },
    partner: {
      findMany: async () => {
        input.calls.push('partner.findMany');
        return [];
      },
    },
  };
  const rbacService = {
    hasPermission: async (_admin: unknown, resource: string, action: string) =>
      input.permissions.has(`${resource}:${action}`),
  };

  return new QuickSearchService(prismaService as never, rbacService as never);
}

function createAdmin() {
  return {
    id: 'admin-1',
    role: UserRole.ADMIN,
    rbacRoleId: 'role-1',
  };
}
