/**
 * Platform branding texts — strongly-typed view over the
 * `Settings.platformPolicy` JSON column (an existing, previously-unused
 * column repurposed to hold these texts; no migration required).
 *
 * Distinct from `BrandingSettingsInterface` (visual branding: colors, logo,
 * card effects) which lives in `Settings.brandingSettings`. Keeping the two
 * in separate columns avoids the shape collision that caused the platform
 * settings save to 400.
 */
export interface VerificationTemplateLocales {
  readonly ru: string | null;
  readonly en: string | null;
}

export interface PlatformBrandingInterface {
  /** Project / brand name, substituted as `{project_name}` in templates. */
  readonly projectName: string | null;
  /** Browser document title for the Mini App / web cabinet. */
  readonly webTitle: string | null;
  /** Channel `@username` used to resolve the subscription-gate channel. */
  readonly channelUsername: string | null;
  /**
   * When `true` (default), channel membership is re-evaluated on each gated
   * entry point and a user who left is re-gated. When `false`, the gate is
   * enforced only until the user first passes it.
   */
  readonly channelRecheck: boolean;
  /**
   * When `true` (default), a Telegram-authenticated user who has no web
   * login/password yet must set them (claim / finish-setup) before entering
   * the cabinet — on both the web Telegram-widget sign-in and the Mini App.
   * When `false`, Telegram is accepted as a sufficient credential and such
   * users go straight to the cabinet.
   */
  readonly requireTelegramWebCredentials: boolean;
  readonly verification: {
    readonly telegramTemplate: VerificationTemplateLocales;
    readonly passwordResetTelegramTemplate: VerificationTemplateLocales;
  };
}

export const DEFAULT_PLATFORM_BRANDING: PlatformBrandingInterface = {
  projectName: null,
  webTitle: null,
  channelUsername: null,
  channelRecheck: true,
  requireTelegramWebCredentials: true,
  verification: {
    telegramTemplate: { ru: null, en: null },
    passwordResetTelegramTemplate: { ru: null, en: null },
  },
};
