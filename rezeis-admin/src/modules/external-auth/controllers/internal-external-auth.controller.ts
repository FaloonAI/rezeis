import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { InternalAdminAuthGuard } from '../../auth/guards/internal-admin-auth.guard';
import {
  AuthorizeUrlDto,
  FinishSetupDto,
  OAuthResolveDto,
  TelegramResolveDto,
} from '../dto/internal-external-auth.dto';
import {
  ExternalAuthResolution,
  PublicExternalProvider,
} from '../interfaces/external-auth.interface';
import { ExternalAuthService } from '../services/external-auth.service';
import { ExternalProviderConfigService } from '../services/external-provider-config.service';

/**
 * reiwa-facing external-auth surface (protected by `InternalAdminAuthGuard`).
 *
 * reiwa builds the browser redirect from `authorize-url`, exchanges OAuth codes
 * via `oauth/resolve`, and (having already HMAC-verified the Telegram widget
 * with the bot token it owns) resolves Telegram via `telegram/resolve`. All
 * client secrets stay on rezeis.
 */
@ApiTags('internal/ext-auth')
@UseGuards(InternalAdminAuthGuard)
@Controller('internal/ext-auth')
export class InternalExternalAuthController {
  public constructor(
    private readonly externalAuthService: ExternalAuthService,
    private readonly configService: ExternalProviderConfigService,
  ) {}

  @Get('providers')
  @ApiOperation({ summary: 'Enabled external providers for the web cabinet' })
  public async providers(): Promise<PublicExternalProvider[]> {
    return this.configService.getEnabledProviders();
  }

  @Post('authorize-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Build the provider authorization redirect URL' })
  public async authorizeUrl(@Body() body: AuthorizeUrlDto): Promise<{ url: string }> {
    const url = await this.externalAuthService.buildAuthorizationUrl(body.provider, {
      state: body.state,
      redirectUri: body.redirectUri,
      codeChallenge: body.codeChallenge,
    });
    return { url };
  }

  @Post('oauth/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange an OAuth code and resolve the account decision' })
  public async oauthResolve(@Body() body: OAuthResolveDto): Promise<ExternalAuthResolution> {
    return this.externalAuthService.resolveOAuth(body.provider, {
      code: body.code,
      redirectUri: body.redirectUri,
      codeVerifier: body.codeVerifier,
    });
  }

  @Post('telegram/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve a reiwa-verified Telegram identity' })
  public async telegramResolve(@Body() body: TelegramResolveDto): Promise<ExternalAuthResolution> {
    return this.externalAuthService.resolveTelegram({
      providerUserId: body.providerUserId,
      name: body.name ?? null,
    });
  }

  @Post('finish-setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set the mandatory login + password after external registration' })
  public async finishSetup(@Body() body: FinishSetupDto): Promise<{ ok: true }> {
    return this.externalAuthService.finishSetup({
      userId: body.userId,
      login: body.login,
      passwordHash: body.passwordHash,
    });
  }
}
