import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AdminJwtAuthGuard } from '../../auth/guards/admin-jwt-auth.guard';
import { ListUserNotificationEventsQueryDto } from '../dto/list-user-notification-events.dto';
import { UserNotificationsService } from '../services/user-notifications.service';

/**
 * AdminUserNotificationEventsController
 * ─────────────────────────────────────
 * Read-only feed of recent per-user notification events (the
 * "Пользовательские события" tab of the admin Events page). System events
 * live under `/admin/audit?systemOnly=true`; this surface is the user-facing
 * counterpart (subscription expiry, referral/partner payouts, operator pushes…).
 */
@ApiTags('admin/notifications')
@ApiBearerAuth('JWT')
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/notifications/events')
export class AdminUserNotificationEventsController {
  public constructor(
    private readonly userNotificationsService: UserNotificationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List recent user notification events (cursor-paginated)' })
  public list(@Query() query: ListUserNotificationEventsQueryDto) {
    return this.userNotificationsService.listRecentEvents({
      limit: query.limit,
      cursor: query.cursor,
    });
  }
}
