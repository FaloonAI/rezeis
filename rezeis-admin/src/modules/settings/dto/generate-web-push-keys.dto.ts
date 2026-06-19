import { IsEmail, MaxLength } from 'class-validator';

/**
 * Body for `POST /admin/settings/web-push/generate` — the operator-supplied
 * contact email becomes the VAPID `mailto:` subject (RFC 8292). The keypair
 * itself is generated server-side; the private key never leaves the backend.
 */
export class GenerateWebPushKeysDto {
  @IsEmail({}, { message: 'A valid contact email is required for VAPID' })
  @MaxLength(254)
  public readonly contactEmail!: string;
}
