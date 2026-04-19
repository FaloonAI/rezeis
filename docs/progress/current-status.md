# Current Status

Updated against current repo state on 2026-04-19 after re-reading the shipped admin controllers and services, `ruid` API endpoints, `ruid/web` routes, compose files, env templates, and test entrypoints named below.

## Completed Slice

- Payment Ops Center v1 is now wired into `rezeis-admin`. Operators can inspect webhook inbox events, view redacted payload details with audited raw-payload reveal, manually safe-replay events into the reconciliation queue, inspect queue/database reconciliation health, and configure Telegram chat alerts for failed webhook and replay actions through `Settings.systemNotifications`.
  Files: `rezeis-admin/src/modules/payments/`, `rezeis-admin/src/modules/settings/`, `rezeis-admin/web/src/features/payments/`, `rezeis-admin/prisma/migrations/20260419000000_init/`
  Endpoints:
  - `GET /api/admin/payments/webhooks/events`
  - `GET /api/admin/payments/webhooks/events/:eventId`
  - `POST /api/admin/payments/webhooks/events/:eventId/replay`
  - `GET /api/admin/payments/reconciliation/health`
  - `GET /api/admin/settings/system-notifications/payment-ops`
  - `PATCH /api/admin/settings/system-notifications/payment-ops`
  - `POST /api/admin/settings/system-notifications/payment-ops/test`
- End-to-end live payment flow is now wired through the repo. `rezeis-admin` owns provider checkout creation, public/internal webhook ingress, webhook inbox dedup, reconciliation queue processing, and automatic subscription mutation/provisioning trigger creation. `ruid` mirrors checkout/status through cookie-authenticated public endpoints, and `ruid/web` now starts payment from `/quote` and polls `/payments/result` until reconciliation settles.
  Files: `rezeis-admin/src/modules/payments/`, `ruid/app/api/endpoints/payments.py`, `ruid/app/services/payments_service.py`, `ruid/web/src/features/payments/`, `ruid/web/src/features/quote/quote-page.tsx`
  Endpoints:
  - `POST /api/internal/payments/checkout`
  - `GET /api/internal/payments/:paymentId`
  - `POST /api/v1/payments/checkout`
  - `GET /api/v1/payments/:paymentId`
- Payment hardening v1 is now shipped in `rezeis-admin`. The service now exposes public and internal webhook ingress for the fixed six-gateway set, normalizes incoming provider payloads into one canonical envelope, stores deduplicated inbox records keyed by `gatewayType + providerEventId`, and marks accepted deliveries as enqueued without enabling live provider execution.
  Files: `rezeis-admin/src/modules/payments/`, `rezeis-admin/prisma/schema.prisma`, `rezeis-admin/prisma/migrations/20260419000000_init/`
  Endpoints:
  - `POST /api/v1/payments/webhooks/:gatewayType`
  - `POST /api/internal/payments/webhooks/:gatewayType`
- Session-only quote read edge is now shipped end-to-end. `rezeis-admin` exposes internal subscription action-policy and quote reads, `ruid` mirrors them as authenticated `/api/v1/subscription/*` reads with cookie-session `userId` enforcement, and `ruid/web` exposes a dedicated `/quote` route for action-policy + quote preview without transaction draft creation.
  Files: `rezeis-admin/src/modules/subscriptions/`, `ruid/app/schemas/subscription_quote.py`, `ruid/app/api/endpoints/subscription.py`, `ruid/app/services/subscription_service.py`, `ruid/app/services/internal_admin_client.py`, `ruid/web/src/features/quote/`, `ruid/web/src/app/router.tsx`
  Endpoints:
  - `POST /api/internal/subscriptions/action-policy`
  - `POST /api/internal/subscriptions/quote`
  - `POST /api/v1/subscription/action-policy`
  - `POST /api/v1/subscription/quote`
- The first AltShop-derived plans/catalog/pricing vertical slice is now real. `rezeis-admin` owns plan CRUD, archive/delete guardrails, availability filtering, gateway-aware catalog pricing, and the internal read projection consumed by `ruid`. `rezeis-admin/web` now exposes a real `/catalog/plans` operator route instead of a placeholder, and `ruid` now reads plans through the new internal catalog route while keeping `/api/v1/plans` public-but-session-aware.
  Files: `rezeis-admin/src/modules/plans/`, `rezeis-admin/web/src/features/catalog/`, `rezeis-admin/web/src/app/router.tsx`, `rezeis-admin/web/src/components/layout/admin-shell.tsx`, `ruid/app/api/endpoints/plans.py`, `ruid/app/services/plans_service.py`, `ruid/app/schemas/plans.py`, `ruid/web/src/features/plans/`
  Endpoints:
  - `GET /api/admin/plans`
  - `GET /api/admin/plans/:planId`
  - `POST /api/admin/plans`
  - `PATCH /api/admin/plans/:planId`
  - `PATCH /api/admin/plans/:planId/move`
  - `DELETE /api/admin/plans/:planId`
  - `GET /api/internal/catalog/plans`
