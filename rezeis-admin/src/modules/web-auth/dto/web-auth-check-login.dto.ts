import { IsString, Length } from 'class-validator';

/** Body for `POST /api/internal/web-auth/check-login`. */
export class WebAuthCheckLoginDto {
  @IsString()
  @Length(1, 64)
  public readonly login!: string;
}
