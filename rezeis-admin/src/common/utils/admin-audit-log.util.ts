import { Prisma } from '@prisma/client';

import { RequestMetadataInterface } from '../../modules/auth/interfaces/request-metadata.interface';

/**
 * Builds the `data` payload for an `adminAuditLog.create(...)` call — the
 * common shape every mutating admin path repeats: action + request metadata
 * (ip / user-agent) + a free-form metadata JSON + the actor connection.
 *
 * Centralizing it removes the per-site `as never` casts (the metadata JSON is
 * coerced to `Prisma.InputJsonValue` here in one place) and keeps every audit
 * row structurally consistent. Behavior is identical to the hand-rolled
 * objects it replaces — only `action` and `metadata` vary per call site.
 */
export function buildAdminAuditLogData(input: {
  readonly action: string;
  readonly actorId: string;
  readonly requestMetadata: RequestMetadataInterface;
  readonly metadata: Record<string, unknown>;
}): Prisma.AdminAuditLogCreateInput {
  return {
    action: input.action,
    ipAddress: input.requestMetadata.remoteAddress,
    userAgent: input.requestMetadata.userAgent,
    metadata: input.metadata as Prisma.InputJsonValue,
    adminUser: { connect: { id: input.actorId } },
  };
}