- The logical split is still intact: `rezeis-admin` remains the business source of truth and `ruid` remains the thin public edge.
  Files: `docs/architecture/service-boundaries.md`, `ruid/SPEC.md`, `rezeis-admin/src/modules/internal-user/`, `ruid/app/services/`, `ruid/web/src/`
- `rezeis-admin` still owns the internal user/session contract, linked web-account truth, password handoff, linked email-verification challenge issuance, linked email-verification completion, platform policy projection, admin auth, the plans/catalog slice, and health/test endpoints.
  Files: `rezeis-admin/src/main.ts`, `rezeis-admin/src/app.controller.ts`, `rezeis-admin/src/modules/auth/auth.controller.ts`, `rezeis-admin/src/modules/auth/controllers/internal-admin.controller.ts`, `rezeis-admin/src/modules/internal-user/controllers/internal-user.controller.ts`, `rezeis-admin/src/modules/internal-user/services/internal-user.service.ts`, `rezeis-admin/src/modules/plans/`, `rezeis-admin/src/modules/settings/controllers/settings.controller.ts`, `rezeis-admin/src/modules/settings/controllers/internal-platform-policy.controller.ts`, `rezeis-admin/src/modules/health/health.controller.ts`, `rezeis-admin/src/modules/email/services/email.service.ts`, `rezeis-admin/src/common/config/env.schema.ts`
  Endpoints:
  - `GET /api`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `GET /api/admin/settings/platform`
  - `PATCH /api/admin/settings/platform`
  - `POST /api/v1/payments/webhooks/:gatewayType`
  - `GET /api/internal/user/session`
  - `PATCH /api/internal/user/session/rules-acceptance`
  - `PATCH /api/internal/user/session/web-account-link-prompt-snooze`
  - `PATCH /api/internal/user/session/web-account-password`
  - `PATCH /api/internal/user/session/web-account-email-verification-challenge`
  - `PATCH /api/internal/user/session/web-account-email-verification-completion`
  - `GET /api/internal/user/plans`
  - `GET /api/internal/catalog/plans`
  - `GET /api/internal/user/subscription`
  - `POST /api/internal/subscriptions/action-policy`
  - `POST /api/internal/subscriptions/quote`
  - `POST /api/internal/payments/checkout`
  - `GET /api/internal/payments/:paymentId`
  - `POST /api/internal/payments/webhooks/:gatewayType`
  - `GET /api/internal/settings/platform-policy`
  - `GET /api/health`
  - `GET /api/internal/test`
  - `POST /api/internal/bootstrap-admin`
- `ruid` still mirrors that narrow admin-owned contract through its public cookie-backed edge. Public backend authentication entry paths now include Telegram bootstrap and linked web-account sign-in, and plan reads now use the richer internal catalog projection while remaining public to anonymous browsers.
  Files: `ruid/app/main.py`, `ruid/app/api/router.py`, `ruid/app/api/endpoints/auth.py`, `ruid/app/api/endpoints/session.py`, `ruid/app/api/endpoints/plans.py`, `ruid/app/api/endpoints/platform_policy.py`, `ruid/app/api/endpoints/subscription.py`, `ruid/app/services/internal_admin_client.py`, `ruid/app/services/session_service.py`, `ruid/app/services/session_store.py`, `ruid/app/core/config.py`, `ruid/app/schemas/session.py`, `ruid/app/schemas/session_web_account_password.py`, `ruid/app/schemas/session_web_account_email_verification_completion.py`, `ruid/app/schemas/web_account_email_verification_challenge.py`
  Endpoints:
  - `GET /`
  - `GET /api/v1/health`
  - `POST /api/v1/auth/telegram/bootstrap`
  - `POST /api/v1/auth/web-account/sign-in`
  - `GET /api/v1/session`
  - `PATCH /api/v1/session/rules-acceptance`
  - `PATCH /api/v1/session/web-account-link-prompt-snooze`
  - `PATCH /api/v1/session/web-account-password`
  - `PATCH /api/v1/session/web-account-email-verification-challenge`
  - `PATCH /api/v1/session/web-account-email-verification-completion`
  - `GET /api/v1/plans`
  - `GET /api/v1/platform-policy`
  - `GET /api/v1/subscription`
  - `POST /api/v1/subscription/action-policy`
  - `POST /api/v1/subscription/quote`
  - `POST /api/v1/payments/checkout`
  - `GET /api/v1/payments/:paymentId`
