/** BullMQ queue name for broadcast delivery jobs. */
export const BROADCAST_DELIVERY_QUEUE = 'broadcast-delivery';

/** Job names within the broadcast queue. */
export const BROADCAST_JOBS = {
  /** Stage recipients and kick off batch delivery. */
  START: 'broadcast.start',
  /** Deliver a single batch of messages (text or media). */
  DELIVER_BATCH: 'broadcast.deliver-batch',
  /** Edit already-sent messages (editMessageText / editMessageCaption). */
  EDIT_BATCH: 'broadcast.edit-batch',
  /** Delete already-sent messages (deleteMessage). */
  DELETE_BATCH: 'broadcast.delete-batch',
  /** Retry failed messages from a previous delivery attempt. */
  RETRY_FAILED: 'broadcast.retry-failed',
} as const;

/** Batch size for splitting message arrays into jobs. */
export const BROADCAST_BATCH_SIZE = 50;

/** Delay between Telegram API calls (ms). ~30 msg/sec limit. */
export const TELEGRAM_RATE_LIMIT_MS = 50;
