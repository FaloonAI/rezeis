import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../common/prisma/prisma.service';
import { PasswordHashService } from '../../auth/services/password-hash.service';
import { loginPolicy } from '../../auth/utils/login-policy.util';
import { WebAuthChangePasswordDto } from '../dto/web-auth-change-password.dto';
import { WebAuthLoginDto } from '../dto/web-auth-login.dto';
import { WebAuthRecoverDto } from '../dto/web-auth-recover.dto';
import { WebAuthRegisterDto } from '../dto/web-auth-register.dto';
import {
  WebAuthChangePasswordResultInterface,
  WebAuthLoginResultInterface,
  WebAuthRecoverResultInterface,
  WebAuthRegisterResultInterface,
} from '../interfaces/web-auth.interface';

/**
 * WebAuthService
 * ──────────────
 * Owns the four credential flows reiwa exposes to its SPA / Mini App:
 *
 *  - **register**: create a `WebAccount` either against an existing
 *    Telegram-first `User` (the bot flow that asks the user to set up
 *    credentials inside the Mini App) or against a brand-new web-first
 *    `User`. The canonical `reiwa_id` is the `User.id` CUID either way.
 *  - **login**: verify login + password and return a session payload.
 *  - **recover**: pick the recovery channel based on what the user has
 *    linked. Implementations of the actual delivery (email / telegram)
 *    live in `EmailModule` / future telegram realtime stream — this
 *    method only signals which channel the SPA should advertise.
 *  - **change-password**: rotates the stored hash after verifying the
 *    current password.
 *
 * Threat model:
 *  - Plain text passwords land here through the JWT-authenticated
 *    internal API on the closed `remnawave-network`. The wire is hashed
 *    on TLS by the reverse proxy that fronts reiwa; admin always stores
 *    the scrypt digest emitted by `PasswordHashService`.
 *  - Login lookups go through `loginPolicy.normalizeLogin` so trailing
 *    whitespace / case differences cannot create duplicate accounts.
 *  - Failed login responses are intentionally generic (`Invalid login or
 *    password`) to avoid user-enumeration via timing or message.
 */
