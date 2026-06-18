import 'reflect-metadata';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AdminFraudController } from '../src/modules/anti-fraud/controllers/admin-fraud.controller';
import {
  REQUIRE_PERMISSION_KEY,
  RequiredPermission,
} from '../src/modules/rbac/decorators/require-permission.decorator';
import { RBAC_ACTIONS, RBAC_RESOURCES } from '../src/modules/rbac/rbac.resources';

function permissionOf(method: string): readonly RequiredPermission[] {
  const proto = AdminFraudController.prototype as unknown as Record<string, unknown>;
  return (Reflect.getMetadata(REQUIRE_PERMISSION_KEY, proto[method] as object) ??
    []) as readonly RequiredPermission[];
}

describe('anti-fraud RBAC wiring', () => {
  it('registers the enforce action in the catalog and on the fraud_signals resource', () => {
    assert.ok(RBAC_ACTIONS.includes('enforce'));
    assert.ok(RBAC_RESOURCES.fraud_signals.includes('enforce'));
  });

  it('guards the enforce endpoint with fraud_signals:enforce', () => {
    assert.deepEqual(permissionOf('enforce'), [
      { resource: 'fraud_signals', action: 'enforce' },
    ]);
  });

  it('keeps read/resolve permissions on the other endpoints', () => {
    assert.deepEqual(permissionOf('listSignals'), [
      { resource: 'fraud_signals', action: 'view' },
    ]);
    assert.deepEqual(permissionOf('getTopOffenders'), [
      { resource: 'fraud_signals', action: 'view' },
    ]);
    assert.deepEqual(permissionOf('transition'), [
      { resource: 'fraud_signals', action: 'resolve' },
    ]);
  });
});
