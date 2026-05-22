/** BullMQ queue name for import operations. */
export const IMPORT_QUEUE = 'import';

/** Job names within the import queue. */
export const IMPORT_JOBS = {
  /** Run a full import (remnawave API pull, or file-based). */
  RUN: 'import.run',
  /** Bulk plan assignment after import. */
  ASSIGN_PLAN: 'import.assign-plan',
} as const;

/** Batch size for processing records within a single job. */
export const IMPORT_BATCH_SIZE = 100;
