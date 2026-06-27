import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Prisma, UserRole } from '@prisma/client';
import { Request } from 'express';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { CurrentAdmin } from '../../auth/decorators/current-admin.decorator';
import { AdminJwtAuthGuard } from '../../auth/guards/admin-jwt-auth.guard';
import { CurrentAdminInterface } from '../../auth/interfaces/current-admin.interface';
import { PasswordHashService } from '../../auth/services/password-hash.service';
import { loginPolicy } from '../../auth/utils/login-policy.util';
import { extractRequestMetadata } from '../../auth/utils/request-metadata.util';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { RbacGuard } from '../guards/rbac.guard';
import { RbacService } from '../services/rbac.service';

/**
 * Admin user CRUD endpoints. The `admins` RBAC resource gates each verb.
 *
 * This is the surface operators use to *issue dedicated panel accounts* —
 * create a login, set a temporary password (optionally forcing a change on
 * first sign-in), and bind the account to a custom RBAC role so it sees
 * exactly the sections that role grants.
 *
 * Safety rails:
 *   - Self-targeted destructive ops (deactivate / delete the currently
 *     authenticated admin) are blocked.
 *   - The *last active admin* can never be deactivated or deleted, so the
 *     panel can't be locked out entirely.
 *   - Every mutation is written to the `AdminAuditLog`.
 */

const ROLE_VALUES = ['DEV', 'ADMIN'] as const;
type AssignableRole = (typeof ROLE_VALUES)[number];

class CreateAdminDto {
  @IsString()
  @MinLength(loginPolicy.minLength)
  @MaxLength(loginPolicy.maxLength)
  @Matches(loginPolicy.pattern, {
    message: 'Login may only contain letters, digits, dots, dashes, and underscores',
  })
  public readonly username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  public readonly password!: string;

  @IsEnum(ROLE_VALUES)
  public readonly role!: AssignableRole;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  public readonly name?: string;

  /**
   * Optional custom RBAC role to attach. When set, the role's permission
   * matrix fully drives access; when omitted/null the account falls back to
   * the legacy `role`-enum defaults (DEV → all, ADMIN → safe-write set).
   */
  @IsOptional()
  @IsString()
  @Length(1, 64)
  public readonly rbacRoleId?: string | null;

  /** Force a password change on the account's first sign-in. */
  @IsOptional()
  @IsBoolean()
  public readonly mustChangePassword?: boolean;
}

class UpdateAdminDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  public readonly password?: string;

  @IsOptional()
  @IsEnum(ROLE_VALUES)
  public readonly role?: AssignableRole;

  @IsOptional()
  @IsBoolean()
  public readonly isActive?: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  public readonly name?: string;

  /**
   * Custom RBAC role pointer. Pass a role id to (re)assign, or an empty
   * string / null to detach the custom role and fall back to legacy
   * `role`-enum defaults.
   */
  @IsOptional()
  @IsString()
  @Length(0, 64)
  public readonly rbacRoleId?: string | null;

  /** Toggle the force-password-change flag without rotating the password. */
  @IsOptional()
  @IsBoolean()
  public readonly mustChangePassword?: boolean;
}

interface AdminListItem {
  readonly id: string;
  readonly username: string;
  readonly name: string | null;
  readonly role: UserRole;
  readonly isActive: boolean;
  readonly rbacRoleId: string | null;
  readonly rbacRoleName: string | null;
  readonly mustChangePassword: boolean;
  readonly twoFactorEnabled: boolean;
  readonly lastLoginAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

const adminProjection = Prisma.validator<Prisma.AdminUserSelect>()({
  id: true,
  login: true,
  name: true,
  role: true,
  isActive: true,
  rbacRoleId: true,
  mustChangePassword: true,
  totpEnabled: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  rbacRole: { select: { id: true, displayName: true } },
});

type AdminProjection = Prisma.AdminUserGetPayload<{ select: typeof adminProjection }>;

function toApi(admin: AdminProjection): AdminListItem {
  return {
    id: admin.id,
    username: admin.login,
    name: admin.name,
    role: admin.role,
    isActive: admin.isActive,
    rbacRoleId: admin.rbacRoleId,
    rbacRoleName: admin.rbacRole?.displayName ?? null,
    mustChangePassword: admin.mustChangePassword,
    twoFactorEnabled: admin.totpEnabled,
    lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
    createdAt: admin.createdAt.toISOString(),
    updatedAt: admin.updatedAt.toISOString(),
  };
}

@ApiTags('admin/admins')
@ApiBearerAuth('JWT')
@UseGuards(AdminJwtAuthGuard, RbacGuard)
@Controller('admin/admins')
export class AdminAdminsController {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly passwordHashService: PasswordHashService,
    private readonly rbacService: RbacService,
  ) {}

