import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Panel-managed Remnawave expired-profile cleanup settings. Both fields are
 * optional — the SPA sends only what changed. Bounds mirror the merge clamps.
 *   - `deleteEnabled` — master switch for auto-deleting Remnawave profiles.
 *   - `graceDays`     — days after expiry before a profile is deleted (0–365).
 */
export class UpdateRemnawaveCleanupSettingsDto {
  @IsOptional()
  @IsBoolean()
  public readonly deleteEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  public readonly graceDays?: number;
}
