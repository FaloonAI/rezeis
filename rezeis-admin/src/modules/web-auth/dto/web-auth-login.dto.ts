import { IsString, Length } from 'class-validator';

/** Body for `POST /api/internal/web-auth/login`. */
export class WebAuthLoginDto {
  @IsString()
  @Length(3, 64)
  public readonly login!: string;

  @IsString()
  @Length(8, 256)
  public readonly password!: string;
}