  @Get()
  @RequirePermission('admins', 'view')
  @ApiOperation({ summary: 'List all admin user accounts' })
  public async list(): Promise<readonly AdminListItem[]> {
    const records = await this.prismaService.adminUser.findMany({
      orderBy: [{ createdAt: 'desc' }],
      select: adminProjection,
    });
    return records.map(toApi);
  }

  @Post()
  @RequirePermission('admins', 'create')
  @ApiOperation({ summary: 'Create a new admin account' })
  public async create(
    @Body() dto: CreateAdminDto,
    @CurrentAdmin() currentAdmin: CurrentAdminInterface,
    @Req() request: Request,
  ): Promise<AdminListItem> {
    const sanitizedLogin = loginPolicy.sanitizeLogin(dto.username);
    if (!loginPolicy.isValidLogin(sanitizedLogin)) {
      throw new BadRequestException('Invalid login');
    }
    const normalizedLogin = loginPolicy.normalizeLogin(sanitizedLogin);

    const existing = await this.prismaService.adminUser.findUnique({
      where: { loginNormalized: normalizedLogin },
      select: { id: true },
    });
    if (existing !== null) {
      throw new ConflictException('Admin with this login already exists');
    }

    const rbacRoleId = normalizeRoleId(dto.rbacRoleId);
    if (rbacRoleId !== null) {
      await this.assertRbacRoleExists(rbacRoleId);
    }

    const passwordHash = await this.passwordHashService.hashPassword({
      plainTextPassword: dto.password,
    });

    const created = await this.prismaService.adminUser.create({
      data: {
        login: sanitizedLogin,
        loginNormalized: normalizedLogin,
        passwordHash,
        role: dto.role,
        name: dto.name?.trim() || null,
        isActive: true,
        rbacRoleId,
        mustChangePassword: dto.mustChangePassword ?? false,
        passwordChangedAt: new Date(),
      },
      select: adminProjection,
    });
    await this.audit(currentAdmin, request, 'admin.account.created', created.id, {
      login: created.login,
      role: created.role,
      rbacRoleId,
    });
    return toApi(created);
  }

