# Contributing to Rezeis

Thank you for your interest in contributing to Rezeis!

## Development Setup

1. Clone the repository
2. Install backend dependencies: `npm ci`
3. Install frontend dependencies: `cd web && npm ci`
4. Run Prisma generate: `npm run prisma:generate`
5. Start development: `npm run start:dev` (backend) and `cd web && npm run dev` (frontend)

## Quality Gates

Before submitting a pull request, ensure all quality gates pass:

```bash
# Backend
cd rezeis-admin
npm run typecheck
npm run lint
npm test

# Frontend
cd rezeis-admin/web
npx tsc -p tsconfig.app.json --noEmit --incremental false
npm test
npm run lint
npm run build
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with clear, focused commits
3. Ensure all quality gates pass (see above)
4. Update documentation if needed
5. Submit a PR with a clear description of changes

## Code Style

- Backend: NestJS with TypeScript (relaxed strict mode during transition)
- Frontend: React 19 + Vite 8 + Tailwind 4 + shadcn/ui
- Follow existing patterns in the codebase
- Use i18n for all user-facing strings in the frontend
- Add tests for new features and bug fixes

## Security

- Never commit secrets, API keys, or `.env` files
- Report security vulnerabilities privately (see [SECURITY.md](./SECURITY.md))
