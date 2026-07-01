import { Injectable, Logger } from '@nestjs/common';
import { promises as dns } from 'node:dns';

import { DISPOSABLE_EMAIL_DOMAINS } from '../data/disposable-domains';
import { EmailPolicyResult, ExternalAuthPolicy } from '../interfaces/external-auth.interface';

/**
 * Disposable / one-time email defense (Requirement 5).
 *
 * Pure and side-effect-free apart from the optional best-effort MX lookup.
 * Applied to manually typed emails and to provider emails NOT asserted
 * verified; verified provider emails bypass it (Requirement 5.5) and are never
 * passed here by the resolve engine.
 */
@Injectable()
export class DisposableEmailService {
  private readonly logger = new Logger(DisposableEmailService.name);
  private readonly bundled: ReadonlySet<string> = new Set(DISPOSABLE_EMAIL_DOMAINS);

  /**
   * Checks an email against the configured policy. Returns `{ allowed: true }`
   * for an empty email (absence is validated elsewhere) and for mode `off`.
   */
  public async check(email: string | null | undefined, policy: ExternalAuthPolicy): Promise<EmailPolicyResult> {
    if (!email || policy.mode === 'off') return { allowed: true };
    const domain = extractDomain(email);
    if (domain === null) return { allowed: true };

    if (policy.mode === 'allowlist') {
      const allowlist = new Set(policy.allowlist.map((d) => d.toLowerCase()));
      return allowlist.has(domain) ? { allowed: true } : { allowed: false, reason: 'not_allowlisted' };
    }

    // blocklist / blocklist_mx
    const custom = new Set(policy.customBlocklist.map((d) => d.toLowerCase()));
    if (this.bundled.has(domain) || custom.has(domain)) {
      return { allowed: false, reason: 'disposable' };
    }

    if (policy.mode === 'blocklist_mx') {
      const resolvable = await this.hasMailRecords(domain);
      if (!resolvable) return { allowed: false, reason: 'no_mx' };
    }

    return { allowed: true };
  }

  /**
   * Best-effort DNS check: a domain with neither MX nor A/AAAA records cannot
   * receive mail. Any lookup error is treated as "no records" for MX mode.
   */
  private async hasMailRecords(domain: string): Promise<boolean> {
    try {
      const mx = await dns.resolveMx(domain);
      if (mx.length > 0) return true;
    } catch {
      // fall through to A/AAAA probe
    }
    try {
      const a = await dns.resolve(domain);
      return a.length > 0;
    } catch {
      return false;
    }
  }
}

/** Extracts the lower-cased domain from an email, or `null` when malformed. */
function extractDomain(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at <= 0 || at === email.length - 1) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return domain.length > 0 && domain.includes('.') ? domain : null;
}
