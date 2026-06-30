import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { advertisingConfig } from '../../../common/config/advertising.config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateAdRequestDto, ModerateRequestDto } from '../dto/advertising.dto';
import { AdCampaignView, AdPlacementRequestView } from '../interfaces/advertising.interface';
import { mapCampaign, mapRequest } from '../utils/advertising-mappers';
import { generateTrackingCode, isValidTrackingCode } from '../utils/tracking-code.util';

/**
 * Partner-submitted advertising request lifecycle:
 * PENDING → (operator) APPROVED | COUNTERED → (partner) ACCEPTED → ACTIVE,
 * plus REJECTED. On the transition to ACTIVE one PARTNER placement is created
 * per requested platform under a fresh campaign, with the agreed window.
 */
@Injectable()
export class AdPlacementRequestService {
  private readonly logger = new Logger(AdPlacementRequestService.name);

  public constructor(
    private readonly prismaService: PrismaService,
    @Inject(advertisingConfig.KEY)
    private readonly config: ConfigType<typeof advertisingConfig>,
  ) {}

  public async listRequests(status?: string): Promise<AdPlacementRequestView[]> {
    const requests = await this.prismaService.adPlacementRequest.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return requests.map(mapRequest);
  }

  public async listForPartner(partnerId: string): Promise<AdPlacementRequestView[]> {
    const requests = await this.prismaService.adPlacementRequest.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
    });
    return requests.map(mapRequest);
  }

  public async createRequest(
    partnerId: string,
    input: CreateAdRequestDto,
  ): Promise<AdPlacementRequestView> {
    const request = await this.prismaService.adPlacementRequest.create({
      data: {
        partnerId,
        platforms: input.platforms,
        channel: input.channel?.trim() || null,
        notes: input.notes?.trim() || null,
        proposedWindowDays: input.proposedWindowDays,
        selfFundedBudgetNote: input.selfFundedBudgetNote?.trim() || null,
        status: 'PENDING',
      },
    });
    return mapRequest(request);
  }

  /**
   * Approves a request. When `approvedWindowDays` equals the proposed window we
   * activate immediately; when the operator counters with a different window the
   * request goes to COUNTERED and waits for the partner to accept.
   */
  public async approve(
    id: string,
    reviewerId: string | null,
    input: ModerateRequestDto,
  ): Promise<{ request: AdPlacementRequestView; campaign: AdCampaignView | null }> {
    const request = await this.requirePending(id);
    const approvedWindow = input.approvedWindowDays ?? request.proposedWindowDays;
    const isCounter = approvedWindow !== request.proposedWindowDays;

    if (isCounter) {
      const updated = await this.prismaService.adPlacementRequest.update({
        where: { id },
        data: {
          status: 'COUNTERED',
          approvedWindowDays: approvedWindow,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          notes: input.notes?.trim() || request.notes,
        },
      });
      return { request: mapRequest(updated), campaign: null };
    }

    return this.activate(id, reviewerId, approvedWindow);
  }

  /** Partner accepts the operator's countered terms → activate. */
  public async accept(
    id: string,
    partnerId: string,
  ): Promise<{ request: AdPlacementRequestView; campaign: AdCampaignView | null }> {
    const request = await this.prismaService.adPlacementRequest.findUnique({ where: { id } });
    if (request === null || request.partnerId !== partnerId) {
      throw new NotFoundException('Request not found');
    }
    if (request.status !== 'COUNTERED') {
      throw new BadRequestException('Request is not awaiting partner acceptance');
    }
    return this.activate(id, request.reviewedBy, request.approvedWindowDays ?? request.proposedWindowDays);
  }

  public async reject(id: string, reviewerId: string | null): Promise<AdPlacementRequestView> {
    await this.requirePending(id);
    const updated = await this.prismaService.adPlacementRequest.update({
      where: { id },
      data: { status: 'REJECTED', reviewedBy: reviewerId, reviewedAt: new Date() },
    });
    return mapRequest(updated);
  }

  /** Creates the campaign + one PARTNER placement per requested platform. */
  private async activate(
    id: string,
    reviewerId: string | null,
    windowDays: number,
  ): Promise<{ request: AdPlacementRequestView; campaign: AdCampaignView }> {
    const request = await this.prismaService.adPlacementRequest.findUnique({ where: { id } });
    if (request === null) {
      throw new NotFoundException('Request not found');
    }
    const partner = await this.prismaService.partner.findUnique({
      where: { id: request.partnerId },
      select: { id: true },
    });
    if (partner === null) {
      throw new BadRequestException('Partner not found');
    }

    const campaign = await this.prismaService.adCampaign.create({
      data: {
        name: `Partner ${request.partnerId.slice(0, 8)} — ${request.channel ?? 'campaign'}`.slice(0, 100),
        status: 'ACTIVE',
        notes: request.notes,
      },
    });

    for (const platform of request.platforms) {
      const code = await this.mintUniqueCode();
      await this.prismaService.adPlacement.create({
        data: {
          campaignId: campaign.id,
          platform,
          channel: request.channel,
          ownerType: 'PARTNER',
          partnerId: request.partnerId,
          trackingCode: code,
          attributionWindowDays: windowDays,
          status: 'ACTIVE',
        },
      });
    }

    const updated = await this.prismaService.adPlacementRequest.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        approvedWindowDays: windowDays,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        campaignId: campaign.id,
      },
    });

    const full = await this.prismaService.adCampaign.findUnique({
      where: { id: campaign.id },
      include: { placements: { orderBy: { createdAt: 'asc' } } },
    });
    return {
      request: mapRequest(updated),
      campaign: mapCampaign(full ?? campaign, this.config),
    };
  }

  private async requirePending(id: string) {
    const request = await this.prismaService.adPlacementRequest.findUnique({ where: { id } });
    if (request === null) {
      throw new NotFoundException('Request not found');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request is not pending review');
    }
    return request;
  }

  private async mintUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = generateTrackingCode(10);
      if (!isValidTrackingCode(code)) continue;
      const existing = await this.prismaService.adPlacement.findUnique({
        where: { trackingCode: code },
        select: { id: true },
      });
      if (existing === null) return code;
    }
    throw new Error('Failed to mint a unique tracking code');
  }
}
