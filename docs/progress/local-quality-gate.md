# Local Quality Gate

Canonical pre-commit verification sequence for the current Rezeis repo shape.

Run from the repository root (`rezeis/`) in this exact order:

1. `cd rezeis-admin && npm run lint && npm test`
2. `cd ../ruid && uv run ruid-test`
3. `cd web && npm test && npm run build`
4. `cd ../../rezeis-admin/web && npm test && npm run build`

Notes:

- Keep this sequence strict so backend and both web shells are validated together.
- `rezeis-admin/web` smoke coverage is intentionally route/feature focused and should stay lightweight.
