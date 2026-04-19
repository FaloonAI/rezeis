import 'reflect-metadata';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { PurchaseType } from '@prisma/client';

import { AdminJwtAuthGuard } from '../src/modules/auth/guards/admin-jwt-auth.guard';
import { AdminPaymentTransactionsController } from '../src/modules/payments/controllers/admin-payment-transactions.controller';
import { PaymentsTransactionsService } from '../src/modules/payments/services/payments-transactions.service';

describe('AdminPaymentTransactionsController', () => {
  it('exposes transaction list and draft routes', () => {
    assert.equal(
      Reflect.getMetadata(PATH_METADATA, AdminPaymentTransactionsController),
      'admin/payments/transactions',
    );
    assert.equal(
      Reflect.getMetadata(PATH_METADATA, AdminPaymentTransactionsController.prototype.listTransactions),
      '/',
    );
    assert.equal(
      Reflect.getMetadata(METHOD_METADATA, AdminPaymentTransactionsController.prototype.listTransactions),
      RequestMethod.GET,
    );
    assert.equal(
      Reflect.getMetadata(PATH_METADATA, AdminPaymentTransactionsController.prototype.createDraft),
      'draft',
    );
    assert.equal(
      Reflect.getMetadata(METHOD_METADATA, AdminPaymentTransactionsController.prototype.createDraft),
      RequestMethod.POST,
    );
    assert.deepStrictEqual(
      Reflect.getMetadata(GUARDS_METADATA, AdminPaymentTransactionsController),
      [AdminJwtAuthGuard],
    );
  });

  it('delegates list and draft calls unchanged', async () => {
    const calls: unknown[] = [];
    const controller = new AdminPaymentTransactionsController({
      listTransactions: async (query: unknown) => {
        calls.push(['list', query]);
        return [{ id: 'tx-1' }];
      },
      createDraft: async (input: unknown) => {
        calls.push(['draft', input]);
        return { id: 'tx-2', purchaseType: PurchaseType.NEW };
      },
    } as never as PaymentsTransactionsService);

    assert.deepStrictEqual(await controller.listTransactions({ userId: 'user-1' } as never), [{ id: 'tx-1' }]);
    assert.deepStrictEqual(
      await controller.createDraft({ userId: 'user-1', purchaseType: PurchaseType.NEW } as never),
      { id: 'tx-2', purchaseType: PurchaseType.NEW },
    );
    assert.deepStrictEqual(calls, [
      ['list', { userId: 'user-1' }],
      ['draft', { userId: 'user-1', purchaseType: PurchaseType.NEW }],
    ]);
  });
});
