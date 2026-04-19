import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Currency,
  PlanAvailability,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { CurrentAdminInterface } from '../../auth/interfaces/current-admin.interface';
import { RequestMetadataInterface } from '../../auth/interfaces/request-metadata.interface';
import { RemnawaveSquadOptionInterface } from '../../remnawave/interfaces/remnawave-squad-option.interface';
import { RemnawaveApiService } from '../../remnawave/services/remnawave-api.service';
import { PlanSnapshotSyncService } from '../../subscriptions/services/plan-snapshot-sync.service';
import { AdminPlanDurationDto } from '../dto/admin-plan-duration.dto';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { PlanMoveDirection } from '../dto/move-plan.dto';
import { TrafficLimitStrategyValue } from '../dto/traffic-limit-strategy.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { AdminPlanInterface } from '../interfaces/admin-plan.interface';
import { ArchivedPlanRenewModeValue } from '../utils/archived-plan-renew-mode.util';
import { mapAdminPlan, PLAN_INCLUDE, PlanRecord } from '../utils/plan-record.util';

interface AdminMutationContext {
  readonly currentAdmin: CurrentAdminInterface;
  readonly requestMetadata: RequestMetadataInterface;
}

const ACTIVE_PUBLIC_AVAILABILITIES: ReadonlySet<PlanAvailability> = new Set([
  PlanAvailability.ALL,
  PlanAvailability.NEW,
  PlanAvailability.EXISTING,
  PlanAvailability.INVITED,
  PlanAvailability.ALLOWED,
  PlanAvailability.TRIAL,
]);

