import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/**
 * A user's explicit renewal-duration choice for one subscription. The
 * service validates `days` against the target plan's offered durations and
 * falls back to the original duration when the choice isn't available.
 */
export class RenewalDurationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public subscriptionId!: string;

  @IsInt()
  @Min(1)
  @Max(3650)
  public days!: number;
}

/**
 * Converts the wire-format duration choices into a `subscriptionId → days`
 * map for the renewal service. Later entries win on duplicate ids.
 */
export function toDurationMap(
  durations: readonly RenewalDurationDto[] | undefined,
): ReadonlyMap<string, number> | undefined {
  if (durations === undefined || durations.length === 0) {
    return undefined;
  }
  return new Map(durations.map((entry) => [entry.subscriptionId, entry.days]));
}
