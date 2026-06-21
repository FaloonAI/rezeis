/**
 * bot-map-api
 * ───────────
 * Thin axios wrappers around the endpoints the "Карта бота" module
 * consumes. Reuses existing endpoints whenever possible — only the
 * read-side composer is new (`GET /admin/bot-map`); graph screens,
 * reply buttons, and notification templates write through their
 * already-shipped CRUD endpoints.
 */
import { api } from '@/lib/api'
import type { BotMapPayload, UpdateNotificationTemplatePatch } from './types'

export const BOT_MAP_QUERY_KEY = ['bot-map'] as const

/** Fetch the unified node + edge payload backing the list and canvas. */
export async function fetchBotMap(): Promise<BotMapPayload> {
  const res = await api.get<BotMapPayload>('/admin/bot-map')
  return res.data
}

/** Patch a graph screen — same endpoint the legacy editor calls. */
export async function patchGraphScreen(
  screenId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await api.put(`/admin/bot-flows/screens/${encodeURIComponent(screenId)}`, patch)
}

/** Update a reply-keyboard button (label + flags). */
export async function patchReplyButton(
  buttonId: string,
  patch: { label?: string; visible?: boolean; actionTarget?: string | null },
): Promise<void> {
  await api.put(`/admin/bot-config/buttons/${encodeURIComponent(buttonId)}`, patch)
}

/**
 * Update a notification template row, including the new EN copy + buttons
 * fields shipped in Wave 1. The endpoint accepts a partial DTO — only
 * supplied fields are written.
 */
export async function patchNotificationTemplate(
  templateId: string,
  patch: UpdateNotificationTemplatePatch,
): Promise<void> {
  await api.patch(
    `/admin/notifications/templates/${encodeURIComponent(templateId)}`,
    patch,
  )
}
