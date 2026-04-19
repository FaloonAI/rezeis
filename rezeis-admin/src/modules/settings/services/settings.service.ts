import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, BadRequestException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { Prisma, Settings } from '@prisma/client';
import { ConfigType } from '@nestjs/config';

import { paymentsConfig } from '../../../common/config/payments.config';
import {
  PaymentOpsAlertSettingsInterface,
} from '../../../common/interfaces/payment-ops-alert-settings.interface';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  mergePaymentOpsAlertSettings,
  readPaymentOpsAlertSettings,
} from '../../../common/utils/payment-ops-alert-settings.util';
import { CurrentAdminInterface } from '../../auth/interfaces/current-admin.interface';
import { RequestMetadataInterface } from '../../auth/interfaces/request-metadata.interface';
import {
  SendPaymentOpsAlertTestDto,
  UpdatePaymentOpsAlertSettingsDto,
} from '../dto/update-payment-ops-alert-settings.dto';
import { UpdatePlatformSettingsDto } from '../dto/update-platform-settings.dto';
import { InternalPlatformPolicyInterface } from '../interfaces/internal-platform-policy.interface';
import { PlatformSettingsInterface } from '../interfaces/platform-settings.interface';

interface UpdatePlatformSettingsInput {
  readonly currentAdmin: CurrentAdminInterface;
  readonly requestMetadata: RequestMetadataInterface;
  readonly updatePlatformSettingsDto: UpdatePlatformSettingsDto;
}

interface UpdatePaymentOpsAlertSettingsInput {
  readonly currentAdmin: CurrentAdminInterface;
  readonly requestMetadata: RequestMetadataInterface;
  readonly updatePaymentOpsAlertSettingsDto: UpdatePaymentOpsAlertSettingsDto;
}

interface SendPaymentOpsAlertTestInput {
  readonly currentAdmin: CurrentAdminInterface;
  readonly requestMetadata: RequestMetadataInterface;
  readonly sendPaymentOpsAlertTestDto: SendPaymentOpsAlertTestDto;
}

interface UpdatePlatformSettingsChanges {
  readonly updatedFields: readonly string[];
  readonly data: Prisma.SettingsUpdateInput;
}

type SettingsClient = Prisma.TransactionClient | PrismaService;

const DEFAULT_INTERNAL_PLATFORM_POLICY: InternalPlatformPolicyInterface = {
  rulesRequired: true,
  rulesLink: null,
  channelRequired: false,
  channelLink: null,
  accessMode: 'PUBLIC',
  inviteModeStartedAt: null,
  defaultCurrency: 'USD',
};

/**
 * Handles singleton platform settings reads and updates.
 */
@Injectable()
export class SettingsService {
  public constructor(
    private readonly prismaService: PrismaService,
    @Optional()
    private readonly httpService?: HttpService,
    @Inject(paymentsConfig.KEY)
    @Optional()
    private readonly paymentConfiguration?: ConfigType<typeof paymentsConfig>,
  ) {}

  /**
   * Returns the singleton platform settings record, creating defaults when missing.
   */
  public async getPlatformSettings(): Promise<PlatformSettingsInterface> {
    const settings: Settings = await this.getOrCreateSettingsRecord(this.prismaService);
    return mapPlatformSettings(settings);
  }

  public async getPaymentOpsAlertSettings(): Promise<PaymentOpsAlertSettingsInterface> {
    const settings = await this.getOrCreateSettingsRecord(this.prismaService);
    return readPaymentOpsAlertSettings(settings.systemNotifications);
  }

  public async updatePaymentOpsAlertSettings(
    input: UpdatePaymentOpsAlertSettingsInput,
  ): Promise<PaymentOpsAlertSettingsInterface> {
    const settings = await this.prismaService.$transaction(
      async (transactionClient: Prisma.TransactionClient): Promise<Settings> => {
        const existingSettings = await this.getOrCreateSettingsRecord(transactionClient);
        const nextSystemNotifications = mergePaymentOpsAlertSettings({
          systemNotifications: existingSettings.systemNotifications,
          patch: input.updatePaymentOpsAlertSettingsDto,
        });
        const nextAlertSettings = readPaymentOpsAlertSettings(nextSystemNotifications);
        validatePaymentOpsAlertSettings(nextAlertSettings);

        const updatedSettings = await transactionClient.settings.update({
          where: { id: existingSettings.id },
          data: {
            systemNotifications: nextSystemNotifications as Prisma.InputJsonValue,
          },
        });
        await transactionClient.adminAuditLog.create({
          data: {
            action: 'settings.paymentOpsAlert.updated',
            ipAddress: input.requestMetadata.remoteAddress,
            userAgent: input.requestMetadata.userAgent,
            metadata: buildAuditMetadata({
              requestId: input.requestMetadata.requestId,
              updatedFields: extractUpdatedPaymentOpsFields(
                input.updatePaymentOpsAlertSettingsDto,
              ),
            }),
            adminUser: { connect: { id: input.currentAdmin.id } },
          },
        });
        return updatedSettings;
      },
    );
    return readPaymentOpsAlertSettings(settings.systemNotifications);
  }

