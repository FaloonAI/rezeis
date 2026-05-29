import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { InternalAdminAuthGuard } from '../../auth/guards/internal-admin-auth.guard';
import { InternalPaymentCheckoutDto } from '../dto/internal-payment-checkout.dto';
import {
  InternalPaymentCheckoutInterface,
  InternalPaymentStatusInterface,
} from '../interfaces/internal-payment-checkout.interface';
import { InternalPaymentGatewayInterface } from '../interfaces/internal-payment-gateway.interface';
import { PaymentGatewayRegistryService } from '../services/payment-gateway-registry.service';
import { PaymentsCheckoutService } from '../services/payments-checkout.service';

@Controller('internal/payments')
@UseGuards(InternalAdminAuthGuard)
export class InternalPaymentsController {
  public constructor(
    private readonly paymentsCheckoutService: PaymentsCheckoutService,
    private readonly paymentGatewayRegistryService: PaymentGatewayRegistryService,
  ) {}

  /**
   * Returns the list of *enabled* gateways the SPA / Mini App should
   * render on the purchase screen. Sorted by `orderIndex` so operators
   * control the visual layout from the admin panel without code
   * changes. Disabled gateways are filtered out — there's no point in
   * leaking them to user-facing surfaces.
   */
  @Get('gateways')
  public async listEnabledGateways(): Promise<readonly InternalPaymentGatewayInterface[]> {
    const all = await this.paymentGatewayRegistryService.listGateways();
    return all
      .filter((gateway) => gateway.isActive)
      .map((gateway): InternalPaymentGatewayInterface => ({
        id: gateway.id,
        type: gateway.type,
        currency: gateway.currency,
        orderIndex: gateway.orderIndex,
      }));
  }

  @Post('checkout')
  public async checkout(
    @Body() input: InternalPaymentCheckoutDto,
  ): Promise<InternalPaymentCheckoutInterface> {
    return this.paymentsCheckoutService.checkout(input);
  }

  @Get(':paymentId')
  public async getStatus(
    @Param('paymentId') paymentId: string,
    @Query('userId') userId?: string,
    @Query('telegramId') telegramId?: string,
  ): Promise<InternalPaymentStatusInterface> {
    return this.paymentsCheckoutService.getPaymentStatus({ paymentId, userId, telegramId });
  }
}
