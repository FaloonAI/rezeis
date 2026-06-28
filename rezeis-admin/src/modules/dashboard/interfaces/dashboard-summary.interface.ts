/**
 * Bounded KPI snapshot exposed by `GET /admin/dashboard/summary`.
 *
 * The contract is intentionally narrow — it must not leak provider tokens,
 * raw payloads, or per-user identifiers. Every field is a counter, enum
 * code, or operator-safe label.
 *
 * Shape mirrors `web/src/features/dashboard/dashboard-api.ts` 1:1 so the
 * UI can render every panel without conditional fallbacks.
 */

export type DashboardMetricCode =
  | 'TOTAL_USERS'
  | 'BLOCKED_USERS'
  | 'NEW_USERS_7D'
  | 'ACTIVE_SUBSCRIPTIONS'
  | 'LIMITED_SUBSCRIPTIONS'
  | 'EXPIRED_SUBSCRIPTIONS'
  | 'EXPIRING_SUBSCRIPTIONS_7D'
  | 'COMPLETED_TRANSACTIONS'
  | 'PENDING_TRANSACTIONS'
  | 'FAILED_TRANSACTIONS'
  | 'GROSS_VOLUME'
  | 'BROADCAST_DRAFTS'
  | 'IMPORT_DRY_RUN_AVAILABLE';

export interface DashboardMetricInterface {
  readonly code: DashboardMetricCode | string;
  readonly label: string;
  readonly value: number | string;
  readonly description: string | null;
}

export type DashboardOperationsTimelineSource = 'BROADCAST' | 'IMPORT' | 'AUDIT' | 'OPS';

export type DashboardTimelineStatus = 'INFO' | 'WARNING' | 'SUCCESS' | 'PENDING' | 'ERROR';

/** Discriminator that lets the SPA compose localized timeline copy. */
export type DashboardTimelineKind = 'IMPORT' | 'BROADCAST' | 'AUDIT' | 'PAYMENT';

/**
 * Operator-safe structured values backing the localized timeline copy. Every
 * field is a bounded counter, enum code, or short label — never a user id,
 * payment id, or raw payload. The SPA interpolates these into i18n templates;
 * `title`/`description` stay as English fallbacks for the async-load gap/tests.
 */
export interface DashboardTimelineMetaInterface {
  // IMPORT
  readonly sourceType?: string;
  readonly recordsOk?: number;
  readonly recordsTotal?: number;
  readonly recordsFailed?: number;
  // BROADCAST
  readonly audience?: string;
  readonly successCount?: number;
  readonly totalCount?: number;
  readonly failedCount?: number;
  // AUDIT / OPS (raw English action identifier — kept verbatim)
  readonly action?: string;
  // PAYMENT
  readonly paymentStatus?: string;
  readonly purchaseType?: string;
  readonly channel?: string | null;
  readonly amount?: string;
  readonly currency?: string;
}

export interface DashboardTimelineEntryInterface {
  readonly id: string;
  readonly source: DashboardOperationsTimelineSource;
  readonly title: string;
  readonly description: string;
  readonly createdAt: string;
  readonly status: DashboardTimelineStatus;
  /** Discriminator for client-side localization (falls back to title/description). */
  readonly kind?: DashboardTimelineKind;
  /** Structured, operator-safe values for client-side i18n interpolation. */
  readonly meta?: DashboardTimelineMetaInterface;
}

export type DashboardAttentionKind =
  | 'SUBSCRIPTION_EXPIRING'
  | 'PAYMENT_PENDING'
  | 'WITHDRAWAL_PENDING'
  | 'WEBHOOK_FAILED';

export type DashboardAttentionSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface DashboardAttentionItemInterface {
  readonly safeKey: string;
  readonly kind: DashboardAttentionKind;
  readonly severity: DashboardAttentionSeverity;
  readonly title: string;
  readonly description: string;
  /** Count behind the item (e.g. number of expiring subs) — drives the SPA copy. */
  readonly count: number;
  readonly occurredAt: string;
  readonly status: 'ACTIVE' | 'PENDING' | 'RESOLVED';
}

export interface DashboardUsersSummaryInterface {
  readonly total: number;
  readonly blocked: number;
  readonly recentRegistered7d: number;
}

export interface DashboardSubscriptionsSummaryInterface {
  readonly active: number;
  readonly limited: number;
  readonly expired: number;
  readonly expiring7d: number;
}

export interface DashboardTransactionsSummaryInterface {
  readonly completed: number;
  readonly pending: number;
  readonly failed: number;
  readonly grossVolume: string;
}

export interface DashboardOperationsSummaryInterface {
  readonly broadcastDrafts: number;
  readonly importDryRunAvailable: boolean;
}

export interface DashboardFinanceOpsSummaryInterface {
  readonly refundRequests: number;
  readonly executedRefunds: number;
  readonly correctionNotes: number;
  readonly correctionRequests: number;
  readonly disputeRecords: number;
  readonly reconciliationExceptions: number;
}

export interface DashboardSummaryInterface {
  readonly checkedAt: string;
  readonly users: DashboardUsersSummaryInterface;
  readonly subscriptions: DashboardSubscriptionsSummaryInterface;
  readonly transactions: DashboardTransactionsSummaryInterface;
  readonly operations: DashboardOperationsSummaryInterface;
  readonly financeOps: DashboardFinanceOpsSummaryInterface;
  readonly metrics: readonly DashboardMetricInterface[];
  readonly operationsTimeline: readonly DashboardTimelineEntryInterface[];
  readonly financeOpsTimeline: readonly DashboardTimelineEntryInterface[];
  readonly attentionItems: readonly DashboardAttentionItemInterface[];
}