@Injectable()
export class PlansAdminService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly remnawaveApiService: RemnawaveApiService,
    private readonly planSnapshotSyncService: PlanSnapshotSyncService,
  ) {}

  public async listPlans(): Promise<readonly AdminPlanInterface[]> {
    const plans = await this.prismaService.plan.findMany({
      include: PLAN_INCLUDE,
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    });
    return plans.map(mapAdminPlan);
  }

  public async getPlan(planId: string): Promise<AdminPlanInterface> {
    const plan = await this.getRequiredPlan(planId);
    return mapAdminPlan(plan);
  }

  public async getInternalSquadOptions(): Promise<readonly RemnawaveSquadOptionInterface[]> {
    return this.remnawaveApiService.getInternalSquadOptions();
  }

  public async getExternalSquadOptions(): Promise<readonly RemnawaveSquadOptionInterface[]> {
    return this.remnawaveApiService.getExternalSquadOptions();
  }

  public async createPlan(
    input: CreatePlanDto,
    context: AdminMutationContext,
  ): Promise<AdminPlanInterface> {
    const normalizedInput = normalizeCreatePlanInput(input);
    await this.assertPlanWriteIsValid({ planId: null, input: normalizedInput });
    const createdPlan = await this.prismaService.$transaction(async (transactionClient) => {
      const lastPlan = await transactionClient.plan.findFirst({
        orderBy: {
          orderIndex: 'desc',
        },
        select: {
          orderIndex: true,
        },
      });
      const created = await transactionClient.plan.create({
        data: {
          ...buildPlanWriteData(normalizedInput),
          orderIndex: (lastPlan?.orderIndex ?? 0) + 1,
          durations: {
            create: buildPlanDurationCreateInput(normalizedInput.durations),
          },
        },
        include: PLAN_INCLUDE,
      });
      await this.logAdminAction({
        transactionClient,
        action: 'plans.created',
        context,
        metadata: {
          planId: created.id,
          name: created.name,
        },
      });
      return created;
    });
    return mapAdminPlan(createdPlan);
  }

  public async updatePlan(
    planId: string,
    input: UpdatePlanDto,
    context: AdminMutationContext,
  ): Promise<AdminPlanInterface> {
    const currentPlan = await this.getRequiredPlan(planId);
    const normalizedInput = normalizeUpdatePlanInput(input, currentPlan);
    await this.assertPlanWriteIsValid({ planId, input: normalizedInput });
    const updatedPlan = await this.prismaService.$transaction(async (transactionClient) => {
      const updated = await transactionClient.plan.update({
        where: {
          id: planId,
        },
        data: {
          ...buildPlanWriteData(normalizedInput),
          durations:
            normalizedInput.durations === undefined
              ? undefined
              : {
                  deleteMany: {},
                  create: buildPlanDurationCreateInput(normalizedInput.durations),
                },
        },
        include: PLAN_INCLUDE,
      });
      await this.logAdminAction({
        transactionClient,
        action: 'plans.updated',
        context,
        metadata: {
          planId: updated.id,
          name: updated.name,
        },
      });
      await this.planSnapshotSyncService.syncPlanSnapshotMetadata(transactionClient, {
        id: updated.id,
        name: updated.name,
        tag: updated.tag,
        type: updated.type,
        trafficLimit: updated.trafficLimit,
        deviceLimit: updated.deviceLimit,
        trafficLimitStrategy: updated.trafficLimitStrategy,
        internalSquads: updated.internalSquads,
        externalSquad: updated.externalSquad,
      });
      return updated;
    });
    return mapAdminPlan(updatedPlan);
  }

  public async movePlan(
    planId: string,
    direction: PlanMoveDirection,
    context: AdminMutationContext,
  ): Promise<AdminPlanInterface> {
    const updatedPlan = await this.prismaService.$transaction(async (transactionClient) => {
      const plans = await transactionClient.plan.findMany({
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          orderIndex: true,
        },
      });
      const currentIndex = plans.findIndex((plan) => plan.id === planId);
      if (currentIndex < 0) {
        throw new NotFoundException('Plan not found');
      }
      const targetIndex =
        direction === PlanMoveDirection.UP ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= plans.length) {
        return transactionClient.plan.findUniqueOrThrow({
          where: {
            id: planId,
          },
          include: PLAN_INCLUDE,
        });
      }
      const currentPlan = plans[currentIndex]!;
      const targetPlan = plans[targetIndex]!;
      await transactionClient.plan.update({
        where: {
          id: currentPlan.id,
        },
        data: {
          orderIndex: targetPlan.orderIndex,
        },
      });
      await transactionClient.plan.update({
        where: {
          id: targetPlan.id,
        },
        data: {
          orderIndex: currentPlan.orderIndex,
        },
      });
      const updated = await transactionClient.plan.findUniqueOrThrow({
        where: {
          id: planId,
        },
        include: PLAN_INCLUDE,
      });
      await this.logAdminAction({
        transactionClient,
        action: 'plans.moved',
        context,
        metadata: {
          planId: updated.id,
          direction,
        },
      });
      return updated;
    });
    return mapAdminPlan(updatedPlan);
  }

  public async deletePlan(planId: string, context: AdminMutationContext): Promise<void> {
    await this.prismaService.$transaction(async (transactionClient) => {
      const existingPlan = await transactionClient.plan.findUnique({
        where: {
          id: planId,
        },
        select: {
          id: true,
          name: true,
          orderIndex: true,
        },
      });
      if (existingPlan === null) {
        throw new NotFoundException('Plan not found');
      }
      await this.assertPlanDeleteIsAllowed(planId, transactionClient);
      await transactionClient.plan.delete({
        where: {
          id: planId,
        },
      });
      const remainingPlans = await transactionClient.plan.findMany({
        where: {
          orderIndex: {
            gt: existingPlan.orderIndex,
          },
        },
        orderBy: {
          orderIndex: 'asc',
        },
        select: {
          id: true,
          orderIndex: true,
        },
      });
      for (const plan of remainingPlans) {
        await transactionClient.plan.update({
          where: {
            id: plan.id,
          },
          data: {
            orderIndex: plan.orderIndex - 1,
          },
        });
      }
      await this.logAdminAction({
        transactionClient,
        action: 'plans.deleted',
        context,
        metadata: {
          planId,
          name: existingPlan.name,
        },
      });
    });
  }

  private async assertPlanWriteIsValid(input: {
    readonly planId: string | null;
    readonly input: NormalizedPlanWriteInput;
  }): Promise<void> {
    await this.assertUniquePlanName(input.planId, input.input.name);
    this.assertDurationsAreValid(input.input.durations);
    this.assertTransitionReferencesAreWellFormed({ planId: input.planId, input: input.input });
    await this.assertTrialConstraints(input);
    await this.assertReferencedPlansExistAndAreAssignable(input.input);
    await this.assertAllowedUsersExist(input.input.allowedUserIds);
    await this.assertSquadsAreValid(input.input);
  }

  private async assertUniquePlanName(planId: string | null, name: string): Promise<void> {
    const existingPlan = await this.prismaService.plan.findFirst({
      where: {
        name,
      },
      select: {
        id: true,
      },
    });
    if (existingPlan !== null && existingPlan.id !== planId) {
      throw new BadRequestException(`Plan with name '${name}' already exists`);
    }
  }

  private assertDurationsAreValid(durations: readonly AdminPlanDurationDto[]): void {
    const durationDays = new Set<number>();
    for (const duration of durations) {
      if (durationDays.has(duration.days)) {
        throw new BadRequestException(`Duration ${duration.days} days is duplicated`);
      }
      durationDays.add(duration.days);
      const currencies = new Set<Currency>();
      for (const price of duration.prices) {
        if (currencies.has(price.currency)) {
          throw new BadRequestException(
            `Currency '${price.currency}' is duplicated for ${duration.days} days`,
          );
        }
        currencies.add(price.currency);
      }
    }
  }

  private assertTransitionReferencesAreWellFormed(input: {
    readonly planId: string | null;
    readonly input: NormalizedPlanWriteInput;
  }): void {
    const transitionIds = new Set([
      ...input.input.upgradeToPlanIds,
      ...input.input.replacementPlanIds,
    ]);
    if (input.planId !== null && transitionIds.has(input.planId)) {
      throw new BadRequestException('Plan transitions cannot reference the same plan');
    }
    if (
      input.input.isArchived &&
      input.input.archivedRenewMode === ArchivedPlanRenewModeValue.REPLACE_ON_RENEW &&
      input.input.replacementPlanIds.length === 0
    ) {
      throw new BadRequestException(
        'Archived plans with replacement renew mode must define replacement plans',
      );
    }
    if (
      !input.input.isArchived &&
      input.input.archivedRenewMode !== ArchivedPlanRenewModeValue.SELF_RENEW
    ) {
      throw new BadRequestException(
        'Only archived plans may define replacement renew behavior',
      );
    }
  }

  private async assertTrialConstraints(input: {
    readonly planId: string | null;
    readonly input: NormalizedPlanWriteInput;
  }): Promise<void> {
    if (
      input.input.availability !== PlanAvailability.TRIAL ||
      !input.input.isActive ||
      input.input.isArchived
    ) {
      return;
    }
    const existingTrial = await this.prismaService.plan.findFirst({
      where: {
        availability: PlanAvailability.TRIAL,
        isActive: true,
        isArchived: false,
      },
      select: {
        id: true,
      },
    });
    if (existingTrial !== null && existingTrial.id !== input.planId) {
      throw new BadRequestException('Only one active trial plan is allowed');
    }
    if (input.input.durations.length !== 1) {
      throw new BadRequestException('Trial plans must define exactly one duration');
    }
  }

  private async assertReferencedPlansExistAndAreAssignable(
    input: NormalizedPlanWriteInput,
  ): Promise<void> {
    const referencedIds = [...new Set([...input.upgradeToPlanIds, ...input.replacementPlanIds])];
    if (referencedIds.length === 0) {
      return;
    }
    const referencedPlans = await this.prismaService.plan.findMany({
      where: {
        id: {
          in: referencedIds,
        },
      },
      select: {
        id: true,
        isActive: true,
        isArchived: true,
        availability: true,
      },
    });
    const referencedById = new Map(referencedPlans.map((plan) => [plan.id, plan]));
    const missingIds = referencedIds.filter((id) => !referencedById.has(id));
    if (missingIds.length > 0) {
      throw new BadRequestException(`Referenced plans not found: ${missingIds.join(', ')}`);
    }
    const invalidIds = referencedPlans
      .filter(
        (plan) =>
          !plan.isActive ||
          plan.isArchived ||
          !ACTIVE_PUBLIC_AVAILABILITIES.has(plan.availability),
      )
      .map((plan) => plan.id);
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Replacement and upgrade plans must be active public plans: ${invalidIds.join(', ')}`,
      );
    }
  }

  private async assertAllowedUsersExist(allowedUserIds: readonly string[]): Promise<void> {
    if (allowedUserIds.length === 0) {
      return;
    }
    const users = await this.prismaService.user.findMany({
      where: {
        id: {
          in: [...allowedUserIds],
        },
      },
      select: {
        id: true,
      },
    });
    const userIds = new Set(users.map((user) => user.id));
    const missingUserIds = allowedUserIds.filter((userId) => !userIds.has(userId));
    if (missingUserIds.length > 0) {
      throw new BadRequestException(
        `Allowed users not found: ${missingUserIds.join(', ')}`,
      );
    }
  }

  private async assertSquadsAreValid(input: NormalizedPlanWriteInput): Promise<void> {
    const [internalSquads, externalSquads] = await Promise.all([
      this.remnawaveApiService.getInternalSquadOptions(),
      this.remnawaveApiService.getExternalSquadOptions(),
    ]);
    const internalSquadIds = new Set(internalSquads.map((squad) => squad.uuid));
    const externalSquadIds = new Set(externalSquads.map((squad) => squad.uuid));
    const missingInternalSquads = input.internalSquads.filter((squad) => !internalSquadIds.has(squad));
    if (missingInternalSquads.length > 0) {
      throw new BadRequestException(
        `Internal squads not found: ${missingInternalSquads.join(', ')}`,
      );
    }
    if (input.externalSquad !== null && !externalSquadIds.has(input.externalSquad)) {
      throw new BadRequestException(`External squad not found: ${input.externalSquad}`);
    }
  }

  private async assertPlanDeleteIsAllowed(
    planId: string,
    transactionClient: Prisma.TransactionClient,
  ): Promise<void> {
    const transitionReference = await transactionClient.plan.findFirst({
      where: {
        OR: [
          {
            upgradeToPlanIds: {
              has: planId,
            },
          },
          {
            replacementPlanIds: {
              has: planId,
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });
    if (transitionReference !== null) {
      throw new BadRequestException(
        'Plan is referenced by subscriptions or transition rules. Archive it instead.',
      );
    }
    const subscriptionReference = await transactionClient.$queryRaw<
      readonly { readonly id: string }[]
    >(
      Prisma.sql`
        SELECT "id"
        FROM "Subscription"
        WHERE "status" <> ${SubscriptionStatus.DELETED}
          AND "planSnapshot"->>'id' = ${planId}
        LIMIT 1
      `,
    );
    if (subscriptionReference.length > 0) {
      throw new BadRequestException(
        'Plan is referenced by subscriptions or transition rules. Archive it instead.',
      );
    }
  }

  private async getRequiredPlan(planId: string) {
    const plan = await this.prismaService.plan.findUnique({
      where: {
        id: planId,
      },
      include: PLAN_INCLUDE,
    });
    if (plan === null) {
      throw new NotFoundException('Plan not found');
    }
    return plan;
  }

  private async logAdminAction(input: {
    readonly transactionClient: Prisma.TransactionClient;
    readonly action: string;
    readonly context: AdminMutationContext;
    readonly metadata: Prisma.InputJsonObject;
  }): Promise<void> {
    await input.transactionClient.adminAuditLog.create({
      data: {
        action: input.action,
        ipAddress: input.context.requestMetadata.remoteAddress,
        userAgent: input.context.requestMetadata.userAgent,
        metadata: {
          requestId: input.context.requestMetadata.requestId,
          ...input.metadata,
        },
        adminUser: {
          connect: {
            id: input.context.currentAdmin.id,
          },
        },
      },
    });
  }
}

interface NormalizedPlanWriteInput {
  readonly name: string;
  readonly description: string | null;
  readonly tag: string | null;
  readonly isActive: boolean;
  readonly isArchived: boolean;
  readonly archivedRenewMode: ArchivedPlanRenewModeValue;
  readonly type: PlanRecord['type'];
  readonly availability: PlanAvailability;
  readonly trafficLimit: number | null;
  readonly deviceLimit: number;
  readonly trafficLimitStrategy: TrafficLimitStrategyValue;
  readonly internalSquads: readonly string[];
  readonly externalSquad: string | null;
  readonly upgradeToPlanIds: readonly string[];
  readonly replacementPlanIds: readonly string[];
  readonly allowedUserIds: readonly string[];
  readonly durations: readonly AdminPlanDurationDto[];
}

function normalizeCreatePlanInput(input: CreatePlanDto): NormalizedPlanWriteInput {
  return normalizePlanWriteInput({
    name: input.name.trim(),
    description: normalizeNullableString(input.description),
    tag: normalizeNullableString(input.tag),
    isActive: input.isActive ?? true,
    isArchived: input.isArchived ?? false,
    archivedRenewMode: input.archivedRenewMode ?? ArchivedPlanRenewModeValue.SELF_RENEW,
    type: input.type,
    availability: input.availability,
    trafficLimit: input.trafficLimit ?? null,
    deviceLimit: input.deviceLimit,
    trafficLimitStrategy: input.trafficLimitStrategy ?? TrafficLimitStrategyValue.NO_RESET,
    internalSquads: normalizeStringArray(input.internalSquads ?? []),
    externalSquad: normalizeNullableString(input.externalSquad),
    upgradeToPlanIds: normalizeUuidArray(input.upgradeToPlanIds ?? []),
    replacementPlanIds: normalizeUuidArray(input.replacementPlanIds ?? []),
    allowedUserIds: normalizeUuidArray(input.allowedUserIds ?? []),
    durations: input.durations,
  });
}

function normalizeUpdatePlanInput(
  input: UpdatePlanDto,
  currentPlan: PlanRecord,
): NormalizedPlanWriteInput {
  return normalizePlanWriteInput({
    name: input.name?.trim() ?? currentPlan.name,
    description:
      input.description === undefined ? currentPlan.description : normalizeNullableString(input.description),
    tag: input.tag === undefined ? currentPlan.tag : normalizeNullableString(input.tag),
    isActive: input.isActive ?? currentPlan.isActive,
    isArchived: input.isArchived ?? currentPlan.isArchived,
    archivedRenewMode: input.archivedRenewMode ?? currentPlan.archivedRenewMode,
    type: input.type ?? currentPlan.type,
    availability: input.availability ?? currentPlan.availability,
    trafficLimit: input.trafficLimit === undefined ? currentPlan.trafficLimit : input.trafficLimit,
    deviceLimit: input.deviceLimit ?? currentPlan.deviceLimit,
    trafficLimitStrategy:
      input.trafficLimitStrategy ?? currentPlan.trafficLimitStrategy,
    internalSquads:
      input.internalSquads === undefined
        ? [...currentPlan.internalSquads]
        : normalizeStringArray(input.internalSquads),
    externalSquad:
      input.externalSquad === undefined
        ? currentPlan.externalSquad
        : normalizeNullableString(input.externalSquad),
    upgradeToPlanIds:
      input.upgradeToPlanIds === undefined
        ? [...currentPlan.upgradeToPlanIds]
        : normalizeUuidArray(input.upgradeToPlanIds),
    replacementPlanIds:
      input.replacementPlanIds === undefined
        ? [...currentPlan.replacementPlanIds]
        : normalizeUuidArray(input.replacementPlanIds),
    allowedUserIds:
      input.allowedUserIds === undefined
        ? [...currentPlan.allowedUserIds]
        : normalizeUuidArray(input.allowedUserIds),
    durations:
      input.durations ??
      currentPlan.durations.map((duration) => ({
        days: duration.days,
        prices: duration.prices.map((price) => ({
          currency: price.currency,
          price: price.price.toString(),
        })),
      })),
  });
}

function buildPlanWriteData(input: NormalizedPlanWriteInput): Prisma.PlanUncheckedCreateInput {
  return {
    name: input.name,
    description: input.description,
    tag: input.tag,
    isActive: input.isActive,
    isArchived: input.isArchived,
    archivedRenewMode: input.archivedRenewMode,
    type: input.type,
    availability: input.availability,
    trafficLimit: input.trafficLimit,
    deviceLimit: input.deviceLimit,
    trafficLimitStrategy: input.trafficLimitStrategy as never,
    internalSquads: [...input.internalSquads],
    externalSquad: input.externalSquad,
    upgradeToPlanIds: [...input.upgradeToPlanIds],
    replacementPlanIds: [...input.replacementPlanIds],
    allowedUserIds: [...input.allowedUserIds],
  };
}

function buildPlanDurationCreateInput(
  durations: readonly AdminPlanDurationDto[],
): Prisma.PlanDurationUncheckedCreateWithoutPlanInput[] {
  return durations.map((duration) => ({
    days: duration.days,
    prices: {
      create: duration.prices.map((price) => ({
        currency: price.currency,
        price: price.price,
      })),
    },
  }));
}

function normalizeNullableString(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function normalizeStringArray(values: readonly string[]): readonly string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function normalizeUuidArray(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function normalizePlanWriteInput(input: NormalizedPlanWriteInput): NormalizedPlanWriteInput {
  let trafficLimit = input.trafficLimit;
  let deviceLimit = input.deviceLimit;
  if (input.type === 'DEVICES') {
    trafficLimit = null;
  } else if (input.type === 'TRAFFIC') {
    deviceLimit = -1;
  } else if (input.type === 'UNLIMITED') {
    trafficLimit = null;
    deviceLimit = -1;
  } else {
    if (deviceLimit < 0) {
      deviceLimit = 1;
    }
    if (trafficLimit === null) {
      trafficLimit = 1;
    }
  }
  const durations =
    input.availability === PlanAvailability.TRIAL
      ? input.durations.slice(0, 1).map((duration) => ({
          ...duration,
          prices: duration.prices.map((price) => ({
            ...price,
            price: '0',
          })),
        }))
      : input.durations;
  return {
    ...input,
    trafficLimit,
    deviceLimit,
    durations,
    allowedUserIds:
      input.availability === PlanAvailability.ALLOWED ? input.allowedUserIds : [],
    archivedRenewMode: input.isArchived
      ? input.archivedRenewMode
      : ArchivedPlanRenewModeValue.SELF_RENEW,
    replacementPlanIds:
      input.isArchived && input.archivedRenewMode === ArchivedPlanRenewModeValue.REPLACE_ON_RENEW
        ? input.replacementPlanIds
        : [],
  };
}
