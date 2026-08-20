import {
  Controller,
  ParseEnumPipe,
  Post,
  RawBody,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentGatewayType } from '@prisma/client';
import type { Request } from 'express';

import { InternalAdminAuthGuard } from '../../auth/guards/internal-admin-auth.guard';
import { PaymentWebhookIngressResultInterface } from '../interfaces/payment-webhook-envelope.interface';
import { PaymentWebhookIngressService } from '../services/payment-webhook-ingress.service';

@Controller('internal/payments/webhooks')
@UseGuards(InternalAdminAuthGuard)
export class InternalPaymentWebhooksController {
  public constructor(
    private readonly paymentWebhookIngressService: PaymentWebhookIngressService,
  ) {}

  @Post(':gatewayType')
  public async ingest(
    @Param('gatewayType', new ParseEnumPipe(PaymentGatewayType)) gatewayType: PaymentGatewayType,
    @RawBody() rawBody: Buffer | undefined,
    @Req() request: Request,
  ): Promise<PaymentWebhookIngressResultInterface> {
    return this.paymentWebhookIngressService.ingestWebhook({
      gatewayType,
      rawBody: rawBody ?? Buffer.from('{}', 'utf8'),
      headers: request.headers,
      // Internal path is already behind InternalAdminAuthGuard (service auth).
      // YooKassa public ingress still verifies trusted source IPs; here the
      // caller is our own stack (proxy/worker), so IP checks would always fail
      // and signature verification is skipped for the same reason.
      clientIp: null,
      verifySignature: false,
    });
  }
}
