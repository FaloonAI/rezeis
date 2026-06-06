import { Controller, Get, UseGuards } from '@nestjs/common';

import { AdminJwtAuthGuard } from '../../auth/guards/admin-jwt-auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import { PaymentReconciliationHealthInterface } from '../interfaces/payment-reconciliation-health.interface';
import { PaymentWebhookOpsService } from '../services/payment-webhook-ops.service';

@Controller('admin/payments/reconciliation')
@UseGuards(AdminJwtAuthGuard, RbacGuard)
export class AdminPaymentReconciliationController {
  public constructor(
    private readonly paymentWebhookOpsService: PaymentWebhookOpsService,
  ) {}

  @Get('health')
  @RequirePermission('payments', 'view')
  public async getHealth(): Promise<PaymentReconciliationHealthInterface> {
    return this.paymentWebhookOpsService.getReconciliationHealth();
  }
}
