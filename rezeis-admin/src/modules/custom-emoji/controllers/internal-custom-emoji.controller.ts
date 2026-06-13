import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { InternalAdminAuthGuard } from '../../auth/guards/internal-admin-auth.guard';
import { CustomEmojiPackInterface } from '../interfaces/custom-emoji-pack.interface';
import { CustomEmojiService } from '../services/custom-emoji.service';

/**
 * Read-only custom emoji packs for the reiwa edge — the cabinet feed uses
 * these to render `:slug:` tokens as inline images / Lottie animations.
 */
@ApiTags('internal/custom-emoji')
@UseGuards(InternalAdminAuthGuard)
@Controller('internal/custom-emoji')
export class InternalCustomEmojiController {
  public constructor(private readonly customEmojiService: CustomEmojiService) {}

  @Get('packs')
  @ApiOperation({ summary: 'List custom emoji packs (internal, for reiwa cabinet rendering)' })
  public listPacks(): Promise<CustomEmojiPackInterface[]> {
    return this.customEmojiService.listPacks();
  }
}