- `ruid/web` still ships the routed user shell and linked-account follow-up UI. The browser router now exposes the dashboard, plans, subscription, quote, linked web-account, and standalone sign-in pages, and the plans page now renders gateway-aware price snapshots instead of simple currency pills.
  Files: `ruid/web/src/app/router.tsx`, `ruid/web/src/features/auth/auth-api.ts`, `ruid/web/src/features/auth/auth-provider.tsx`, `ruid/web/src/features/auth/auth-required-state.tsx`, `ruid/web/src/features/dashboard/dashboard-page.tsx`, `ruid/web/src/features/plans/plans-page.tsx`, `ruid/web/src/features/subscription/subscription-page.tsx`, `ruid/web/src/features/web-account/web-account-page.tsx`, `ruid/web/src/features/session/session-api.ts`
  Routes:
  - `/`
  - `/plans`
  - `/subscription`
  - `/quote`
  - `/payments/result`
  - `/web-account`
  - `/sign-in`
- Linked email verification is closed end to end inside an already authenticated session. The admin side issues and validates the code, `ruid` mirrors the writes, and `ruid/web` can issue, re-issue, and complete verification in place.
  Files: `rezeis-admin/src/modules/internal-user/controllers/internal-user.controller.ts`, `rezeis-admin/src/modules/internal-user/services/internal-user.service.ts`, `rezeis-admin/src/modules/internal-user/dto/complete-web-account-email-verification.dto.ts`, `rezeis-admin/src/modules/email/services/email.service.ts`, `ruid/app/api/endpoints/session.py`, `ruid/app/services/session_service.py`, `ruid/app/services/internal_admin_client.py`, `ruid/web/src/features/session/session-api.ts`, `ruid/web/src/features/web-account/web-account-page.tsx`, `ruid/web/src/features/dashboard/dashboard-page.tsx`
  Behavior:
  - `PATCH /api/internal/user/session/web-account-email-verification-challenge` creates or rotates one active code challenge for the current linked `WebAccount`
  - `PATCH /api/internal/user/session/web-account-email-verification-completion` consumes the latest active code challenge, decrements remaining attempts on invalid codes, marks `AuthChallenge.consumedAt`, and sets `WebAccount.emailVerifiedAt` on success
  - `PATCH /api/v1/session/web-account-email-verification-challenge` forwards only the authenticated cookie-session user id and returns a narrow challenge payload
  - `PATCH /api/v1/session/web-account-email-verification-completion` forwards only the authenticated cookie-session user id plus the submitted six-digit code and returns the refreshed session on success
- Telegram bootstrap plus linked web-account sign-in now both write the opaque Redis-backed `ruid_session` cookie.
  Files: `ruid/app/api/endpoints/auth.py`, `ruid/app/api/dependencies.py`, `ruid/app/services/telegram_auth_service.py`, `ruid/app/services/session_store.py`, `ruid/app/core/config.py`, `ruid/web/src/features/auth/auth-api.ts`, `ruid/web/src/features/auth/auth-provider.tsx`, `ruid/web/src/features/auth/auth-required-state.tsx`
  Behavior:
  - `POST /api/v1/auth/telegram/bootstrap` reads Telegram `initData` from `Authorization: tma ...`
  - validates Telegram signature and `auth_date` freshness
  - validates browser origin against the normalized allowlist from `RUID_PUBLIC_WEB_URL` and `RUID_BROWSER_ALLOWED_ORIGINS`
  - resolves the canonical session payload from `rezeis-admin`
  - writes an opaque Redis-backed `ruid_session` cookie
  - tolerates subscription-read failure after a successful session bootstrap
  - `POST /api/v1/auth/web-account/sign-in` accepts linked login/password, delegates credential verification to `rezeis-admin`, maps invalid credentials to `401`, maps not-ready linked-account states to `400`, and writes the same opaque cookie session on success
  - `/sign-in` submits linked credentials, invalidates session/subscription/platform-policy queries, and returns to the authenticated shell on success