  public async sendPaymentOpsAlertTest(
    input: SendPaymentOpsAlertTestInput,
  ): Promise<void> {
    const settings = await this.getPaymentOpsAlertSettings();
    if (settings.chatId === null) {
      throw new BadRequestException('PAYMENT_OPS_ALERT_CHAT_NOT_CONFIGURED');
    }
    const botToken = this.paymentConfiguration?.botToken ?? null;
    if (botToken === null) {
      throw new ServiceUnavailableException('BOT_TOKEN is not configured');
    }
    if (this.httpService === undefined) {
      throw new ServiceUnavailableException('HTTP client is not configured');
    }
    const message = buildPaymentOpsAlertTestMessage({
      settings,
      note: input.sendPaymentOpsAlertTestDto.note ?? null,
      adminId: input.currentAdmin.id,
    });
    const payload: Record<string, unknown> = {
      chat_id: settings.chatId,
      text: message,
      disable_web_page_preview: true,
    };
    if (settings.threadId !== null) {
      payload.message_thread_id = Number(settings.threadId);
    }
    await firstValueFrom(
      this.httpService.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        payload,
      ),
    );
    await this.prismaService.adminAuditLog.create({
      data: {
        action: 'payments.alert.test.sent',
        ipAddress: input.requestMetadata.remoteAddress,
        userAgent: input.requestMetadata.userAgent,
        metadata: {
          requestId: input.requestMetadata.requestId,
          chatId: settings.chatId,
          threadId: settings.threadId,
        },
        adminUser: { connect: { id: input.currentAdmin.id } },
      } as never,
    });
  }

  /**
   * Returns the internal read-only platform policy payload for the user edge.
   */
  public async getInternalPlatformPolicy(): Promise<InternalPlatformPolicyInterface> {
    const settings: Settings | null = await this.getSettingsRecord(this.prismaService);
    if (settings === null) {
      return DEFAULT_INTERNAL_PLATFORM_POLICY;
    }
    return mapInternalPlatformPolicy(settings);
  }

  /**
   * Applies a partial platform settings update and records an audit log entry.
   */
  public async updatePlatformSettings(
    input: UpdatePlatformSettingsInput,
  ): Promise<PlatformSettingsInterface> {
    const updateChanges: UpdatePlatformSettingsChanges = buildSettingsUpdateChanges(
      input.updatePlatformSettingsDto,
    );
    if (updateChanges.updatedFields.length === 0) {
      const settings: Settings = await this.getOrCreateSettingsRecord(this.prismaService);
      return mapPlatformSettings(settings);
    }
    const settings: Settings = await this.prismaService.$transaction(
      async (transactionClient: Prisma.TransactionClient): Promise<Settings> => {
        const existingSettings: Settings = await this.getOrCreateSettingsRecord(transactionClient);
        const updatedSettings: Settings = await transactionClient.settings.update({
          where: { id: existingSettings.id },
          data: updateChanges.data,
        });
        await transactionClient.adminAuditLog.create({
          data: {
            action: 'settings.platform.updated',
            ipAddress: input.requestMetadata.remoteAddress,
            userAgent: input.requestMetadata.userAgent,
            metadata: buildAuditMetadata({
              requestId: input.requestMetadata.requestId,
              updatedFields: updateChanges.updatedFields,
            }),
            adminUser: { connect: { id: input.currentAdmin.id } },
          },
        });
        return updatedSettings;
      },
    );
    return mapPlatformSettings(settings);
  }

  private async getOrCreateSettingsRecord(settingsClient: SettingsClient): Promise<Settings> {
    const existingSettings: Settings | null = await this.getSettingsRecord(settingsClient);
    if (existingSettings) {
      return existingSettings;
    }
    return settingsClient.settings.create({
      data: {},
    });
  }

  private async getSettingsRecord(settingsClient: SettingsClient): Promise<Settings | null> {
    return settingsClient.settings.findFirst({
      orderBy: { updatedAt: 'asc' },
    });
  }
}

