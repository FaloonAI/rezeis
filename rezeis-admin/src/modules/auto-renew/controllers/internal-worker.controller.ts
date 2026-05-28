import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { InternalAdminAuthGuard } from '../../auth/guards/internal-admin-auth.guard';
import { AutoRenewService } from '../auto-renew.service';

interface ExpiryAlertsResultInterface {
  readonly expired: number;
  readonly warnings3d: number;
  readonly warnings1d: number;
  readonly cycleAt: string;
}

/**
 * InternalWorkerController
 * ────────────────────────
 * Exposes the auto-renew cycle to reiwa's external worker process. The
 * upstream `AutoRenewScheduler` already runs on its own cron inside
 * rezeis-admin; this endpoint is for situations where reiwa wants to
 * force a cycle (e.g. after a known mass-purchase or to compensate for
 * a stalled scheduler in dev).
 */
@ApiTags('internal/worker')
@UseGuards(InternalAdminAuthGuard)
@Controller('internal/worker')
export class InternalWorkerController {
  public constructor(private readonly autoRenewService: AutoRenewService) {}

  @Get('expiry-alerts')
  @ApiOperation({ summary: 'Run a single auto-renew cycle and return the counters' })
  public async expiryAlerts(): Promise<ExpiryAlertsResultInterface> {
    const result = await this.autoRenewService.runCycle();
    return { ...result, cycleAt: new Date().toISOString() };
  }
}
