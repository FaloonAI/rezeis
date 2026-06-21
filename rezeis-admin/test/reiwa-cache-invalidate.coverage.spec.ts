import 'reflect-metadata';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RequestMethod } from '@nestjs/common';
import {
  INTERCEPTORS_METADATA,
  METHOD_METADATA,
} from '@nestjs/common/constants';

import { AdminBotConfigController } from '../src/modules/bot-config/controllers/admin-bot-config.controller';
import { AdminBotEmojiStudioController } from '../src/modules/bot-config/controllers/admin-bot-emoji-studio.controller';
import { ReiwaCacheInvalidateInterceptor } from '../src/modules/bot-config/interceptors/reiwa-cache-invalidate.interceptor';
import { AdminBotFlowController } from '../src/modules/bot-flow/controllers/admin-bot-flow.controller';
import { AdminBotMapController } from '../src/modules/bot-map/controllers/admin-bot-map.controller';

/**
 * Cache-bust contract guard (spec Requirement 9). Every mutating endpoint on a
 * controller that feeds the reiwa-cached `GET /api/internal/bot-config` payload
 * (menu buttons / emojis / texts / flow screens) MUST carry
 * `ReiwaCacheInvalidateInterceptor` so operator edits propagate to live bot
 * users. The read-only bot-map module carries no mutations and therefore needs
 * no interceptor.
 *
 * NOTE (deliberate scope): notification-template and broadcast controllers do
 * NOT feed this cached payload — reiwa never serves their data — so they are
 * intentionally excluded. rezeis delivers those itself; a cache-bust there
 * would be a wasteful no-op on the reiwa side.
 */

interface RouteHandler {
  readonly name: string;
  readonly fn: (...args: unknown[]) => unknown;
  readonly method: RequestMethod;
}

function routeHandlers(controller: new (...args: never[]) => object): RouteHandler[] {
  const proto = controller.prototype as Record<string, unknown>;
  const handlers: RouteHandler[] = []
  for (const name of Object.getOwnPropertyNames(proto)) {
    if (name === 'constructor') continue;
    const fn = proto[name];
    if (typeof fn !== 'function') continue;
    const method = Reflect.getMetadata(METHOD_METADATA, fn) as RequestMethod | undefined;
    if (method === undefined) continue;
    handlers.push({ name, fn: fn as RouteHandler['fn'], method });
  }
  return handlers;
}

function carriesCacheInterceptor(
  controller: new (...args: never[]) => object,
  handler: RouteHandler,
): boolean {
  const classLevel = (Reflect.getMetadata(INTERCEPTORS_METADATA, controller) ?? []) as unknown[];
  const methodLevel = (Reflect.getMetadata(INTERCEPTORS_METADATA, handler.fn) ?? []) as unknown[];
  return [...classLevel, ...methodLevel].some(
    (entry) =>
      entry === ReiwaCacheInvalidateInterceptor ||
      (entry as { constructor?: unknown })?.constructor === ReiwaCacheInvalidateInterceptor,
  );
}

const isMutating = (handler: RouteHandler): boolean => handler.method !== RequestMethod.GET;

/**
 * Handlers whose whole purpose is to bust the cache directly in the body
 * (they call `ReiwaCacheInvalidatorService.invalidate(...)` themselves), so the
 * interceptor would be redundant. Keyed by `Controller.handler`.
 */
const DIRECT_INVALIDATION_ALLOWLIST = new Set<string>([
  'AdminBotConfigController.refreshBot',
])

const CACHED_CONTRACT_CONTROLLERS = [
  AdminBotConfigController,
  AdminBotEmojiStudioController,
  AdminBotFlowController,
] as const;

describe('ReiwaCacheInvalidateInterceptor coverage', () => {
  for (const controller of CACHED_CONTRACT_CONTROLLERS) {
    it(`covers every mutating endpoint on ${controller.name}`, () => {
      const handlers = routeHandlers(controller);
      assert.ok(handlers.length > 0, `${controller.name} exposes no route handlers`);
      const uncovered = handlers
        .filter(isMutating)
        .filter((handler) => !DIRECT_INVALIDATION_ALLOWLIST.has(`${controller.name}.${handler.name}`))
        .filter((handler) => !carriesCacheInterceptor(controller, handler))
        .map((handler) => handler.name);
      assert.deepStrictEqual(
        uncovered,
        [],
        `${controller.name} mutating endpoints missing cache-bust: ${uncovered.join(', ')}`,
      );
    });
  }

  it('asserts at least one mutating endpoint is actually guarded (test is not vacuous)', () => {
    const mutating = CACHED_CONTRACT_CONTROLLERS.flatMap((controller) =>
      routeHandlers(controller).filter(isMutating),
    );
    assert.ok(mutating.length >= 3, 'expected several mutating bot-config endpoints');
  });

  it('keeps the bot-map module read-only (no mutations, no interceptor needed)', () => {
    const handlers = routeHandlers(AdminBotMapController);
    assert.ok(handlers.length > 0, 'bot-map controller exposes no routes');
    assert.deepStrictEqual(
      handlers.filter(isMutating).map((h) => h.name),
      [],
    );
  });
});