- Deployment wiring still supports bundled production, split deployment, and local dev. The env templates still document secure-by-default cookie settings for production-like modes and explicit insecure-cookie override for local HTTP dev.
  Files: `docker-compose.yml`, `docker-compose.dev.yml`, `docker-compose.external.admin.yml`, `docker-compose.external.user.yml`, `.env.example`, `.env.dev.example`, `.env.external.admin.example`, `.env.external.user.example`, `docs/install/deployment-modes.md`, `docs/install/environment-variables.md`, `ruid/web/src/lib/env.ts`, `ruid/web/vite.config.ts`, `ruid/app/core/config.py`
  Behavior:
  - full-stack compose exposes `rezeis-admin-api`, `rezeis-admin-worker`, `ruid-api`, `ruid-worker`, `rezeis-web`, and `ruid-web`
  - split admin-side compose exposes `rezeis-admin-api`, `rezeis-admin-worker`, and `rezeis-web`, with the API healthcheck probing `http://127.0.0.1:3000/api/health`
  - split user-side compose exposes `ruid-api`, `ruid-worker`, and `ruid-web`, binds them on loopback-only host ports, and keeps `ruid-web` proxying to `RUID_API_UPSTREAM=http://ruid-api:8000`
  - dev compose mounts `rezeis-admin`, `rezeis-admin/web`, and `ruid` source trees directly into their containers, while `ruid-web` points its dev proxy to `VITE_DEV_API_PROXY_TARGET=http://ruid-api:8000`
  - `ruid/web` defaults to same-origin `/api/v1` requests when `VITE_RUID_API_URL` is unset

## Test Coverage Present

- `rezeis-admin` contains package-local coverage for the shipped admin auth, internal-user reads and writes, the new plans/catalog slice, payment webhook controllers/normalizers/inbox ingress, payment draft reuse, internal payment checkout/status controllers, and platform-policy/health slices.
  Files: `rezeis-admin/test/internal-user.service.spec.ts`, `rezeis-admin/test/internal-user.controller.spec.ts`, `rezeis-admin/test/admin-plans.controller.spec.ts`, `rezeis-admin/test/internal-plan-catalog.controller.spec.ts`, `rezeis-admin/test/plan-catalog.service.spec.ts`, `rezeis-admin/test/plans-admin.service.spec.ts`, `rezeis-admin/test/pricing.service.spec.ts`, `rezeis-admin/test/complete-web-account-email-verification.dto.spec.ts`, `rezeis-admin/test/internal-user-session-query.dto.spec.ts`, `rezeis-admin/test/email.service.spec.ts`, `rezeis-admin/test/email.config.spec.ts`, `rezeis-admin/test/env.schema.spec.ts`, `rezeis-admin/test/settings.service.spec.ts`, `rezeis-admin/test/internal-platform-policy.controller.spec.ts`, `rezeis-admin/test/auth.controller.spec.ts`, `rezeis-admin/test/admin-auth.service.spec.ts`, `rezeis-admin/test/settings.controller.spec.ts`, `rezeis-admin/test/health.controller.spec.ts`, `rezeis-admin/test/internal-admin.controller.spec.ts`, `rezeis-admin/test/current-admin.decorator.spec.ts`, `rezeis-admin/test/current-internal-request.decorator.spec.ts`
  Entry point:
  - `rezeis-admin/package.json` -> `npm test`
- `ruid` backend contains coverage for Telegram bootstrap, stale-session invalidation, current-session reads and writes, payment checkout/status mirrors, verification-challenge issuance, verification-code completion, and internal admin-client mapping.
  Files: `ruid/tests/test_app_bootstrap.py`, `ruid/tests/test_auth_endpoints.py`, `ruid/tests/test_session_endpoints.py`, `ruid/tests/test_subscription_endpoints.py`, `ruid/tests/test_platform_policy_endpoints.py`, `ruid/tests/test_plans_endpoints.py`, `ruid/tests/test_dependencies.py`, `ruid/tests/test_internal_admin_client.py`, `ruid/tests/test_session_store.py`, `ruid/tests/test_settings.py`, `ruid/tests/test_test_command.py`
  Entry point:
  - `ruid/pyproject.toml` -> `uv run ruid-test`
- `ruid/web` contains route and UI coverage for auth state handling, router shell rendering, dashboard readiness rendering, plans/subscription/quote/payment-result routes, payment checkout/status parsing, quote pay CTA behavior, linked-account password handoff, challenge issuance, and verification-code completion.
  Files: `ruid/web/src/app/router.test.tsx`, `ruid/web/src/features/auth/auth-provider.test.tsx`, `ruid/web/src/features/auth/auth-api.test.ts`, `ruid/web/src/features/auth/auth-required-state.test.tsx`, `ruid/web/src/features/dashboard/dashboard-page.test.tsx`, `ruid/web/src/features/plans/plans-page.test.tsx`, `ruid/web/src/features/subscription/get-subscription-diagnostics.test.ts`, `ruid/web/src/features/subscription/subscription-page.test.tsx`, `ruid/web/src/features/web-account/web-account-page.test.tsx`
  Entry point:
  - `ruid/web/package.json` -> `npm test`
