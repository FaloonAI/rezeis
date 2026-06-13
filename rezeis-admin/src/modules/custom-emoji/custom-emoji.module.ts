import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { SettingsModule } from '../settings/settings.module';
import { AdminCustomEmojiController } from './controllers/admin-custom-emoji.controller';
import { InternalCustomEmojiController } from './controllers/internal-custom-emoji.controller';
import { CustomEmojiService } from './services/custom-emoji.service';
import { CustomEmojiSeedService } from './services/custom-emoji-seed.service';
import { EmojiAssetUploadService } from './services/emoji-asset-upload.service';

/**
 * Custom emoji packs: operator-uploaded emoji libraries (static PNG + Lottie)
 * inserted into broadcasts as `:slug:` shortcodes. Rendered inline in the
 * reiwa cabinet feed; Telegram receives the per-emoji fallback glyph.
 */
@Module({
  imports: [AuthModule, SettingsModule],
  controllers: [AdminCustomEmojiController, InternalCustomEmojiController],
  providers: [CustomEmojiService, CustomEmojiSeedService, EmojiAssetUploadService],
  exports: [CustomEmojiService],
})
export class CustomEmojiModule {}