function buildSettingsUpdateChanges(
  updatePlatformSettingsDto: UpdatePlatformSettingsDto,
): UpdatePlatformSettingsChanges {
  const updatedFields: string[] = [];
  const data: Prisma.SettingsUpdateInput = {};
  if (hasOwnField(updatePlatformSettingsDto, 'rulesRequired')) {
    data.rulesRequired = updatePlatformSettingsDto.rulesRequired;
    updatedFields.push('rulesRequired');
  }
  if (hasOwnField(updatePlatformSettingsDto, 'rulesLink')) {
    data.rulesLink = updatePlatformSettingsDto.rulesLink ?? null;
    updatedFields.push('rulesLink');
  }
  if (hasOwnField(updatePlatformSettingsDto, 'channelRequired')) {
    data.channelRequired = updatePlatformSettingsDto.channelRequired;
    updatedFields.push('channelRequired');
  }
  if (hasOwnField(updatePlatformSettingsDto, 'channelId')) {
    data.channelId = parseChannelId(updatePlatformSettingsDto.channelId);
    updatedFields.push('channelId');
  }
  if (hasOwnField(updatePlatformSettingsDto, 'channelLink')) {
    data.channelLink = updatePlatformSettingsDto.channelLink ?? null;
    updatedFields.push('channelLink');
  }
  if (hasOwnField(updatePlatformSettingsDto, 'accessMode')) {
    data.accessMode = updatePlatformSettingsDto.accessMode;
    updatedFields.push('accessMode');
  }
  if (hasOwnField(updatePlatformSettingsDto, 'inviteModeStartedAt')) {
    data.inviteModeStartedAt = parseInviteModeStartedAt(updatePlatformSettingsDto.inviteModeStartedAt);
    updatedFields.push('inviteModeStartedAt');
  }
  if (hasOwnField(updatePlatformSettingsDto, 'defaultCurrency')) {
    data.defaultCurrency = updatePlatformSettingsDto.defaultCurrency;
    updatedFields.push('defaultCurrency');
  }
  return {
    updatedFields,
    data,
  };
}

function buildAuditMetadata(input: {
  readonly requestId: string | null;
  readonly updatedFields: readonly string[];
}): Prisma.InputJsonObject {
  return {
    requestId: input.requestId,
    updatedFields: [...input.updatedFields],
  };
}

function mapPlatformSettings(settings: Settings): PlatformSettingsInterface {
  return {
    rulesRequired: settings.rulesRequired,
    rulesLink: settings.rulesLink,
    channelRequired: settings.channelRequired,
    channelId: settings.channelId === null ? null : settings.channelId.toString(),
    channelLink: settings.channelLink,
    accessMode: settings.accessMode,
    inviteModeStartedAt:
      settings.inviteModeStartedAt === null ? null : settings.inviteModeStartedAt.toISOString(),
    defaultCurrency: settings.defaultCurrency,
    updatedAt: settings.updatedAt.toISOString(),
  };
}

function mapInternalPlatformPolicy(settings: Settings): InternalPlatformPolicyInterface {
  return {
    rulesRequired: settings.rulesRequired,
    rulesLink: settings.rulesLink,
    channelRequired: settings.channelRequired,
    channelLink: settings.channelLink,
    accessMode: settings.accessMode,
    inviteModeStartedAt:
      settings.inviteModeStartedAt === null ? null : settings.inviteModeStartedAt.toISOString(),
    defaultCurrency: settings.defaultCurrency,
  };
}

function hasOwnField<T extends object>(target: T, propertyName: keyof T): boolean {
  return Object.prototype.hasOwnProperty.call(target, propertyName);
}

function parseChannelId(channelId: string | null | undefined): bigint | null {
  if (channelId === null || channelId === undefined) {
    return null;
  }
  return BigInt(channelId);
}

function parseInviteModeStartedAt(inviteModeStartedAt: string | null | undefined): Date | null {
  if (inviteModeStartedAt === null || inviteModeStartedAt === undefined) {
    return null;
  }
  return new Date(inviteModeStartedAt);
}

function validatePaymentOpsAlertSettings(
  settings: PaymentOpsAlertSettingsInterface,
): void {
  if (settings.enabled && settings.chatId === null) {
    throw new BadRequestException('PAYMENT_OPS_ALERT_CHAT_REQUIRED');
  }
}

function extractUpdatedPaymentOpsFields(
  dto: UpdatePaymentOpsAlertSettingsDto,
): readonly string[] {
  const fields: string[] = [];
  if (hasOwnField(dto, 'enabled')) {
    fields.push('enabled');
  }
  if (hasOwnField(dto, 'chatId')) {
    fields.push('chatId');
  }
  if (hasOwnField(dto, 'threadId')) {
    fields.push('threadId');
  }
  if (hasOwnField(dto, 'hashtag')) {
    fields.push('hashtag');
  }
  return fields;
}

function buildPaymentOpsAlertTestMessage(input: {
  readonly settings: PaymentOpsAlertSettingsInterface;
  readonly note: string | null;
  readonly adminId: string;
}): string {
  const note = input.note?.trim();
  const lines = [
    input.settings.hashtag ?? '#payments_ops',
    '#payments_ops',
    '#event_test_alert',
    'kind:payment_ops_test',
    `admin_id:${input.adminId}`,
    `chat_id:${input.settings.chatId ?? 'unknown'}`,
    input.settings.threadId === null ? null : `thread_id:${input.settings.threadId}`,
    note && note.length > 0 ? `note:${note.replace(/\s+/g, ' ').slice(0, 200)}` : null,
  ].filter((line): line is string => line !== null);
  return lines.join('\n');
}
