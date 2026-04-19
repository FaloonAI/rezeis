import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { appConfig } from './common/config/app.config';
import { authConfig } from './common/config/auth.config';
import { databaseConfig } from './common/config/database.config';
import { emailConfig } from './common/config/email.config';
import { validateEnvironment } from './common/config/env.schema';
import { paymentsConfig } from './common/config/payments.config';
import { remnawaveConfig } from './common/config/remnawave.config';
import { redisConfig } from './common/config/redis.config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { InternalUserModule } from './modules/internal-user/internal-user.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PlansModule } from './modules/plans/plans.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { UsersModule } from './modules/users/users.module';

/**
 * Configures the root NestJS application module.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: validateEnvironment,
      load: [appConfig, authConfig, databaseConfig, emailConfig, paymentsConfig, redisConfig, remnawaveConfig],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    PlansModule,
    SubscriptionsModule,
    PaymentsModule,
    InternalUserModule,
    SettingsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
