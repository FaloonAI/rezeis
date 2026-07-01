import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ExternalAuthProvider } from '@prisma/client';

import { ExternalProviderConfigService } from '../src/modules/external-auth/services/external-provider-config.service';

interface Row {
  provider: ExternalAuthProvider;
  isEnabled: boolean;
  displayName: string;
  clientId: string | null;
  clientSecretEnc: string | null;
  usePkce: boolean;
  scopes: string | null;
}

function createService(current: Row | null) {
  const upserts: Array<{ create: unknown; update: unknown }> = [];
  const prisma = {
    externalAuthProviderConfig: {
      findUnique: async () => current,
      upsert: async (args: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
        upserts.push({ create: args.create, update: args.update });
        // Echo a plausible resulting row (merge current + create for new rows).
        const base = current ?? {
          provider: args.create.provider as ExternalAuthProvider,
          isEnabled: false,
          displayName: String(args.create.displayName ?? ''),
          clientId: null,
          clientSecretEnc: null,
          usePkce: true,
          scopes: null,
        };
        return {
          ...base,
          ...(args.create as Partial<Row>),
          ...(args.update as Partial<Row>),
        };
      },
    },
  };
  const cryptoService = {
    encrypt: (v: string) => `enc(${v})`,
    decrypt: (v: string) => v.replace(/^enc\(|\)$/g, ''),
  };
  const service = new ExternalProviderConfigService(prisma as never, cryptoService as never);
  return { service, upserts };
}

describe('ExternalProviderConfigService', () => {
  it('refuses to enable an OAuth provider without credentials', async () => {
    const { service } = createService(null);
    await assert.rejects(
      service.updateConfig(ExternalAuthProvider.GOOGLE, { isEnabled: true }),
      /requires a client id and client secret/,
    );
  });

  it('enables an OAuth provider when client id + secret are provided and encrypts the secret', async () => {
    const { service, upserts } = createService(null);
    const view = await service.updateConfig(ExternalAuthProvider.GOOGLE, {
      isEnabled: true,
      clientId: 'cid',
      clientSecret: 'topsecret',
    });
    assert.equal(view.isEnabled, true);
    assert.equal(view.hasSecret, true);
    // Secret is stored encrypted, never in plaintext.
    const created = upserts[0].create as { clientSecretEnc?: string };
    assert.equal(created.clientSecretEnc, 'enc(topsecret)');
  });

  it('allows enabling Telegram without any client credentials (reuses bot token)', async () => {
    const { service } = createService({
      provider: ExternalAuthProvider.TELEGRAM,
      isEnabled: false,
      displayName: 'Telegram',
      clientId: null,
      clientSecretEnc: null,
      usePkce: false,
      scopes: null,
    });
    const view = await service.updateConfig(ExternalAuthProvider.TELEGRAM, { isEnabled: true });
    assert.equal(view.isEnabled, true);
    assert.equal(view.usesBotToken, true);
  });

  it('decrypts the adapter config for an enabled OAuth provider', async () => {
    const { service } = createService({
      provider: ExternalAuthProvider.YANDEX,
      isEnabled: true,
      displayName: 'Yandex',
      clientId: 'yid',
      clientSecretEnc: 'enc(ysecret)',
      usePkce: true,
      scopes: null,
    });
    const cfg = await service.getEnabledAdapterConfig(ExternalAuthProvider.YANDEX);
    assert.equal(cfg.clientId, 'yid');
    assert.equal(cfg.clientSecret, 'ysecret');
  });

  it('rejects adapter config for a disabled provider', async () => {
    const { service } = createService({
      provider: ExternalAuthProvider.YANDEX,
      isEnabled: false,
      displayName: 'Yandex',
      clientId: 'yid',
      clientSecretEnc: 'enc(ysecret)',
      usePkce: true,
      scopes: null,
    });
    await assert.rejects(service.getEnabledAdapterConfig(ExternalAuthProvider.YANDEX));
  });
});
