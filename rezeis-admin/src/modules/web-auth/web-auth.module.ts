import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { InternalWebAuthController } from './controllers/internal-web-auth.controller';
import { WebAuthService } from './services/web-auth.service';

/**
 * WebAuthModule
 * ─────────────
 * Owns the credential-driven authentication flow consumed by the reiwa
 * SPA and Telegram Mini App. Sits next to `InternalUserModule` (which
 * exposes the *session* surface) and `AuthModule` (which provides the
 * shared `PasswordHashService`).
 */
@Module({
  imports: [AuthModule],
  controllers: [InternalWebAuthController],
  providers: [WebAuthService],
  exports: [WebAuthService],
})
export class WebAuthModule {}
