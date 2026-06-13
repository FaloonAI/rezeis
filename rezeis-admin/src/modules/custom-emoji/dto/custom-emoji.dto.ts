import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class ImportBySetLinkDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  public packName?: string;

  @IsString()
  @MaxLength(256)
  public link!: string;
}

export class UpdateEmojiDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  public name?: string;

  @IsOptional()
  @ValidateIf((_o: object, v: unknown): boolean => v !== null)
  @IsString()
  @MaxLength(32)
  public fallback?: string | null;

  @IsOptional()
  @ValidateIf((_o: object, v: unknown): boolean => v !== null)
  @IsString()
  @MaxLength(32)
  public customEmojiId?: string | null;
}
