import { Module } from '@nestjs/common';

import { PrismaModule } from '../../common/prisma/prisma.module';
import { PlansModule } from '../plans/plans.module';
import { FaqModule } from '../faq/faq.module';
import { AiConfigModule } from '../ai-config/ai-config.module';
import { AiChatController } from './controllers/ai-chat.controller';
import { AiChatService } from './services/ai-chat.service';

/**
 * AI Chat module — admin-side OpenAI-compatible chat (JWT-gated).
 * Provider credentials come from panel AI-Support settings (encrypted
 * at rest via AiConfigService) — never from OPENAI_* env vars.
 */
@Module({
  imports: [PrismaModule, PlansModule, FaqModule, AiConfigModule],
  controllers: [AiChatController],
  providers: [AiChatService],
  exports: [AiChatService],
})
export class AiChatModule {}
