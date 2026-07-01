import { ExternalAuthProvider } from '@prisma/client';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const OAUTH_PROVIDERS: readonly ExternalAuthProvider[] = [
  ExternalAuthProvider.GOOGLE,
  ExternalAuthProvider.YANDEX,
  ExternalAuthProvider.MAILRU,
];

/** Build an OAuth authorization URL for the BFF `/start` redirect. */
export class AuthorizeUrlDto {
  @IsIn(OAUTH_PROVIDERS as readonly string[])
  public provider!: ExternalAuthProvider;

  @IsString()
  @MinLength(8)
  @MaxLength(256)
  public state!: string;

  @IsString()
  @MaxLength(512)
  public redirectUri!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  public codeChallenge?: string;
}

/** Exchange an OAuth authorization code and resolve the profile. */
export class OAuthResolveDto {
  @IsIn(OAUTH_PROVIDERS as readonly string[])
  public provider!: ExternalAuthProvider;

  @IsString()
  @MaxLength(2048)
  public code!: string;

  @IsString()
  @MaxLength(512)
  public redirectUri!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  public codeVerifier?: string;
}

/** Resolve a Telegram identity already HMAC-verified by reiwa. */
export class TelegramResolveDto {
  @IsString()
  @Matches(/^\d+$/, { message: 'providerUserId must be a numeric Telegram id' })
  @MaxLength(32)
  public providerUserId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  public name?: string;
}

/** Set the mandatory login + password after external registration. */
export class FinishSetupDto {
  @Matches(/^c[a-z0-9]{20,}$/i, { message: 'userId must be a reiwa_id (CUID)' })
  public userId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(64)
  public login!: string;

  @IsString()
  @Matches(/^[a-f0-9]{64}$/i, { message: 'passwordHash must be a 64-char SHA-256 hex string' })
  public passwordHash!: string;
}
