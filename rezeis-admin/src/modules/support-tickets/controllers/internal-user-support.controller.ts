import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupportTicket, SupportTicketMessage } from '@prisma/client';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { InternalAdminAuthGuard } from '../../auth/guards/internal-admin-auth.guard';
import { buildUserReferenceWhere } from '../../internal-user/utils/user-reference.util';
import { SupportTicketsService } from '../services/support-tickets.service';

/**
 * InternalUserSupportController
 * ─────────────────────────────
 * User-facing support ticket surface consumed by reiwa (SPA / Mini App).
 *
 * Auth: `InternalAdminAuthGuard` (api_token) — reiwa has already proven the
 * end-user identity through its own session and passes it as `:userRef`,
 * which is a reiwa_id (CUID) for web-first users or a numeric telegramId
 * for Telegram users. Every read/write is scoped to the resolved user so a
 * user can never touch another user's ticket.
 *
 * The response shape matches the reiwa SPA contract: lowercase `status` /
 * `authorType`, ISO timestamps, full message thread.
 */
@ApiTags('internal/user/support')
@UseGuards(InternalAdminAuthGuard)
@Controller('internal/user')
export class InternalUserSupportController {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly supportTicketsService: SupportTicketsService,
  ) {}

  @Get(':userRef/tickets')
  @ApiOperation({ summary: 'List the calling user\'s support tickets' })
  public async list(@Param('userRef') userRef: string): Promise<readonly SerializedTicket[]> {
    const userId = await this.resolveUserId(userRef);
    const { items } = await this.supportTicketsService.list({ userId });
    return items.map(serializeTicket);
  }

  @Get(':userRef/tickets/:ticketId')
  @ApiOperation({ summary: 'Fetch a single ticket (must belong to the user)' })
  public async getOne(
    @Param('userRef') userRef: string,
    @Param('ticketId') ticketId: string,
  ): Promise<SerializedTicket> {
    const userId = await this.resolveUserId(userRef);
    const ticket = await this.supportTicketsService.getById(ticketId);
    if (ticket.userId !== userId) {
      throw new NotFoundException('Support ticket not found');
    }
    return serializeTicket(ticket);
  }

  @Post(':userRef/tickets')
  @ApiOperation({ summary: 'Create a ticket with an initial message' })
  public async create(
    @Param('userRef') userRef: string,
    @Body() body: { subject?: string; message?: string },
  ): Promise<SerializedTicket> {
    const userId = await this.resolveUserId(userRef);
    const subject = (body.subject ?? '').trim();
    const message = (body.message ?? '').trim();
    if (subject.length === 0 || message.length === 0) {
      throw new BadRequestException('Subject and message are required');
    }
    const created = await this.supportTicketsService.create({ userId, subject });
    await this.supportTicketsService.addMessage({
      ticketId: created.id,
      authorType: 'USER',
      authorId: userId,
      content: message,
    });
    return serializeTicket(await this.supportTicketsService.getById(created.id));
  }

  @Post(':userRef/tickets/:ticketId/reply')
  @ApiOperation({ summary: 'Append a user reply to the user\'s own ticket' })
  public async reply(
    @Param('userRef') userRef: string,
    @Param('ticketId') ticketId: string,
    @Body() body: { content?: string },
  ): Promise<SerializedTicket> {
    const userId = await this.resolveUserId(userRef);
    const content = (body.content ?? '').trim();
    if (content.length === 0) {
      throw new BadRequestException('Content is required');
    }
    const ticket = await this.supportTicketsService.getById(ticketId);
    if (ticket.userId !== userId) {
      throw new ForbiddenException('Ticket does not belong to this user');
    }
    await this.supportTicketsService.addMessage({
      ticketId,
      authorType: 'USER',
      authorId: userId,
      content,
    });
    return serializeTicket(await this.supportTicketsService.getById(ticketId));
  }

  private async resolveUserId(userRef: string): Promise<string> {
    const user = await this.prismaService.user.findUnique({
      where: buildUserReferenceWhere(userRef),
      select: { id: true },
    });
    if (user === null) {
      throw new NotFoundException('User not found');
    }
    return user.id;
  }
}

// ── Serialization (DB enums UPPERCASE → SPA lowercase) ──────────────────────

interface SerializedTicketMessage {
  readonly id: string;
  readonly authorType: string;
  readonly content: string;
  readonly createdAt: string;
}

interface SerializedTicket {
  readonly id: string;
  readonly subject: string;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly messages: readonly SerializedTicketMessage[];
}

type TicketWithMessages = SupportTicket & { messages?: SupportTicketMessage[] };

function serializeTicket(ticket: TicketWithMessages): SerializedTicket {
  return {
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status.toLowerCase(),
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    messages: (ticket.messages ?? []).map((message) => ({
      id: message.id,
      authorType: message.authorType.toLowerCase(),
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}
