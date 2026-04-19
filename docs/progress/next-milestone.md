# Next Milestone

## Milestone

Production rollout and provider validation for the live payment flow: verify credentials, webhook setup, and transaction-to-subscription completion against real provider cabinets.

## Why This Is Next

- The end-to-end application flow now exists in code: quote -> checkout -> provider -> webhook/result polling -> reconciliation -> subscription mutation.
- The remaining risk is operational correctness with real provider environments, not missing repo architecture.
- The user already confirmed live access is strongest for `YOOKASSA`, `TELEGRAM_STARS`, `PLATEGA`, and `HELEKET`, so those should be validated first before trusting the remaining gateways.

## Concrete Tasks

0. Run the canonical local quality gate before any provider rollout step.
- Use `docs/progress/local-quality-gate.md`.
- Do not start provider validation while any service in that sequence is red.
- Use Payment Ops Center during validation: webhook inbox, reconciliation health, safe replay, and Telegram alert test should be checked before the first live payment.

1. Verify live provider credentials and callbacks.
- Configure real settings in admin for each gateway.
- Point provider dashboards to the correct `REZEIS_ADMIN_PUBLIC_BASE_URL/api/v1/payments/webhooks/{gatewayType}`.
- Validate return flow to `RUID_PUBLIC_WEB_URL/payments/result`.

2. Run staged transaction validation.
- `YOOKASSA`, `TELEGRAM_STARS`, `PLATEGA`, `HELEKET` first.
- Only then validate `CRYPTOMUS` and `MULENPAY`.

3. Add operator visibility and replay tooling.
- Surface failed reconciliation and webhook inbox diagnostics in admin UI.
- Add safe replay for webhook events that failed processing.

4. Tighten provider-specific edge cases.
- Confirm `TELEGRAM_STARS` pre-checkout/update behavior in production.
- Confirm provider status mapping, refund/cancel semantics, and idempotent replays.

## Open Risks To Carry Forward

- Real provider payloads can still diverge from sandbox/assumed formats.
- Dashboard-level webhook setup remains an operational dependency outside the repo.
- Subscription mutation is now live-capable, so bad provider config has higher blast radius than before.
