# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.7.x   | ✅         |
| < 0.7   | ❌         |

## Reporting a Vulnerability

If you discover a security vulnerability in Rezeis, please report it privately:

1. **Do not** open a public issue or PR
2. Contact the maintainers via the secure channel listed in the repository
3. Provide a clear description of the vulnerability, including:
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Security Measures

Rezeis implements the following security controls:

- **Authentication**: JWT + 2FA (TOTP) + WebAuthn/Passkey support
- **Authorization**: RBAC with granular permissions
- **CORS**: Strict origin validation in production (no wildcard `*`)
- **CSP**: Content Security Policy enabled in production via Helmet
- **Input Validation**: class-validator + Zod schemas on all inputs
- **API Tokens**: SHA-256 hashed with 180-day TTL and audience restriction
- **Data Sanitization**: Payment diagnostics and webhook payloads are redacted before storage/response
- **Docker**: Non-root user in production images, log rotation, network isolation
- **Secrets**: Environment variables only — no hardcoded credentials in compose/config files

## Security Scanning

- Docker images are scanned with Trivy on every publish
- `npm audit` is part of the CI pipeline
- Dependabot alerts are monitored

## Responsible Disclosure

We follow a 90-day disclosure timeline. After a fix is released, we will publicly acknowledge the reporter (with their permission) in the release notes.
