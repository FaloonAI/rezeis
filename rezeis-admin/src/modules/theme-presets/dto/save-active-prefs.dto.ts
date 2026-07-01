import { IsObject } from 'class-validator';

/**
 * Persists the admin's ACTIVE appearance selection. `prefs` is a client-owned,
 * opaque JSON object (the web store shapes: theme, glass, effects, density) —
 * the server stores it verbatim and never interprets it.
 */
export class SaveActivePrefsDto {
  @IsObject()
  public prefs!: Record<string, unknown>;
}
