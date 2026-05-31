-- Per-subscription card appearance override. Stores a partial branding blob
-- ({ cardEffect, cardEffectProps, cardEffectOpacity, cardGradient }) so a
-- multi-subscription user can have a distinct animated card background per
-- subscription. NULL means "inherit the global branding".
ALTER TABLE "subscriptions" ADD COLUMN "card_branding" JSONB;
