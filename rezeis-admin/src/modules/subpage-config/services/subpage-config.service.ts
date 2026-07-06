import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { DEFAULT_SUBPAGE_CONFIG } from '../subpage-config.default';
import { readJsonObject, subpageConfigSchema } from '../subpage-config.validation';

/**
 * SubpageConfigService
 * ────────────────────
 * Owns the single global subscription-page config (branding, app catalog,
 * baseSettings, translations) that rezeis-subpage consumes. Stored as one
 * JSON blob in a singleton row (`subpage_configs.key = "default"`).
 *
 * rezeis-admin is the source of truth; the subpage fetches the effective
 * config from the internal endpoint and re-validates it against the full
 * (AGPL) schema on its side.
 */
@Injectable()
export class SubpageConfigService {
  private static readonly SINGLETON_KEY = 'default';

  private readonly logger = new Logger(SubpageConfigService.name);

  public constructor(private readonly prisma: PrismaService) {}

  /**
   * Effective config for the subpage / editor. Returns the stored config
   * when present, otherwise the bundled default (never null).
   */
  public async getEffectiveConfig(): Promise<Record<string, unknown>> {
    const row = await this.prisma.subpageConfig.findUnique({
      where: { key: SubpageConfigService.SINGLETON_KEY },
    });

    if (row === null) {
      return DEFAULT_SUBPAGE_CONFIG;
    }

    return readJsonObject(row.config);
  }

  /**
   * Replace the whole config. Shallow-validates the top-level shape (the
   * subpage re-validates fully). Returns the persisted config.
   */
  public async replaceConfig(input: unknown): Promise<Record<string, unknown>> {
    const parsed = subpageConfigSchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid subpage config',
        issues: parsed.error.issues.slice(0, 10),
      });
    }

    const config = parsed.data as Record<string, unknown>;

    await this.prisma.subpageConfig.upsert({
      where: { key: SubpageConfigService.SINGLETON_KEY },
      create: {
        key: SubpageConfigService.SINGLETON_KEY,
        config: config as Prisma.InputJsonValue,
      },
      update: {
        config: config as Prisma.InputJsonValue,
      },
    });

    this.logger.log('Subpage config updated.');
    return config;
  }

  /** True once an operator has saved a config (vs. serving the default). */
  public async hasStoredConfig(): Promise<boolean> {
    const count = await this.prisma.subpageConfig.count({
      where: { key: SubpageConfigService.SINGLETON_KEY },
    });
    return count > 0;
  }
}