@Injectable()
export class WebAuthService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly passwordHashService: PasswordHashService,
  ) {}

  public async register(input: WebAuthRegisterDto): Promise<WebAuthRegisterResultInterface> {
    if (!loginPolicy.isValidLogin(input.login)) {
      throw new BadRequestException('login is invalid');
    }
    const login = loginPolicy.sanitizeLogin(input.login);
    const loginNormalized = loginPolicy.normalizeLogin(input.login);
    const passwordHash = await this.passwordHashService.hashPassword({
      plainTextPassword: input.password,
    });
    const emailNormalized = input.email ? input.email.trim().toLowerCase() : null;

    return this.prismaService.$transaction(async (tx) => {
      // Phase 1 — pick or create the User row that owns this credential.
      const user = await this.resolveOrCreateUser(tx, {
        telegramIdToLink: input.telegramIdToLink ?? null,
        email: emailNormalized,
      });

      // Phase 2 — guard against duplicate WebAccount on the same User.
      const existingWebAccount = await tx.webAccount.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (existingWebAccount !== null) {
        throw new ConflictException('User already has a web account');
      }

      // Phase 3 — guard against login conflicts (case-insensitive).
      const loginConflict = await tx.webAccount.findUnique({
        where: { loginNormalized },
        select: { id: true },
      });
      if (loginConflict !== null) {
        throw new ConflictException('login is already taken');
      }

      // Phase 4 — create the WebAccount.
      const webAccount = await tx.webAccount.create({
        data: {
          userId: user.id,
          login,
          loginNormalized,
          email: input.email ?? null,
          emailNormalized,
          passwordHash,
          requiresPasswordChange: false,
          credentialsBootstrappedAt: new Date(),
        },
        select: { id: true },
      });

      return {
        userId: user.id,
        webAccountId: webAccount.id,
      };
    });
  }

  /**
   * Non-mutating availability probe for a login. Used by the SPA's
   * register form to give live "username taken" feedback **without**
   * creating an account or burning the registration rate limit (the old
   * behaviour fired a real `register` per keystroke with a dummy hash).
   *
   * Returns `{ available: false }` for malformed logins too, so the UI
   * doesn't advertise an invalid handle as free.
   */
  public async checkLoginAvailable(login: string): Promise<{ available: boolean }> {
    if (!loginPolicy.isValidLogin(login)) {
      return { available: false };
    }
    const loginNormalized = loginPolicy.normalizeLogin(login);
    const existing = await this.prismaService.webAccount.findUnique({
      where: { loginNormalized },
      select: { id: true },
    });
    return { available: existing === null };
  }

  public async login(input: WebAuthLoginDto): Promise<WebAuthLoginResultInterface> {
    if (!loginPolicy.isValidLogin(input.login)) {
      throw new UnauthorizedException('Invalid login or password');
    }
    const loginNormalized = loginPolicy.normalizeLogin(input.login);
    const webAccount = await this.prismaService.webAccount.findUnique({
      where: { loginNormalized },
      include: { user: { select: { telegramId: true } } },
    });
    if (webAccount === null || webAccount.passwordHash === null) {
      throw new UnauthorizedException('Invalid login or password');
    }
    const ok = await this.passwordHashService.verifyPassword({
      plainTextPassword: input.password,
      passwordHash: webAccount.passwordHash,
    });
    if (!ok) {
      throw new UnauthorizedException('Invalid login or password');
    }
    return {
      userId: webAccount.userId,
      requiresPasswordChange: webAccount.requiresPasswordChange,
      telegramLinked: webAccount.user.telegramId !== null,
      emailVerified: webAccount.emailVerifiedAt !== null,
    };
  }

  public async recover(input: WebAuthRecoverDto): Promise<WebAuthRecoverResultInterface> {
    const loginNormalized = loginPolicy.normalizeLogin(input.login);
    const webAccount = await this.prismaService.webAccount.findUnique({
      where: { loginNormalized },
      include: { user: { select: { telegramId: true } } },
    });
    if (webAccount === null) {
      // Do not leak existence — pretend the recovery flow is "none".
      return { method: 'none' };
    }
    if (webAccount.user.telegramId !== null) {
      // Telegram-first: the actual delivery is handled by the bot's
      // recovery handler, which polls / streams for pending challenges.
      // Recovery code persistence (and TTL) is covered by the linking
      // module's `auth_challenges` rows when the SPA initiates flow.
      return { method: 'telegram' };
    }
    if (webAccount.email !== null && webAccount.emailVerifiedAt !== null) {
      return { method: 'email' };
    }
    return { method: 'none' };
  }

  public async changePassword(
    input: WebAuthChangePasswordDto,
  ): Promise<WebAuthChangePasswordResultInterface> {
    const webAccount = await this.prismaService.webAccount.findUnique({
      where: { userId: input.userId },
    });
    if (webAccount === null || webAccount.passwordHash === null) {
      throw new NotFoundException('Web account not found');
    }
    const ok = await this.passwordHashService.verifyPassword({
      plainTextPassword: input.currentPassword,
      passwordHash: webAccount.passwordHash,
    });
    if (!ok) {
      throw new UnauthorizedException('Invalid current password');
    }
    const newPasswordHash = await this.passwordHashService.hashPassword({
      plainTextPassword: input.newPassword,
    });
    await this.prismaService.webAccount.update({
      where: { id: webAccount.id },
      data: {
        passwordHash: newPasswordHash,
        requiresPasswordChange: false,
        temporaryPasswordExpiresAt: null,
      },
    });
    return { success: true };
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private async resolveOrCreateUser(
    tx: Prisma.TransactionClient,
    input: { telegramIdToLink: string | null; email: string | null },
  ): Promise<{ id: string }> {
    if (input.telegramIdToLink !== null) {
      const telegramIdBig = BigInt(input.telegramIdToLink);
      const existing = await tx.user.findUnique({
        where: { telegramId: telegramIdBig },
        select: { id: true },
      });
      if (existing === null) {
        throw new NotFoundException(
          `User with telegramId=${input.telegramIdToLink} not found — bot must call bootstrap first`,
        );
      }
      // Optionally surface the email on the canonical `User` row for
      // recovery flows. Keep idempotent: only set when missing.
      if (input.email !== null) {
        await tx.user.updateMany({
          where: { id: existing.id, email: null },
          data: { email: input.email },
        });
      }
      return existing;
    }
    return tx.user.create({
      data: {
        name: '',
        email: input.email,
      },
      select: { id: true },
    });
  }
}
