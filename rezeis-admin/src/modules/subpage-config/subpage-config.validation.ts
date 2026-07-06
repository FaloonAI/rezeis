import { Prisma } from '@prisma/client';
import { z } from 'zod';

/**
 * SHALLOW structural validation of the subscription-page config.
 *
 * The authoritative, exhaustive schema (SubscriptionPageRawConfigSchema) lives
 * on the AGPL subpage side and re-validates every fetch. Here we only assert
 * the top-level shape so the admin panel can't persist obviously-broken JSON,
 * while staying free of the AGPL types package.
 *
 * `.passthrough()` preserves unknown/extra keys so future subpage schema
 * additions don't require an admin release.
 */
const localizedTextSchema = z
  .record(z.string().regex(/^[a-z]{2}$/), z.string())
  .refine((obj) => Object.keys(obj).length > 0, 'At least one language is required');

export const subpageConfigSchema = z
  .object({
    version: z.string().min(1),
    locales: z.array(z.string().min(2)).min(1, 'At least one locale is required'),
    brandingSettings: z
      .object({
        title: z.string(),
        logoUrl: z.string(),
        supportUrl: z.string(),
      })
      .passthrough(),
    uiConfig: z
      .object({
        subscriptionInfoBlockType: z.string(),
        installationGuidesBlockType: z.string(),
      })
      .passthrough(),
    baseSettings: z
      .object({
        metaTitle: z.string(),
        metaDescription: z.string(),
        showConnectionKeys: z.boolean(),
        hideGetLinkButton: z.boolean(),
      })
      .passthrough(),
    baseTranslations: z.record(z.string(), localizedTextSchema),
    svgLibrary: z.record(z.string(), z.string()),
    platforms: z.record(z.string(), z.unknown()),
  })
  .passthrough();

export type SubpageConfigPayload = z.infer<typeof subpageConfigSchema>;

/** Coerces a Prisma JSON column value into a plain object (never null/array). */
export function readJsonObject(value: Prisma.JsonValue | null): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
