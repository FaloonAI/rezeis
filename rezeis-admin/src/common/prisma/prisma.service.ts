import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { resolveDbPoolMax, resolveResourceProfile } from '../runtime/resource-profile.util';

/**
 * Wraps the Prisma 7 client lifecycle for NestJS modules.
 *
 * Builds the connection string from individual DATABASE_* environment
 * variables (matching the `.env.example` layout). Falls back to
 * `DATABASE_URL` if set explicitly for backward compatibility.
 *
 * The connection-pool `max` is auto-sized to the container's resource budget
 * (see `resolveDbPoolMax`) so the same image runs well on a 1 GB VPS or a
 * 4 GB one; an explicit `DATABASE_POOL_SIZE` always overrides.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  public constructor() {
    super({
      adapter: new PrismaPg({
        connectionString: resolveDatabaseUrl(),
        max: resolveDbPoolMax(),
      }),
    });
  }

  public async onModuleInit(): Promise<void> {
    const profile = resolveResourceProfile();
    this.logger.log(
      `DB pool max=${resolveDbPoolMax()} ` +
        `(tier=${profile.tier}, memory=${profile.memoryBudgetMb}MiB/${profile.memorySource}, cpu=${profile.cpuBudget})`,
    );
    await this.$connect();
  }

  public async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

function resolveDatabaseUrl(): string {
  // Explicit DATABASE_URL takes precedence (backward compat)
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
    return process.env.DATABASE_URL;
  }
  const host = process.env.DATABASE_HOST ?? 'localhost';
  const port = process.env.DATABASE_PORT ?? '5432';
  const name = process.env.DATABASE_NAME ?? 'rezeis';
  const user = process.env.DATABASE_USER ?? 'rezeis';
  const password = encodeURIComponent(process.env.DATABASE_PASSWORD ?? '');
  return `postgresql://${user}:${password}@${host}:${port}/${name}`;
}
