import { Module } from '@nestjs/common';

import { PlansModule } from '../plans/plans.module';
import { AdminSubscriptionsController } from './controllers/admin-subscriptions.controller';
import { InternalSubscriptionsController } from './controllers/internal-subscriptions.controller';
import { SubscriptionQuoteService } from './services/subscription-quote.service';

@Module({
  imports: [PlansModule],
  controllers: [AdminSubscriptionsController, InternalSubscriptionsController],
  providers: [SubscriptionQuoteService],
  exports: [SubscriptionQuoteService],
})
export class SubscriptionsModule {}
