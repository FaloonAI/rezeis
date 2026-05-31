/**
 * Reads and merges the `Settings.brandingSettings` JSON column into a typed
 * `BrandingSettingsInterface`, supplying safe defaults for any missing fields.
 *
 * The persisted JSON is always merged on top of `DEFAULT_BRANDING`, so the
 * caller can reason about a complete object regardless of how recently the
 * row was migrated.
 */

import {
  BG_EFFECTS,
  BgEffect,
  BrandingSettingsInterface,
  CARD_EFFECTS,
  CARD_LOGO_PRESETS,
  CardEffect,
  CardLogoPreset,
  DEFAULT_BRANDING,
  ICON_COLOR_MODES,
  IconColorMode,
} from '../interfaces/branding-settings.interface';

/** Hex colour validation: 3, 4, 6 or 8 hex chars after a leading `#`. */
const HEX_PATTERN = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function readBrandingSettings(value: unknown): BrandingSettingsInterface {
  const record = readRecord(value);
  return {
    brandName: readString(record, 'brandName', DEFAULT_BRANDING.brandName),
    logoUrl: readNullableString(record, 'logoUrl'),
    primary: readHex(record, 'primary', DEFAULT_BRANDING.primary),
    primaryFg: readHex(record, 'primaryFg', DEFAULT_BRANDING.primaryFg),
    bgPrimary: readHex(record, 'bgPrimary', DEFAULT_BRANDING.bgPrimary),
    bgSecondary: readHex(record, 'bgSecondary', DEFAULT_BRANDING.bgSecondary),
    cardGradient: readString(record, 'cardGradient', DEFAULT_BRANDING.cardGradient),
    cardPattern: readNullableString(record, 'cardPattern'),
    cardLogo: readCardLogo(record, DEFAULT_BRANDING.cardLogo),
    cardLogoUrl: readNullableString(record, 'cardLogoUrl'),
    cardEffect: readCardEffect(record, DEFAULT_BRANDING.cardEffect),
    cardEffectProps: readJsonRecord(record, 'cardEffectProps'),
    cardEffectOpacity: readClampedNumber(record, 'cardEffectOpacity', 0.05, 1, DEFAULT_BRANDING.cardEffectOpacity),
    bgEffect: readBgEffect(record, DEFAULT_BRANDING.bgEffect),
    iconColorMode: readIconColorMode(record, DEFAULT_BRANDING.iconColorMode),
    iconColors: readHexMap(record, 'iconColors'),
    borderRadius: readString(record, 'borderRadius', DEFAULT_BRANDING.borderRadius),
    fontFamily: readString(record, 'fontFamily', DEFAULT_BRANDING.fontFamily),
  };
}

/**
 * Merges a partial branding patch over the existing JSON value, returning a
 * shape suitable for storing in `Prisma.InputJsonValue`. Any field not present
 * on the patch is left untouched (existing value preserved).
 */
export function mergeBrandingSettings(input: {
  readonly existing: unknown;
  readonly patch: Partial<BrandingSettingsInterface>;
}): Record<string, unknown> {
  const current = readBrandingSettings(input.existing);
  const merged: Record<string, unknown> = { ...current };
  for (const key of Object.keys(input.patch) as Array<keyof BrandingSettingsInterface>) {
    const value = input.patch[key];
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(
  record: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const value = record[key];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return fallback;
}

function readNullableString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return null;
}

function readHex(
  record: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const value = record[key];
  if (typeof value === 'string' && HEX_PATTERN.test(value.trim())) {
    return value.trim();
  }
  return fallback;
}

function readBgEffect(
  record: Record<string, unknown>,
  fallback: BgEffect,
): BgEffect {
  const value = record['bgEffect'];
  if (typeof value === 'string') {
    const upper = value.toUpperCase() as BgEffect;
    if ((BG_EFFECTS as readonly string[]).includes(upper)) {
      return upper;
    }
  }
  return fallback;
}

function readCardLogo(
  record: Record<string, unknown>,
  fallback: CardLogoPreset,
): CardLogoPreset {
  const value = record['cardLogo'];
  if (typeof value === 'string') {
    const upper = value.toUpperCase() as CardLogoPreset;
    if ((CARD_LOGO_PRESETS as readonly string[]).includes(upper)) {
      return upper;
    }
  }
  return fallback;
}

function readCardEffect(
  record: Record<string, unknown>,
  fallback: CardEffect,
): CardEffect {
  const value = record['cardEffect'];
  if (typeof value === 'string' && (CARD_EFFECTS as readonly string[]).includes(value)) {
    return value as CardEffect;
  }
  return fallback;
}

function readIconColorMode(
  record: Record<string, unknown>,
  fallback: IconColorMode,
): IconColorMode {
  const value = record['iconColorMode'];
  if (typeof value === 'string' && (ICON_COLOR_MODES as readonly string[]).includes(value)) {
    return value as IconColorMode;
  }
  return fallback;
}

/**
 * Reads a `{ key: hexColor }` map, keeping only string values that pass hex
 * validation. Defends the SPA against malformed/oversized payloads (the values
 * are injected into inline styles, so we never store non-hex strings).
 */
function readHexMap(
  record: Record<string, unknown>,
  key: string,
): Record<string, string> {
  const value = record[key];
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'string' && HEX_PATTERN.test(v.trim())) {
      out[k] = v.trim();
    }
  }
  return out;
}

function readJsonRecord(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = record[key];
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function readClampedNumber(
  record: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
  fallback: number,
): number {
  const value = record[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(Math.max(value, min), max);
  }
  return fallback;
}
