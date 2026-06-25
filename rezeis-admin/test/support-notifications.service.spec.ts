import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SupportNotificationsService } from '../src/modules/support-tickets/services/support-notifications.service';

/**
 * Operator→user support reply delivery (Phase 1). Verifies the reply is
 * routed through UserNotificationsService with a localized, HTML-escaped
 * body; that guest tickets are skipped; and that a delivery failure is
 * swallowed (never blocks the operator's reply).
 */

interface CreateCall {
  userId: string;
  type: string;
  payload: Record<string, unknown>;
  preRenderedText?: string;
}

function build(opts?: { throwOnCreate?: boolean; guestEmail?: string | null; sendThrows?: boolean; template?: unknown }): {
  service: SupportNotificationsService;
  calls: CreateCall[];
  emails: Array<{ to: string; subject: string; rawHtml?: string }>;
  tokensIssued: string[];
} {
  const calls: CreateCall[] = [];
  const emails: Array<{ to: string; subject: string; rawHtml?: string }> = [];
  const tokensIssued: string[] = [];
  const userNotifications = {
    create: async (input: CreateCall): Promise<string> => {
      if (opts?.throwOnCreate) throw new Error('db down');
      calls.push(input);
      return 'evt-1';
    },
  };
  const prisma = {
    supportTicket: {
      findUnique: async () => ({
        subject: 'Оплата',
        guestId: 'g-1',
        guest: { id: 'g-1', email: opts?.guestEmail ?? null },
      }),
    },
    settings: {
      findFirst: async () => ({ brandingSettings: { websiteUrl: 'https://app.example.com/' } }),
    },
  };
  const emailDelivery = {
    send: async (payload: { to: string; subject: string; rawHtml?: string }) => {
      if (opts?.sendThrows) throw new Error('smtp down');
      emails.push(payload);
    },
  };
  const guestService = {
    issueEmailResumeToken: async (guestId: string) => {
      tokensIssued.push(guestId);
      return 'resume-tok';
    },
  };
  const templatesService = {
    // Default: no seeded row → notifyAdminReply uses the built-in fallback copy.
    getByType: async () => opts?.template ?? null,
  };
  const service = new SupportNotificationsService(
    userNotifications as never,
    prisma as never,
    emailDelivery as never,
    guestService as never,
    templatesService as never,
  );
  return { service, calls, emails, tokensIssued };
}

describe('SupportNotificationsService.notifyAdminReply', () => {
  it('delivers a localized RU reply notification to the ticket owner', async () => {
    const { service, calls } = build();
    await service.notifyAdminReply({
      ticketId: 't-1',
      subject: 'Оплата не прошла',
      user: { id: 'u-1', language: 'RU' },
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].userId, 'u-1');
    assert.equal(calls[0].type, 'support_reply');
    assert.equal(calls[0].payload.ticketId, 't-1');
    assert.equal(calls[0].payload.subject, 'Оплата не прошла');
    // Title + body are mirrored into the payload (not just preRenderedText) so
    // the cabinet feed renders real copy instead of "text unavailable".
    assert.match(String(calls[0].payload.title ?? ''), /Поддержка ответила/);
    assert.match(String(calls[0].payload.text ?? ''), /Оплата не прошла/);
    assert.match(calls[0].preRenderedText ?? '', /Поддержка ответила/);
    assert.match(calls[0].preRenderedText ?? '', /Оплата не прошла/);
  });

  it('uses the operator-edited support_reply template (copy + button) and auto-appends the ticket id', async () => {
    const template = {
      title: '💬 Поддержка ответила',
      titleEn: '💬 Support replied',
      body: 'Новый ответ по «{{subject}}». Откройте раздел поддержки.',
      bodyEn: 'New reply for "{{subject}}".',
      buttons: [
        { labelRu: ':support: Открыть обращение', labelEn: ':support: Open ticket', kind: 'webApp', target: '/support' },
      ],
    };
    const { service, calls } = build({ template });
    await service.notifyAdminReply({
      ticketId: 't-9',
      subject: 'Оплата не прошла',
      user: { id: 'u-9', language: 'RU' },
    });
    assert.equal(calls.length, 1);
    // Body comes from the template with {{subject}} substituted.
    assert.match(String(calls[0].payload.text ?? ''), /Новый ответ по «Оплата не прошла»/);
    // Button keeps the operator's premium-emoji token and gets the ticket id.
    const buttons = (calls[0] as { buttons?: Array<{ text: string; webAppPath?: string }> }).buttons ?? [];
    assert.equal(buttons.length, 1);
    assert.equal(buttons[0].text, ':support: Открыть обращение');
    assert.equal(buttons[0].webAppPath, '/support?ticket=t-9');
  });

  it('falls back to English for non-RU locales', async () => {
    const { service, calls } = build();
    await service.notifyAdminReply({
      ticketId: 't-2',
      subject: 'Refund',
      user: { id: 'u-2', language: 'EN' },
    });
    assert.equal(calls.length, 1);
    assert.match(calls[0].preRenderedText ?? '', /Support replied/);
  });

  it('escapes HTML in the subject to keep Telegram HTML mode safe', async () => {
    const { service, calls } = build();
    await service.notifyAdminReply({
      ticketId: 't-3',
      subject: '<b>x</b> & y',
      user: { id: 'u-3', language: 'EN' },
    });
    const text = calls[0].preRenderedText ?? '';
    assert.match(text, /&lt;b&gt;x&lt;\/b&gt; &amp; y/);
    assert.doesNotMatch(text, /<b>x<\/b>/);
  });

  it('skips delivery for guest tickets (no account user)', async () => {
    const { service, calls } = build();
    await service.notifyAdminReply({ ticketId: 't-4', subject: 'Guest', user: null });
    assert.equal(calls.length, 0);
  });

  it('never throws when delivery fails (operator reply stays unaffected)', async () => {
    const { service } = build({ throwOnCreate: true });
    await assert.doesNotReject(
      service.notifyAdminReply({ ticketId: 't-5', subject: 'X', user: { id: 'u-5', language: 'RU' } }),
    );
  });
});

describe('SupportNotificationsService.notifyGuestReply', () => {
  it('emails a guest with a resume link when an email is on file', async () => {
    const { service, emails, tokensIssued } = build({ guestEmail: 'visitor@example.com' });
    await service.notifyGuestReply('t-1');
    assert.equal(emails.length, 1);
    assert.equal(emails[0].to, 'visitor@example.com');
    assert.deepEqual(tokensIssued, ['g-1']);
    // Link uses the branding website base + the issued resume token.
    assert.match(emails[0].rawHtml ?? '', /https:\/\/app\.example\.com\/support\/guest\?resume=resume-tok/);
  });

  it('skips the email when the guest left no contact', async () => {
    const { service, emails, tokensIssued } = build({ guestEmail: null });
    await service.notifyGuestReply('t-1');
    assert.equal(emails.length, 0);
    assert.equal(tokensIssued.length, 0);
  });

  it('never throws when the email send fails', async () => {
    const { service } = build({ guestEmail: 'visitor@example.com', sendThrows: true });
    await assert.doesNotReject(service.notifyGuestReply('t-1'));
  });
});
