import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { classifyTier, resolveDbPoolMax } from '../src/common/runtime/resource-profile.util';

describe('resource-profile.util', () => {
  describe('classifyTier', () => {
    it('classifies a 1 GB budget as small', () => {
      assert.equal(classifyTier(1024), 'small');
    });

    it('classifies a 2 GB budget as medium', () => {
      assert.equal(classifyTier(2048), 'medium');
    });

    it('treats the 1.5 GB boundary as medium (small is exclusive)', () => {
      assert.equal(classifyTier(1536), 'medium');
    });

    it('classifies a 4 GB budget as large', () => {
      assert.equal(classifyTier(4096), 'large');
    });

    it('treats the 3 GB boundary as large (medium is exclusive)', () => {
      assert.equal(classifyTier(3072), 'large');
    });
  });

  describe('resolveDbPoolMax', () => {
    it('honours an explicit DATABASE_POOL_SIZE override', () => {
      assert.equal(resolveDbPoolMax({ DATABASE_POOL_SIZE: '15' } as NodeJS.ProcessEnv), 15);
    });

    it('ignores a blank override and falls back to auto-sizing', () => {
      const result = resolveDbPoolMax({ DATABASE_POOL_SIZE: '   ' } as NodeJS.ProcessEnv);
      assert.ok([5, 10, 20].includes(result));
    });

    it('ignores a non-positive / invalid override and auto-sizes', () => {
      const zero = resolveDbPoolMax({ DATABASE_POOL_SIZE: '0' } as NodeJS.ProcessEnv);
      const bogus = resolveDbPoolMax({ DATABASE_POOL_SIZE: 'abc' } as NodeJS.ProcessEnv);
      assert.ok([5, 10, 20].includes(zero));
      assert.ok([5, 10, 20].includes(bogus));
    });

    it('auto-sizes when the override is absent', () => {
      const result = resolveDbPoolMax({} as NodeJS.ProcessEnv);
      assert.ok([5, 10, 20].includes(result));
    });
  });
});
