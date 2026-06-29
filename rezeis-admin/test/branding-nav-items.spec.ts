import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readBrandingSettings } from '../src/modules/settings/utils/branding-settings.util';
import {
  DEFAULT_BRANDING,
  NAV_DESTINATIONS,
} from '../src/modules/settings/interfaces/branding-settings.interface';

describe('readBrandingSettings — navItems', () => {
  it('returns the default nav when absent', () => {
    const branding = readBrandingSettings({});
    assert.deepStrictEqual(branding.navItems, DEFAULT_BRANDING.navItems);
  });

  it('always lists every destination exactly once (appends missing, hidden)', () => {
    const branding = readBrandingSettings({ navItems: [{ id: 'plans', visible: true }] });
    const ids = branding.navItems.map((i) => i.id);
    assert.deepStrictEqual([...ids].sort(), [...NAV_DESTINATIONS].sort());
    // No duplicates.
    assert.equal(new Set(ids).size, ids.length);
  });

  it('forces essentials (subscriptions, settings) visible even if set hidden', () => {
    const branding = readBrandingSettings({
      navItems: [
        { id: 'subscriptions', visible: false },
        { id: 'settings', visible: false },
      ],
    });
    const byId = Object.fromEntries(branding.navItems.map((i) => [i.id, i.visible]));
    assert.equal(byId['subscriptions'], true);
    assert.equal(byId['settings'], true);
  });

  it('dedupes repeated ids (first wins) and preserves order', () => {
    const branding = readBrandingSettings({
      navItems: [
        { id: 'plans', visible: true },
        { id: 'plans', visible: false },
        { id: 'devices', visible: true },
      ],
    });
    const order = branding.navItems.map((i) => i.id);
    assert.equal(order[0], 'plans');
    assert.equal(order[1], 'devices');
    const plans = branding.navItems.find((i) => i.id === 'plans');
    assert.equal(plans?.visible, true);
  });

  it('caps the visible count at 5 (overflow hidden, essentials exempt)', () => {
    const branding = readBrandingSettings({
      navItems: [
        { id: 'subscriptions', visible: true },
        { id: 'plans', visible: true },
        { id: 'referrals', visible: true },
        { id: 'devices', visible: true },
        { id: 'activity', visible: true },
        { id: 'promo', visible: true },
        { id: 'support', visible: true },
        { id: 'settings', visible: true },
      ],
    });
    const visible = branding.navItems.filter((i) => i.visible).map((i) => i.id);
    // Essentials always present.
    assert.ok(visible.includes('subscriptions'));
    assert.ok(visible.includes('settings'));
    // Cap honoured (essentials may push it to at most 5 + the trailing
    // essential), but never the whole list.
    assert.ok(visible.length <= 6);
    assert.ok(visible.length < 8);
  });

  it('ignores unknown destination ids', () => {
    const branding = readBrandingSettings({
      navItems: [{ id: 'hack', visible: true }, { id: 'plans', visible: true }],
    });
    assert.ok(!branding.navItems.some((i) => (i.id as string) === 'hack'));
    assert.ok(branding.navItems.some((i) => i.id === 'plans'));
  });
});
