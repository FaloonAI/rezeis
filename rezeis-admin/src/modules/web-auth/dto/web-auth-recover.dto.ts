import { IsString, Length } from 'class-validator';

/** Body for `POST /api/internal/web-auth/recover`. */
export class WebAuthRecoverDto {
  @IsString()
  @Length(3, 64)
  public readonly login!: string;
}
