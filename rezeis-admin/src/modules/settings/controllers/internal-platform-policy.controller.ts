import { Controller, Get, UseGuards } from '@nestjs/common';

import { InternalAdminAuthGuard } from '../../auth/guards/internal-admin-auth.guard';
import { InternalPlatformPolicyInterface } from '../interfaces/internal-platform-policy.interface';
import { SettingsService } from '../services/settings.service';

/**
 * Exposes the user-safe platform policy contract to internal consumers.
 */
@Controller('internal/settings')
@UseGuards(InternalAdminAuthGuard)
export class InternalPlatformPolicyController {
  public constructor(private readonly settingsService: SettingsService) {}

  /**
   * Returns the read-only platform policy payload for the user edge.
   */
  @Get('platform-policy')
  public async getPlatformPolicy(): Promise<InternalPlatformPolicyInterface> {
    return this.settingsService.getInternalPlatformPolicy();
  }

  /**
   * Returns whether self-service web registration is currently open.
   *
   * Today the flag is derived from `Settings.accessMode`:
   *   - `PUBLIC`             → registration is open
   *   - everything else      → closed (`INVITE_ONLY`, `MAINTENANCE`, ...)
   *
   * The shape stays stable so we can later back this with a dedicated
   * `registrationEnabled` column without breaking reiwa.
   */
  @Get('registration-toggle')
  public async getRegistrationToggle(): Promise<{ enabled: boolean }> {
    const policy = await this.settingsService.getInternalPlatformPolicy();
    return { enabled: policy.accessMode === 'PUBLIC' };
  }
}