- `rezeis-admin/web` now contains local Vitest smoke coverage for router access and core admin verticals (`catalog`, `payments`, `subscriptions`, `remnawave`) with safe empty/error rendering checks for API-backed pages.
  Files: `rezeis-admin/web/src/app/router.smoke.test.tsx`, `rezeis-admin/web/src/features/catalog/plans-page.smoke.test.tsx`, `rezeis-admin/web/src/features/payments/*.smoke.test.tsx`, `rezeis-admin/web/src/features/subscriptions/subscription-quote-page.smoke.test.tsx`, `rezeis-admin/web/src/features/remnawave/remnawave-page.smoke.test.tsx`, `rezeis-admin/web/src/test/setup-tests.ts`, `rezeis-admin/web/src/test/test-utils.tsx`
  Entry point:
  - `rezeis-admin/web/package.json` -> `npm test`

## Local Quality Gate

- Canonical pre-commit verification sequence is documented in `docs/progress/local-quality-gate.md`.
- The sequence now includes `rezeis-admin/web` test + build instead of build-only validation.

## Open Architectural Risks

- Public auth is no longer Telegram-only: the linked web-account backend endpoint and `/sign-in` browser route are present. The remaining auth gap is standalone password recovery outside reopening the Mini App with valid Telegram launch data.
  Files: `ruid/app/api/endpoints/auth.py`, `ruid/web/src/features/auth/auth-api.ts`, `ruid/web/src/features/auth/auth-required-state.tsx`, `ruid/web/src/features/web-account/web-account-page.tsx`, `rezeis-admin/prisma/schema.prisma`
- Cookie persistence remains deployment-sensitive whenever `ruid-web` and `ruid-api` are split across origins or subdomains.
  Files: `ruid/app/core/config.py`, `ruid/app/main.py`, `ruid/web/src/lib/env.ts`, `.env.example`, `.env.dev.example`, `.env.external.user.example`, `docs/install/deployment-modes.md`, `docs/install/environment-variables.md`
- Provider verification with real merchant кабинеты is still an operational risk. The code path is live-capable for all 6 gateways, but successful production rollout still depends on valid credentials, provider dashboard webhook setup, and live-provider validation.
  Files: `rezeis-admin/src/modules/payments/`, `.env.example`, `.env.dev.example`, `.env.external.admin.example`
- Linked email-verification challenge issuance still depends on valid admin-side SMTP configuration.
  Files: `rezeis-admin/src/common/config/env.schema.ts`, `rezeis-admin/src/modules/email/services/email.service.ts`, `.env.example`, `.env.dev.example`, `.env.external.admin.example`, `docs/install/environment-variables.md`

## Current Scope Boundary

- The public user edge currently exposes two public auth routes, five authenticated current-session mutation routes, and two authenticated quote-read routes: `POST /api/v1/auth/telegram/bootstrap`, `POST /api/v1/auth/web-account/sign-in`, `PATCH /api/v1/session/rules-acceptance`, `PATCH /api/v1/session/web-account-link-prompt-snooze`, `PATCH /api/v1/session/web-account-password`, `PATCH /api/v1/session/web-account-email-verification-challenge`, `PATCH /api/v1/session/web-account-email-verification-completion`, `POST /api/v1/subscription/action-policy`, and `POST /api/v1/subscription/quote`.
- Payment webhooks now terminate on the admin service, not on `ruid`.
- Payment checkout/status surfaces now exist in `ruid`, but payment execution truth still remains admin-owned.
- `rezeis-admin` still owns billing, subscription truth, entitlement truth, rules policy, platform-policy truth, linked-account persistence, challenge state, and verification outcomes.
- `ruid` still owns Telegram bootstrap, cookie-session issuance, browser-origin validation, and mirroring of admin-owned session, plans, subscription, and platform-policy results.
- Standalone end-user web sign-in, standalone password recovery, billing writes, subscription mutation, and entitlement changes are still outside the shipped public edge.
- This refresh inspected the source, config, and test files named above and executed `rezeis-admin` lint/tests, `ruid` pytest, `ruid/web` vitest + build, and `rezeis-admin/web` vitest + build.
