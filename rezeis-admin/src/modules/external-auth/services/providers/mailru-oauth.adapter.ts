import { HttpService } from '@nestjs/axios';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ExternalAuthProvider } from '@prisma/client';
import { firstValueFrom } from 'rxjs';

import { ExternalUserProfile } from '../../interfaces/external-auth.interface';
import {
  AuthorizeUrlInput,
  ExchangeInput,
  OAuthAdapterConfig,
  OAuthProviderAdapter,
} from '../../interfaces/oauth-adapter.interface';

const AUTH_URL = 'https://oauth.mail.ru/login';
const TOKEN_URL = 'https://oauth.mail.ru/token';
const USERINFO_URL = 'https://oauth.mail.ru/userinfo';
const DEFAULT_SCOPES = 'userinfo';

interface MailruTokenResponse {
  readonly access_token?: string;
}
interface MailruUserinfo {
  readonly id?: string;
  readonly email?: string;
  readonly name?: string;
  readonly nickname?: string;
  readonly image?: string;
}

/** Mail.ru OAuth2 adapter (mailbox email — treated verified). */
@Injectable()
export class MailruOAuthAdapter implements OAuthProviderAdapter {
  public readonly provider = ExternalAuthProvider.MAILRU;

  public constructor(private readonly httpService: HttpService) {}

  public buildAuthorizationUrl(config: OAuthAdapterConfig, input: AuthorizeUrlInput): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: input.redirectUri,
      scope: config.scopes ?? DEFAULT_SCOPES,
      state: input.state,
    });
    if (config.usePkce && input.codeChallenge) {
      params.set('code_challenge', input.codeChallenge);
      params.set('code_challenge_method', 'S256');
    }
    return `${AUTH_URL}?${params.toString()}`;
  }

  public async exchange(config: OAuthAdapterConfig, input: ExchangeInput): Promise<ExternalUserProfile> {
    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code: input.code,
      redirect_uri: input.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });
    if (input.codeVerifier) form.set('code_verifier', input.codeVerifier);

    const tokenResp = await firstValueFrom(
      this.httpService.post<MailruTokenResponse>(TOKEN_URL, form.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );
    const accessToken = tokenResp.data.access_token;
    if (!accessToken) throw new UnauthorizedException('Mail.ru token exchange failed');

    const infoResp = await firstValueFrom(
      this.httpService.get<MailruUserinfo>(`${USERINFO_URL}?access_token=${encodeURIComponent(accessToken)}`),
    );
    const info = infoResp.data;
    const email = info.email ?? null;
    const providerUserId = info.id ?? email;
    if (!providerUserId) throw new UnauthorizedException('Mail.ru profile missing id');
    return {
      provider: this.provider,
      providerUserId,
      email,
      emailVerified: email !== null,
      name: info.name ?? info.nickname ?? null,
      avatarUrl: info.image ?? null,
      rawProfile: { id: info.id, email, nickname: info.nickname },
    };
  }
}
