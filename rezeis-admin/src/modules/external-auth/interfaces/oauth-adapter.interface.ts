import { ExternalAuthProvider } from '@prisma/client';

import { ExternalUserProfile } from './external-auth.interface';

/** Decrypted provider credentials + settings passed to an adapter. */
export interface OAuthAdapterConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly usePkce: boolean;
  readonly scopes: string | null;
}

/** Inputs for building the authorization redirect. */
export interface AuthorizeUrlInput {
  readonly state: string;
  readonly redirectUri: string;
  /** PKCE S256 challenge (present when the provider config enables PKCE). */
  readonly codeChallenge?: string;
}

/** Inputs for exchanging the authorization code for a profile. */
export interface ExchangeInput {
  readonly code: string;
  readonly redirectUri: string;
  /** PKCE verifier matching the earlier challenge. */
  readonly codeVerifier?: string;
}

/**
 * Authorization-code OAuth2/OIDC provider adapter. Each concrete adapter knows
 * one provider's endpoints and normalizes the result into `ExternalUserProfile`.
 */
export interface OAuthProviderAdapter {
  readonly provider: ExternalAuthProvider;
  buildAuthorizationUrl(config: OAuthAdapterConfig, input: AuthorizeUrlInput): string;
  exchange(config: OAuthAdapterConfig, input: ExchangeInput): Promise<ExternalUserProfile>;
}
