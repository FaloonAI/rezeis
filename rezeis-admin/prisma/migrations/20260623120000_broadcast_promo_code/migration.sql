-- Wave 4 (bot-studio-redesign): optional promo-code tag on a broadcast.
-- When set, the dispatcher appends a Mini App "activate promo" button to each
-- delivered message, deep-linking the cabinet `/promo?code=<code>` page.
ALTER TABLE "broadcasts" ADD COLUMN "promo_code" TEXT;