  @Patch(':adminId')
  @RequirePermission('admins', 'edit')
  @ApiOperation({ summary: 'Update an admin account' })
  public async update(
    @Param('adminId') adminId: string,
    @Body() dto: UpdateAdminDto,
    @CurrentAdmin() currentAdmin: CurrentAdminInterface,
    @Req() request: Request,
  ): Promise<AdminListItem> {
    const target = await this.prismaService.adminUser.findUnique({
      where: { id: adminId },
      select: { id: true, role: true, isActive: true },
    });
    if (target === null) {
      throw new NotFoundException('Admin not found');
    }

    if (dto.isActive === false && currentAdmin.id === adminId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }
    // Lockout guard: never let the last active admin be deactivated.
    if (dto.isActive === false && target.isActive) {
      await this.assertNotLastActiveAdmin();
    }

    const data: Prisma.AdminUserUpdateInput = {};

    if (typeof dto.role !== 'undefined') {
      data.role = dto.role;
    }
    if (typeof dto.isActive === 'boolean') {
      data.isActive = dto.isActive;
    }
    if (typeof dto.name !== 'undefined') {
      data.name = dto.name.trim().length > 0 ? dto.name.trim() : null;
    }
    if (typeof dto.mustChangePassword === 'boolean') {
      data.mustChangePassword = dto.mustChangePassword;
    }
    // RBAC role (re)assignment. An empty string / null detaches the role;
    // a non-empty value must reference an existing role.
    if (typeof dto.rbacRoleId !== 'undefined') {
      const rbacRoleId = normalizeRoleId(dto.rbacRoleId);
      if (rbacRoleId !== null) {
        await this.assertRbacRoleExists(rbacRoleId);
        data.rbacRole = { connect: { id: rbacRoleId } };
      } else {
        data.rbacRole = { disconnect: true };
      }
    }
    if (typeof dto.password === 'string' && dto.password.length > 0) {
      data.passwordHash = await this.passwordHashService.hashPassword({
        plainTextPassword: dto.password,
      });
      data.passwordChangedAt = new Date();
      // Bump tokenVersion to invalidate any active session of this admin.
      data.tokenVersion = { increment: 1 };
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    const updated = await this.prismaService.adminUser.update({
      where: { id: adminId },
      data,
      select: adminProjection,
    });
    // A role/permission-affecting change must take effect immediately: drop
    // the cached permission set for this admin so the next request re-reads.
    this.rbacService.invalidateCacheForAdmin(adminId);
    await this.audit(currentAdmin, request, 'admin.account.updated', adminId, {
      login: updated.login,
      changed: Object.keys(data),
    });
    return toApi(updated);
  }

  @Delete(':adminId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('admins', 'delete')
  @ApiOperation({ summary: 'Delete (revoke) an admin account' })
  public async delete(
    @Param('adminId') adminId: string,
    @CurrentAdmin() currentAdmin: CurrentAdminInterface,
    @Req() request: Request,
  ): Promise<void> {
    if (currentAdmin.id === adminId) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    const target = await this.prismaService.adminUser.findUnique({
      where: { id: adminId },
      select: { id: true, login: true, isActive: true },
    });
    if (target === null) {
      throw new NotFoundException('Admin not found');
    }
    if (target.isActive) {
      await this.assertNotLastActiveAdmin();
    }
    await this.prismaService.adminUser.delete({ where: { id: adminId } });
    this.rbacService.invalidateCacheForAdmin(adminId);
    await this.audit(currentAdmin, request, 'admin.account.deleted', adminId, {
      login: target.login,
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private async assertRbacRoleExists(rbacRoleId: string): Promise<void> {
    const role = await this.prismaService.adminRole.findUnique({
      where: { id: rbacRoleId },
      select: { id: true },
    });
    if (role === null) {
      throw new BadRequestException('Assigned RBAC role does not exist');
    }
  }

  /**
   * Guards against locking everyone out: refuse the operation when the
   * target is the only remaining active admin account.
   */
  private async assertNotLastActiveAdmin(): Promise<void> {
    const activeCount = await this.prismaService.adminUser.count({ where: { isActive: true } });
    if (activeCount <= 1) {
      throw new ForbiddenException('Cannot remove the last active admin account');
    }
  }

  private async audit(
    actor: CurrentAdminInterface,
    request: Request,
    action: string,
    targetAdminId: string,
    extra: Prisma.InputJsonObject,
  ): Promise<void> {
    const metadata = extractRequestMetadata(request);
    await this.prismaService.adminAuditLog.create({
      data: {
        action,
        ipAddress: metadata.remoteAddress,
        userAgent: metadata.userAgent,
        metadata: {
          requestId: metadata.requestId,
          targetAdminId,
          actorLogin: actor.login,
          ...extra,
        },
        ...(actor.id ? { adminUser: { connect: { id: actor.id } } } : {}),
      },
    });
  }
}

/** Normalises an optional role-id input: trims, treats '' as detach (null). */
function normalizeRoleId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
