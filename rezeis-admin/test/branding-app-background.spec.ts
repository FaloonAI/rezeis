import assert from 'node:assert/strict';
import test from 'node:test';

import {
  readBrandingSettings,
  mergeBrandingSettings,
} from '../src/modules/settings/utils/branding-settings.util';
import { DEFAULT_BRANDING } from '../src/modules/settings/interfaces/branding-settings.interface';

test('readBrandingSettings defaults appBackground to NONE when absent', () => {
  const branding = readBrandingSettings(null);
  assert.deepEqual(branding.appBackground, { effect: 'NONE', props: {}, opacity: 1 });
});

test('readBrandingSettings round-trips a valid appBackground block', () => {
  const branding = readBrandingSettings({
    appBackground: { effect: 'aurora', props: { speed: 2 }, opacity: 0.5 },
  });
  assert.equal(branding.appBackground.effect, 'aurora');
  assert.deepEqual(branding.appBackground.props, { speed: 2 });
  assert.equal(branding.appBackground.opacity, 0.5);
});

test('readBrandingSettings rejects an unknown effect id (→ NONE)', () => {
  const branding = readBrandingSettings({
    appBackground: { effect: 'not-a-real-effect', props: {}, opacity: 1 },
  });
  assert.equal(branding.appBackground.effect, 'NONE');
});

test('readBrandingSettings clamps appBackground opacity into [0.05, 1]', () => {
  const tooHigh = readBrandingSettings({
    appBackground: { effect: 'silk', props: {}, opacity: 5 },
  });
  assert.equal(tooHigh.appBackground.opacity, 1);

  const tooLow = readBrandingSettings({
    appBackground: { effect: 'silk', props: {}, opacity: 0 },
  });
  assert.equal(tooLow.appBackground.opacity, 0.05);
});

test('readBrandingSettings ignores a non-object appBackground (→ default)', () => {
  const branding = readBrandingSettings({ appBackground: 'oops' });
  assert.deepEqual(branding.appBackground, DEFAULT_BRANDING.appBackground);
});

test('mergeBrandingSettings preserves an unrelated existing appBackground', () => {
  const existing = {
    appBackground: { effect: 'galaxy', props: {}, opacity: 0.8 },
  };
  const merged = mergeBrandingSettings({ existing, patch: { brandName: 'Acme' } });
  const reread = readBrandingSettings(merged);
  assert.equal(reread.appBackground.effect, 'galaxy');
  assert.equal(reread.brandName, 'Acme');
});

test('mergeBrandingSettings overwrites appBackground when patched', () => {
  const existing = {
    appBackground: { effect: 'galaxy', props: {}, opacity: 0.8 },
  };
  const merged = mergeBrandingSettings({
    existing,
    patch: { appBackground: { effect: 'NONE', props: {}, opacity: 1 } },
  });
  const reread = readBrandingSettings(merged);
  assert.equal(reread.appBackground.effect, 'NONE');
});
