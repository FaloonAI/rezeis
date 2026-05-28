import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { InternalAdminAuthGuard } from '../../auth/guards/internal-admin-auth.guard';
import { WebAuthChangePasswordDto } from '../dto/web-auth-change-password.dto';
import { WebAuthLoginDto } from '../dto/web-auth-login.dto';
import { WebAuthRecoverDto } from '../dto/web-auth-recover.dto';
import { WebAuthRegisterDto } from '../dto/web-auth-register.dto';
import {
  WebAuthChangePasswordResultInterface,
  WebAuthLoginResultInterface,
  WebAuthRecoverResultInterface,
  WebAuthRegisterResultInterface,
} from '../interfaces/web-auth.interface';
import { WebAuthService } from '../services/web-auth.service';

/**
 * InternalWebAuthController
 * ─────────────────────────
 * Exposes the credential lifecycle reiwa drives from its SPA / Mini App.
 * Every endpoint returns a stable contract so the frontend can rely on
 * primitive `userId` strings without worrying about the underlying
 * Prisma surface area.
 */
@ApiTags('internal/web-auth')
@UseGuards(InternalAdminAuthGuard)
@Controller('internal/web-auth')
export class InternalWebAuthController {
  public constructor(private readonly webAuthService: WebAuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a WebAccount + (optionally) link to existing Telegram User' })
  public register(@Body() body: WebAuthRegisterDto): Promise<WebAuthRegisterResultInterface> {
    return this.webAuthService.register(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify login + password and return session flags' })
  public login(@Body() body: WebAuthLoginDto): Promise<WebAuthLoginResultInterface> {
    return this.webAuthService.login(body);
  }

  @Post('recover')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve recovery channel for a login (telegram / email / none)' })
  public recover(@Body() body: WebAuthRecoverDto): Promise<WebAuthRecoverResultInterface> {
    return this.webAuthService.recover(body);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the password after verifying the current one' })
  public changePassword(
    @Body() body: WebAuthChangePasswordDto,
  ): Promise<WebAuthChangePasswordResultInterface> {
    return this.webAuthService.changePassword(body);
  }
}
