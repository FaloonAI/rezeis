# Rezeis / Reiwa / Remnawave Audit

Audit baseline: Rezeis v0.9.7.17, Reiwa v0.9.7.13, Remnawave Backend 3.3.2.

The full working report is maintained locally in the shared workspace. Key verified points:

- Rezeis Remnawave contract/addressing/strict adapter tests pass 169/169.
- Rezeis profile-sync processor tests pass 79/79 after Prisma Client generation.
- Reiwa device route tests pass 16/16.
- Reiwa backend typecheck passes.
- Rezeis supports Remnawave 2.x UUID and 3.x numeric user identities, including legacy profile recovery and HWID operations.
- Rezeis distinguishes confirmed missing profiles from transient panel failures in the adapter and re-provisions after a genuine upstream 404.
- The remaining operator-facing gap is that local subscription cards do not expose a single upstream reconciliation state such as SYNCED, PENDING, MISSING, UNAVAILABLE, FAILED, or CONFLICT.
- User-list pagination/search contract requires further alignment between backend DTOs and frontend behavior.

No production deployment was performed during this audit.
