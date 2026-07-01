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

const AUTH_URL = 'https://oauth.yandex.ru/authorize';
const TOKEN_URL = 'https://oauth.yandex.ru/token';
const INFO_URL = 'https://login.yandex.ru/info';

interface YandexTokenResponse {
  readonly access_token?: string;
}
interface YandexInfo {
  readonly id: string;
  readonly default_email?: string;
  readonly emails?: readonly string[];
  readonly real_name?: string;
  readonly display_name?: string;
  readonly login?: string;
  readonly is_avatar_empty?: boolean;
  readonly default_avatar_id?: string;
}

/** Yandex OAuth2 adapter (mailbox email — treated verified). */
@Injectable()
export class YandexOAuthAdapter implements OAuthProviderAdapter {
  public readonly provider = ExternalAuthProvider.YANDEX;

  public constructor(private readonly httpService: HttpService) {}

  public buildAuthorizationUrl(config: OAuthAdapterConfig, input: AuthorizeUrlInput): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: input.redirectUri,
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
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });
    if (input.codeVerifier) form.set('code_verifier', input.codeVerifier);

    const tokenResp = await firstValueFrom(
      this.httpService.post<YandexTokenResponse>(TOKEN_URL, form.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );
    const accessToken = tokenResp.data.access_token;
    if (!accessToken) throw new UnauthorizedException('Yandex token exchange failed');

    const infoResp = await firstValueFrom(
      this.httpService.get<YandexInfo>(`${INFO_URL}?format=json`, {
        headers: { Authorization: `OAuth ${accessToken}` },
      }),
    );
    const info = infoResp.data;
    const email = info.default_email ?? info.emails?.[0] ?? null;
    const avatarUrl =
      info.is_avatar_empty === false && info.default_avatar_id
        ? `https://avatars.yandex.net/get-yapic/${info.default_avatar_id}/islands-200`
        : null;
    return {
      provider: this.provider,
      providerUserId: info.id,
      email,
      emailVerified: email !== null,
      name: info.real_name ?? info.display_name ?? info.login ?? null,
      avatarUrl,
      rawProfile: { id: info.id, login: info.login, email },
    };
  }
}
