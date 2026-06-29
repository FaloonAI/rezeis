import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * A user's explicit plan (tariff) choice for one subscription when renewing a
 * plan-less (panel-imported) subscription. The service validates `planId`
 * against the catalog targets offered for that subscription.
 */
export class RenewalPlanDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public subscriptionId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public planId!: string;
}

/**
 * Converts the wire-format plan choices into a `subscriptionId → planId` map
 * for the renewal service. Later entries win on duplicate ids.
 */
export function toPlanMap(
  plans: readonly RenewalPlanDto[] | undefined,
): ReadonlyMap<string, string> | undefined {
  if (plans === undefined || plans.length === 0) {
    return undefined;
  }
  return new Map(plans.map((entry) => [entry.subscriptionId, entry.planId]));
}
