import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { AdminJwtAuthGuard } from '../../auth/guards/admin-jwt-auth.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { AdminUserListQueryDto } from '../dto/admin-user-list-query.dto';
import { AdminUserResolveQueryDto } from '../dto/admin-user-resolve-query.dto';
import { AdminUserSearchQueryDto } from '../dto/admin-user-search-query.dto';
import { AdminUserListResultInterface } from '../interfaces/admin-user-list-item.interface';
import { AdminUserResolveResultInterface } from '../interfaces/admin-user-resolve-result.interface';
import { AdminUserSearchResultInterface } from '../interfaces/admin-user-search-result.interface';
import { AdminUsersService } from '../services/admin-users.service';

/**
 * Exposes JWT-protected user reads for the admin panel.
 *
 * Routes:
 *   • `GET /admin/users`         — paginated list for the left-rail picker.
 *   • `GET /admin/users/search`  — single-user aggregated lookup.
 *   • `GET /admin/users/resolve` — identifier → single reiwa user (plan picker).
 */
@Controller('admin/users')
@UseGuards(AdminJwtAuthGuard, RbacGuard)
export class AdminUsersController {
  public constructor(private readonly adminUsersService: AdminUsersService) {}

  /**
   * Returns the paginated admin list of users with a free-text search filter.
   */
  @Get()
  @RequirePermission('users', 'view')
  public async listUsers(
    @Query() query: AdminUserListQueryDto,
  ): Promise<AdminUserListResultInterface> {
    return this.adminUsersService.listUsers(query);
  }

  /**
   * Returns the aggregated admin search payload for a single user lookup.
   */
  @Get('search')
  @RequirePermission('users', 'view')
  public async searchUser(
    @Query() query: AdminUserSearchQueryDto,
  ): Promise<AdminUserSearchResultInterface> {
    return this.adminUsersService.searchUser(query);
  }

  /**
   * Resolves a free-text identifier (reiwa_id / Telegram ID / login / email)
   * to a single reiwa user — used by the plan "Allowed users" picker so admins
   * can add users by any known handle instead of only the reiwa_id.
   */
  @Get('resolve')
  @RequirePermission('users', 'view')
  public async resolveUser(
    @Query() query: AdminUserResolveQueryDto,
  ): Promise<AdminUserResolveResultInterface> {
    return this.adminUsersService.resolveUser(query);
  }
}
