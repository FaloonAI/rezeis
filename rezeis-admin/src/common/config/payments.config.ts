import { registerAs } from '@nestjs/config';

interface PaymentsConfiguration {
  readonly adminPublicBaseUrl: string | null;
  readonly ruidPublicWebUrl: string | null;
  readonly botToken: string | null;
}

function normalizeOptionalString(value: string | undefined): string | null {
  const normalizedValue = value?.trim() ?? '';
  return normalizedValue === '' ? null : normalizedValue;
}

export const paymentsConfig = registerAs(
  'payments',
  (): PaymentsConfiguration => ({
    adminPublicBaseUrl: normalizeOptionalString(process.env.REZEIS_ADMIN_PUBLIC_BASE_URL),
    ruidPublicWebUrl: normalizeOptionalString(process.env.RUID_PUBLIC_WEB_URL),
    botToken: normalizeOptionalString(process.env.BOT_TOKEN),
  }),
);
