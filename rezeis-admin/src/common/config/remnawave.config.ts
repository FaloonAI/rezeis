import { registerAs } from '@nestjs/config';

interface RemnawaveConfiguration {
  readonly host: string | null;
  readonly port: number | null;
  readonly token: string | null;
  readonly webhookSecret: string | null;
  readonly caddyToken: string | null;
  readonly cookie: string | null;
}

export const remnawaveConfig = registerAs(
  'remnawave',
  (): RemnawaveConfiguration => ({
    host: normalizeOptionalString(process.env.REMNAWAVE_HOST),
    port: normalizeOptionalNumber(process.env.REMNAWAVE_PORT),
    token: normalizeOptionalString(process.env.REMNAWAVE_TOKEN),
    webhookSecret: normalizeOptionalString(process.env.REMNAWAVE_WEBHOOK_SECRET),
    caddyToken: normalizeOptionalString(process.env.REMNAWAVE_CADDY_TOKEN),
    cookie: normalizeOptionalString(process.env.REMNAWAVE_COOKIE),
  }),
);

function normalizeOptionalString(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function normalizeOptionalNumber(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}
