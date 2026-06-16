import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { InternalSystemEventsController } from '../src/modules/system-events-ingest/internal-system-events.controller';
import { ReportReiwaErrorDto } from '../src/modules/system-events-ingest/dto/report-reiwa-error.dto';

/**
 * reiwa error ingest → rezeis system event. Verifies the controller maps the
 * reiwa report onto the SystemEventsService at the right severity with a
 * `[reiwa:<source>]`-tagged message and metadata carrying source + stack.
 */
interface Recorded {
  level: 'error' | 'warning';
  type: string;
  category: string;
  message: string;
  metadata?: Record<string, unknown>;
}

function buildController(recorded: Recorded[]): InternalSystemEventsController {
  const events = {
    error: (type: string, category: string, message: string, metadata?: Record<string, unknown>) =>
      recorded.push({ level: 'error', type, category, message, metadata }),
    warn: (type: string, category: string, message: string, metadata?: Record<string, unknown>) =>
      recorded.push({ level: 'warning', type, category, message, metadata }),
  };
  return new InternalSystemEventsController(events as never);
}

describe('InternalSystemEventsController.reportError', () => {
  it('emits an ERROR system event with a reiwa-tagged message + metadata', () => {
    const recorded: Recorded[] = [];
    const controller = buildController(recorded);
    const res = controller.reportError({
      source: 'bot',
      message: 'Bot handler error',
      stack: 'at handler (x)',
      context: { scope: 'bot.catch' },
    } as ReportReiwaErrorDto);

    assert.deepEqual(res, { ok: true });
    assert.equal(recorded.length, 1);
    assert.equal(recorded[0].level, 'error');
    assert.equal(recorded[0].type, 'reiwa.error');
    assert.equal(recorded[0].category, 'SYSTEM');
    assert.equal(recorded[0].message, '[reiwa:bot] Bot handler error');
    assert.equal(recorded[0].metadata?.source, 'bot');
    assert.equal(recorded[0].metadata?.scope, 'bot.catch');
    assert.equal(recorded[0].metadata?.stack, 'at handler (x)');
  });

  it('emits a WARNING system event when level=warning', () => {
    const recorded: Recorded[] = [];
    const controller = buildController(recorded);
    controller.reportError({
      source: 'api',
      message: 'degraded',
      level: 'warning',
    } as ReportReiwaErrorDto);

    assert.equal(recorded.length, 1);
    assert.equal(recorded[0].level, 'warning');
    assert.equal(recorded[0].message, '[reiwa:api] degraded');
  });
});
