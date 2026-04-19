import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PaymentGatewayType } from '@prisma/client';

import { PaymentWebhookIngressService } from '../src/modules/payments/services/payment-webhook-ingress.service';

describe('PaymentWebhookIngressService', () => {
  it('marks new webhook deliveries as enqueued', async () => {
    const calls: unknown[] = [];
    const service = new PaymentWebhookIngressService(
      {
        paymentGateway: {
          findUnique: async () => ({ type: PaymentGatewayType.YOOKASSA, settings: {} }),
        },
      } as never,
      {
        normalizeWebhook: () => ({
          gatewayType: PaymentGatewayType.YOOKASSA,
          paymentId: 'payment-1',
          providerEventId: 'event-1',
          eventStatus: 'succeeded',
          receivedAt: '2026-04-19T12:00:00.000Z',
          payloadHash: 'hash-1',
          rawPayload: { object: { id: 'payment-1' } },
        }),
      } as never,
      {
        recordReceived: async () => ({
          duplicate: false,
          event: { id: 'event-row-1', paymentId: 'payment-1', gatewayType: PaymentGatewayType.YOOKASSA },
        }),
        markEnqueued: async (eventId: string) => {
          calls.push(['markEnqueued', eventId]);
          return { id: eventId, status: 'ENQUEUED' };
        },
      } as never,
      {
        add: async (...args: readonly unknown[]) => {
          calls.push(['queue.add', ...args]);
          return { id: 'job-1' };
        },
      } as never,
    );

    const result = await service.ingestWebhook({
      gatewayType: PaymentGatewayType.YOOKASSA,
      rawBody: Buffer.from('{}', 'utf8'),
      headers: {},
      clientIp: '185.71.76.1',
      verifySignature: true,
    });

    assert.equal(result.duplicate, false);
    assert.equal(result.lifecycleStatus, 'ENQUEUED');
    assert.deepStrictEqual(calls, [
      ['markEnqueued', 'event-row-1'],
      ['queue.add', 'reconcile-payment', { eventId: 'event-row-1', paymentId: 'payment-1', gatewayType: PaymentGatewayType.YOOKASSA }, { removeOnComplete: 100, removeOnFail: 100 }],
    ]);
  });

  it('does not re-enqueue duplicate deliveries', async () => {
    const calls: unknown[] = [];
    const service = new PaymentWebhookIngressService(
      {
        paymentGateway: {
          findUnique: async () => ({ type: PaymentGatewayType.YOOKASSA, settings: {} }),
        },
      } as never,
      {
        normalizeWebhook: () => ({
          gatewayType: PaymentGatewayType.YOOKASSA,
          paymentId: 'payment-1',
          providerEventId: 'event-1',
          eventStatus: 'succeeded',
          receivedAt: '2026-04-19T12:00:00.000Z',
          payloadHash: 'hash-1',
          rawPayload: { object: { id: 'payment-1' } },
        }),
      } as never,
      {
        recordReceived: async () => ({
          duplicate: true,
          event: { id: 'event-row-1', paymentId: 'payment-1', gatewayType: PaymentGatewayType.YOOKASSA, status: 'ENQUEUED' },
        }),
        markEnqueued: async (eventId: string) => {
          calls.push(['markEnqueued', eventId]);
          return { id: eventId, status: 'ENQUEUED' };
        },
      } as never,
      {
        add: async (...args: readonly unknown[]) => {
          calls.push(['queue.add', ...args]);
          return { id: 'job-1' };
        },
      } as never,
    );

    const result = await service.ingestWebhook({
      gatewayType: PaymentGatewayType.YOOKASSA,
      rawBody: Buffer.from('{}', 'utf8'),
      headers: {},
      clientIp: '185.71.76.1',
      verifySignature: true,
    });

    assert.equal(result.duplicate, true);
    assert.equal(result.lifecycleStatus, 'ENQUEUED');
    assert.deepStrictEqual(calls, []);
  });
});
