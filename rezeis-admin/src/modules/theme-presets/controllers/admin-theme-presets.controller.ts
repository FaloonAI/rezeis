import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';

import { CurrentAdmin } from '../../auth/decorators/current-admin.decorator';
import { AdminJwtAuthGuard } from '../../auth/guards/admin-jwt-auth.guard';
import { CurrentAdminInterface } from '../../auth/interfaces/current-admin.interface';
import { SaveActivePrefsDto } from '../dto/save-active-prefs.dto';
import { SaveThemePresetDto, UpdateThemePresetDto } from '../dto/save-theme-preset.dto';
import { AdminThemePresetInterface } from '../interfaces/admin-theme-preset.interface';
import { ThemePresetsService } from '../services/theme-presets.service';

@Controller('admin/theme-presets')
@UseGuards(AdminJwtAuthGuard)
export class AdminThemePresetsController {
  public constructor(private readonly themePresetsService: ThemePresetsService) {}

  @Get()
  public async list(
    @CurrentAdmin() currentAdmin: CurrentAdminInterface,
  ): Promise<readonly AdminThemePresetInterface[]> {
    return this.themePresetsService.listPresets(currentAdmin);
  }

  /** The admin's ACTIVE appearance selection (theme + glass + effects). */
  @Get('active-prefs')
  public async getActivePrefs(
    @CurrentAdmin() currentAdmin: CurrentAdminInterface,
  ): Promise<{ readonly prefs: Record<string, unknown> | null }> {
    return { prefs: await this.themePresetsService.getAppearancePrefs(currentAdmin) };
  }

  /** Persist the admin's ACTIVE appearance selection (follows them cross-device). */
  @Put('active-prefs')
  public async saveActivePrefs(
    @Body() body: SaveActivePrefsDto,
    @CurrentAdmin() currentAdmin: CurrentAdminInterface,
  ): Promise<{ readonly ok: true }> {
    await this.themePresetsService.saveAppearancePrefs(currentAdmin, body.prefs);
    return { ok: true } as const;
  }

  @Post()
  public async create(
    @Body() input: SaveThemePresetDto,
    @CurrentAdmin() currentAdmin: CurrentAdminInterface,
  ): Promise<AdminThemePresetInterface> {
    return this.themePresetsService.createPreset(input, currentAdmin);
  }

  @Patch(':id')
  public async update(
    @Param('id') id: string,
    @Body() input: UpdateThemePresetDto,
    @CurrentAdmin() currentAdmin: CurrentAdminInterface,
  ): Promise<AdminThemePresetInterface> {
    return this.themePresetsService.updatePreset(id, input, currentAdmin);
  }

  @Delete(':id')
  public async delete(
    @Param('id') id: string,
    @CurrentAdmin() currentAdmin: CurrentAdminInterface,
  ): Promise<{ readonly deleted: true }> {
    await this.themePresetsService.deletePreset(id, currentAdmin);
    return { deleted: true } as const;
  }
}
