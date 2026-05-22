/** BullMQ queue name for backup operations. */
export const BACKUP_QUEUE = 'backup';

/** Job names within the backup queue. */
export const BACKUP_JOBS = {
  /** Create a new pg_dump backup. */
  CREATE: 'backup.create',
  /** Restore a backup from file. */
  RESTORE: 'backup.restore',
  /** Deliver a completed backup to Telegram. */
  DELIVER_TELEGRAM: 'backup.deliver-telegram',
} as const;
