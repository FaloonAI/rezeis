/**
 * SMTP configuration stored in Settings.systemNotifications.email JSON.
 */
export interface SmtpSettingsInterface {
  readonly enabled: boolean;
  readonly host: string | null;
  readonly port: number;
  readonly username: string | null;
  readonly password: string | null;
  readonly fromAddress: string;
  readonly fromName: string;
  readonly useTls: boolean;
  readonly useSsl: boolean;
}

/**
 * Branding data injected into email templates.
 * Pulled from Settings.brandingSettings + reiwa config.
 */
export interface EmailBrandingInterface {
  readonly serviceName: string;
  readonly logoUrl: string | null;
  readonly primaryColor: string;
  readonly supportEmail: string | null;
  readonly websiteUrl: string | null;
}

/**
 * Payload for sending an email via the queue.
 */
export interface SendEmailPayload {
  /** Recipient email address. */
  readonly to: string;
  /** Email subject line. */
  readonly subject: string;
  /** Notification template type (e.g. 'expires_in_3_days'). */
  readonly templateType: string;
  /** Template variables for placeholder substitution. */
  readonly variables: Record<string, string | number | null>;
  /** Optional override: raw HTML body (skips template rendering). */
  readonly rawHtml?: string;
}
