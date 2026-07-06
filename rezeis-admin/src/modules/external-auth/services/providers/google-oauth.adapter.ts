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

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const DEFAULT_SCOPES = 'openid email profile';

interface GoogleTokenResponse {
  readonly access_token?: string;
}
interface GoogleUserinfo {
  readonly sub: string;
  readonly email?: string;
  readonly email_verified?: boolean;
  readonly name?: string;
  readonly picture?: string;
}

/** Google OIDC adapter (verified email via `email_verified`). */
@Injectable()
export class GoogleOAuthAdapter implements OAuthProviderAdapter {
  public readonly provider = ExternalAuthProvider.GOOGLE;

  public constructor(private readonly httpService: HttpService) {}

  public buildAuthorizationUrl(config: OAuthAdapterConfig, input: AuthorizeUrlInput): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: input.redirectUri,
      response_type: 'code',
      scope: config.scopes ?? DEFAULT_SCOPES,
      state: input.state,
      access_type: 'online',
      prompt: 'select_account',
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
    // PKCE all-or-nothing: only send the verifier when the config enabled PKCE
    // (a matching `code_challenge` was sent on authorize). Sending a verifier
    // without a challenge makes the token endpoint reject the exchange.
    if (config.usePkce && input.codeVerifier) form.set('code_verifier', input.codeVerifier);

    const tokenResp = await firstValueFrom(
      this.httpService.post<GoogleTokenResponse>(TOKEN_URL, form.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );
    const accessToken = tokenResp.data.access_token;
    if (!accessToken) throw new UnauthorizedException('Google token exchange failed');

    const infoResp = await firstValueFrom(
      this.httpService.get<GoogleUserinfo>(USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
    const info = infoResp.data;
    return {
      provider: this.provider,
      providerUserId: info.sub,
      email: info.email ?? null,
      emailVerified: info.email_verified === true,
      name: info.name ?? null,
      avatarUrl: info.picture ?? null,
      rawProfile: { sub: info.sub, email: info.email, name: info.name },
    };
  }
}
