import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { RemnawaveModule } from '../remnawave/remnawave.module';
import { PlanSnapshotSyncService } from '../subscriptions/services/plan-snapshot-sync.service';
import { AdminPlansController } from './controllers/admin-plans.controller';
import { InternalPlanCatalogController } from './controllers/internal-plan-catalog.controller';
import { PlanCatalogService } from './services/plan-catalog.service';
import { PlansAdminService } from './services/plans-admin.service';
import { PricingService } from './services/pricing.service';

@Module({
  imports: [AuthModule, RemnawaveModule],
  controllers: [AdminPlansController, InternalPlanCatalogController],
  providers: [PricingService, PlanCatalogService, PlansAdminService, PlanSnapshotSyncService],
  exports: [PlanCatalogService, PricingService, PlanSnapshotSyncService],
})
export class PlansModule {}
