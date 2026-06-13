import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AdminJwtAuthGuard } from '../../auth/guards/admin-jwt-auth.guard';
import { ImportBySetLinkDto, UpdateEmojiDto } from '../dto/custom-emoji.dto';
import { CustomEmojiPackInterface } from '../interfaces/custom-emoji-pack.interface';
import { CustomEmojiService } from '../services/custom-emoji.service';

@ApiTags('admin/custom-emoji')
@ApiBearerAuth('JWT')
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/custom-emoji')
export class AdminCustomEmojiController {
  public constructor(private readonly customEmojiService: CustomEmojiService) {}

  @Get('packs')
  @ApiOperation({ summary: 'List custom emoji packs' })
  public listPacks(): Promise<CustomEmojiPackInterface[]> {
    return this.customEmojiService.listPacks();
  }

  @Post('import-by-link')
  @ApiOperation({ summary: 'Import a whole emoji set from its t.me link/name via the bot token' })
  public importBySetLink(@Body() dto: ImportBySetLinkDto): Promise<CustomEmojiPackInterface> {
    return this.customEmojiService.importBySetLink({ packName: dto.packName ?? '', link: dto.link });
  }

  @Patch('packs/:packId/emoji/:slug')
  @ApiOperation({ summary: 'Update a single emoji (name, fallback, custom_emoji_id)' })
  public updateEmoji(
    @Param('packId') packId: string,
    @Param('slug') slug: string,
    @Body() dto: UpdateEmojiDto,
  ): Promise<CustomEmojiPackInterface> {
    return this.customEmojiService.updateEmoji({ packId, slug, patch: dto });
  }

  @Delete('packs/:packId')
  @ApiOperation({ summary: 'Delete an emoji pack and its assets' })
  public async deletePack(@Param('packId') packId: string): Promise<{ deleted: true }> {
    await this.customEmojiService.deletePack(packId);
    return { deleted: true };
  }
}
