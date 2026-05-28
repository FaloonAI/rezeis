import { IsString, Length } from 'class-validator';

/** Body for `POST /api/internal/web-auth/change-password`. */
export class WebAuthChangePasswordDto {
  @IsString()
  @Length(1, 256)
  public readonly userId!: string;

  @IsString()
  @Length(8, 256)
  public readonly currentPassword!: string;

  @IsString()
  @Length(8, 256)
  public readonly newPassword!: string;
}
