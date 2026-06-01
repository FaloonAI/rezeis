-- Server-side onboarding "completed" timestamp so the cabinet tour state
-- survives across devices. NULL = the user has not finished/skipped the tour.
ALTER TABLE "users" ADD COLUMN "onboarding_completed_at" TIMESTAMPTZ(3);
