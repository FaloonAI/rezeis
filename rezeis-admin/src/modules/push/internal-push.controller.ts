import { Body, Controller, Delete, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { InternalAdminAuthGuard } from '../auth/guards/internal-admin-auth.guard';

interface PushSubscribeBody {
  readonly userId: string;
  readonly subscription: {
    readonly endpoint: string;
    readonly keys: { readonly p256dh: string; readonly auth: string };
  };
}

interface PushUnsubscribeBody {
  readonly userId: string;
  readonly endpoint: string;
}

/**
 * InternalPushController
 * ──────────────────────
 * Today this is a stub: subscribes/unsubscribes are accepted and dropped
 * on the floor with `{ success: true }`. Reiwa keeps the SPA flow
 * working; admin grows real persistence later via a `PushSubscription`
 * Prisma model + outbound delivery worker.
 *
 * Auth: internal API token (`InternalAdminAuthGuard`).
 */
@ApiTags('internal/push')
@UseGuards(InternalAdminAuthGuard)
@Controller('internal/push')
export class InternalPushController {
  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Persist a web-push subscription for a user (no-op stub)' })
  public subscribe(@Body() _body: PushSubscribeBody): { success: boolean } {
    return { success: true };
  }

  @Delete('unsubscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a web-push subscription for a user (no-op stub)' })
  public unsubscribe(@Body() _body: PushUnsubscribeBody): { success: boolean } {
    return { success: true };
  }
}
