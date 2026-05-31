import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AdminSupportTicketsController } from './controllers/admin-support-tickets.controller';
import { InternalUserSupportController } from './controllers/internal-user-support.controller';
import { SupportTicketsService } from './services/support-tickets.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminSupportTicketsController, InternalUserSupportController],
  providers: [SupportTicketsService],
  exports: [SupportTicketsService],
})
export class SupportTicketsModule {}
