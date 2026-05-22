/** BullMQ queue name for email delivery. */
export const EMAIL_QUEUE = 'email-delivery';

/** Job names within the email queue. */
export const EMAIL_JOBS = {
  /** Send a single email. */
  SEND: 'email.send',
  /** Send a test email to verify SMTP config. */
  TEST: 'email.test',
} as const;
