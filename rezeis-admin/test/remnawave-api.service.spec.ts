import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { of, throwError } from 'rxjs';

import { RemnawaveApiService } from '../src/modules/remnawave/services/remnawave-api.service';

describe('RemnawaveApiService', () => {
  it('maps auth status from the official Remnawave contract', async () => {
    const capturedPaths: string[] = [];
    const service = new RemnawaveApiService(
      {
        request: (input: { readonly url: string }) => {
          capturedPaths.push(input.url);
          return of({
            data: {
              response: {
                isLoginAllowed: true,
                isRegisterAllowed: false,
                authentication: {
                  passkey: { enabled: true },
                  oauth2: { providers: { github: true } },
                  password: { enabled: true },
                },
                branding: {
                  title: 'Panel',
                  logoUrl: null,
                },
              },
            },
          });
        },
      } as never,
      {
        host: 'remnawave',
        port: 3000,
        token: 'secret',
        webhookSecret: null,
        caddyToken: null,
        cookie: null,
      },
    );

    const actualStatus = await service.getStatus();

    assert.deepStrictEqual(capturedPaths, ['/api/auth/status']);
    assert.deepStrictEqual(actualStatus, {
      isConfigured: true,
      isReachable: true,
      isLoginAllowed: true,
      isRegisterAllowed: false,
      authentication: {
        passwordEnabled: true,
        passkeyEnabled: true,
        oauth2Providers: { github: true },
      },
      branding: {
        title: 'Panel',
        logoUrl: null,
      },
    });
  });

  it('returns an offline status snapshot when remnawave is not configured', async () => {
    const service = new RemnawaveApiService(
      { request: () => of({ data: {} }) } as never,
      {
        host: null,
        port: null,
        token: null,
        webhookSecret: null,
        caddyToken: null,
        cookie: null,
      },
    );

    assert.deepStrictEqual(await service.getStatus(), {
      isConfigured: false,
      isReachable: false,
      isLoginAllowed: null,
      isRegisterAllowed: null,
      authentication: null,
      branding: null,
    });
  });

  it('maps internal and external squad option payloads from Remnawave', async () => {
    const capturedPaths: string[] = [];
    const service = new RemnawaveApiService(
      {
        request: (input: { readonly url: string }) => {
          capturedPaths.push(input.url);
          if (input.url === '/api/internal-squads/') {
            return of({
              data: {
                response: {
                  total: 1,
                  internalSquads: [createInternalSquadPayload('11111111-1111-1111-1111-111111111111', 'Core')],
                },
              },
            });
          }
          return of({
            data: {
              response: {
                total: 1,
                externalSquads: [createExternalSquadPayload('22222222-2222-2222-2222-222222222222', 'Public')],
              },
            },
          });
        },
      } as never,
      {
        host: 'remnawave',
        port: 3000,
        token: 'secret',
        webhookSecret: null,
        caddyToken: null,
        cookie: null,
      },
    );

    const internalSquads = await service.getInternalSquadOptions();
    const externalSquads = await service.getExternalSquadOptions();

    assert.deepStrictEqual(capturedPaths, ['/api/internal-squads/', '/api/external-squads/']);
    assert.deepStrictEqual(internalSquads, [{ uuid: '11111111-1111-1111-1111-111111111111', name: 'Core' }]);
    assert.deepStrictEqual(externalSquads, [{ uuid: '22222222-2222-2222-2222-222222222222', name: 'Public' }]);
  });

  it('raises a stable service-unavailable error when remnawave is not configured or upstream fails', async () => {
    const unconfiguredService = new RemnawaveApiService(
      { request: () => of({ data: {} }) } as never,
      {
        host: null,
        port: null,
        token: null,
        webhookSecret: null,
        caddyToken: null,
        cookie: null,
      },
    );

    await assert.rejects(
      async () => {
        await unconfiguredService.getInternalSquadOptions();
      },
      {
        name: 'ServiceUnavailableException',
        message: 'Remnawave integration is not configured',
      },
    );

    const failingService = new RemnawaveApiService(
      { request: () => throwError(() => new Error('upstream failed')) } as never,
      {
        host: 'remnawave',
        port: 3000,
        token: 'secret',
        webhookSecret: null,
        caddyToken: null,
        cookie: null,
      },
    );

    await assert.rejects(
      async () => {
        await failingService.getExternalSquadOptions();
      },
      {
        name: 'ServiceUnavailableException',
        message: 'Remnawave integration is unavailable',
      },
    );
  });
});

function createInternalSquadPayload(uuid: string, name: string): Record<string, unknown> {
  return {
    uuid,
    viewPosition: 1,
    name,
    info: {
      membersCount: 0,
      inboundsCount: 0,
    },
    inbounds: [],
    createdAt: '2026-04-19T10:00:00.000Z',
    updatedAt: '2026-04-19T10:00:00.000Z',
  };
}

function createExternalSquadPayload(uuid: string, name: string): Record<string, unknown> {
  return {
    uuid,
    viewPosition: 1,
    name,
    info: {
      membersCount: 0,
    },
    templates: [],
    subscriptionSettings: null,
    hostOverrides: null,
    responseHeaders: {},
    hwidSettings: null,
    customRemarks: null,
    subpageConfigUuid: null,
    createdAt: '2026-04-19T10:00:00.000Z',
    updatedAt: '2026-04-19T10:00:00.000Z',
  };
}
