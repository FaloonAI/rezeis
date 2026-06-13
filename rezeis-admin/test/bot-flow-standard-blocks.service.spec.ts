import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BotFlowService } from '../src/modules/bot-flow/services/bot-flow.service';

describe('BotFlowService standard blocks', () => {
  it('annotates standard blocks present/absent for a flow', async () => {
    const service = new BotFlowService({
      botFlow: {
        findUnique: async () => ({
          id: 'flow-1',
          status: 'DRAFT',
          screens: [{ shortId: 'sc_help', buttons: [] }],
        }),
      },
    } as never);

    const blocks = await service.getStandardBlocks('flow-1');
    const byKey = new Map(blocks.map((b) => [b.key, b.present] as const));
    assert.equal(byKey.get('sc_help'), true);
    assert.equal(byKey.get('sc_rules'), false);
    assert.equal(byKey.get('sc_invite'), false);
  });

  it('creates only the missing standard screens and never overwrites', async () => {
    const created: string[] = [];
    const service = new BotFlowService({
      botFlow: {
        findUnique: async () => ({
          id: 'flow-1',
          status: 'DRAFT',
          screens: [{ shortId: 'sc_help' }],
        }),
      },
      botFlowScreen: {
        create: async (args: { data: { shortId: string } }) => {
          created.push(args.data.shortId);
          return {};
        },
      },
    } as never);

    const result = await service.ensureStandardBlocks('flow-1');
    assert.equal(result.added, 2);
    assert.deepStrictEqual(created.sort(), ['sc_invite', 'sc_rules']);
    // The already-present sc_help must not be recreated.
    assert.equal(created.includes('sc_help'), false);
  });

  it('rejects ensuring blocks on a non-draft flow', async () => {
    const service = new BotFlowService({
      botFlow: {
        findUnique: async () => ({ id: 'flow-1', status: 'PUBLISHED', screens: [] }),
      },
    } as never);

    await assert.rejects(() => service.ensureStandardBlocks('flow-1'));
  });
});
