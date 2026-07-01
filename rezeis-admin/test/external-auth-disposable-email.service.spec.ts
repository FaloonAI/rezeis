import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DisposableEmailService } from '../src/modules/external-auth/services/disposable-email.service';
import type { ExternalAuthPolicy } from '../src/modules/external-auth/interfaces/external-auth.interface';

function policy(overrides: Partial<ExternalAuthPolicy> = {}): ExternalAuthPolicy {
  return {
    mode: 'blocklist',
    customBlocklist: [],
    allowlist: [],
    gateProvidersByEmailModule: false,
    ...overrides,
  };
}

describe('DisposableEmailService', () => {
  const service = new DisposableEmailService();

  it('allows everything when mode is off', async () => {
    const result = await service.check('user@mailinator.com', policy({ mode: 'off' }));
    assert.deepStrictEqual(result, { allowed: true });
  });

  it('allows an empty email (absence validated elsewhere)', async () => {
    assert.deepStrictEqual(await service.check(null, policy()), { allowed: true });
    assert.deepStrictEqual(await service.check('', policy()), { allowed: true });
  });

  it('rejects a bundled disposable domain in blocklist mode', async () => {
    const result = await service.check('spammer@mailinator.com', policy({ mode: 'blocklist' }));
    assert.deepStrictEqual(result, { allowed: false, reason: 'disposable' });
  });

  it('rejects an operator custom-blocklist domain (case-insensitive)', async () => {
    const result = await service.check(
      'x@Bad-Domain.TLD',
      policy({ mode: 'blocklist', customBlocklist: ['bad-domain.tld'] }),
    );
    assert.deepStrictEqual(result, { allowed: false, reason: 'disposable' });
  });

  it('allows a normal domain in blocklist mode', async () => {
    const result = await service.check('user@gmail.com', policy({ mode: 'blocklist' }));
    assert.deepStrictEqual(result, { allowed: true });
  });

  it('allowlist mode accepts only listed domains', async () => {
    const p = policy({ mode: 'allowlist', allowlist: ['gmail.com', 'yandex.ru'] });
    assert.deepStrictEqual(await service.check('a@gmail.com', p), { allowed: true });
    assert.deepStrictEqual(await service.check('a@YANDEX.ru', p), { allowed: true });
    assert.deepStrictEqual(await service.check('a@proton.me', p), {
      allowed: false,
      reason: 'not_allowlisted',
    });
  });

  it('treats a malformed email as allowed (no domain to judge)', async () => {
    assert.deepStrictEqual(await service.check('not-an-email', policy()), { allowed: true });
  });
});
