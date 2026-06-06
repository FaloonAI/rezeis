/**
 * Utility constants and helpers for reply-keyboard node rendering.
 * Extracted to a dedicated file so that ReplyKeyboardNode.tsx can remain a
 * component-only module (required for Fast Refresh / HMR).
 *
 * Import note
 * ───────────
 * These helpers are also consumed by `bot-flow/utils.ts` (edge builders) so
 * the colour chosen here and the edge stroke in the builder match exactly.
 */

/**
 * Palette of edge colours used when a button id is not in the reserved map.
 * The deterministic hash below always resolves to one of these slots, so
 * colours are stable across renders.
 */
export const EDGE_COLORS: readonly string[] = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f97316', // orange
]

/**
 * Hard-coded colour overrides for well-known reply-keyboard buttons so the
 * visual flow graph stays consistent with the Telegram UI conventions.
 */
export const RESERVED_BUTTON_COLORS: Record<string, string> = {
  cabinet: '#3b82f6', // blue
  invite: '#10b981', // emerald
  rules: '#f59e0b', // amber
  help: '#ef4444', // red
}

/**
 * Resolve a deterministic edge colour for a reply-button. Callers
 * (the `utils.buildReplyToScreenEdges` helper, and the per-button
 * handle render in `ReplyKeyboardNode.tsx`) MUST agree on the result so
 * the indicator dot on the source side and the edge stroke match.
 *
 * Well-known ids fall back to a deterministic hash bucket so the colour stays
 * stable across renders without us hard-coding every possible id.
 */
export function resolveReplyButtonColor(buttonId: string): string {
  const reserved = RESERVED_BUTTON_COLORS[buttonId]
  if (reserved !== undefined) return reserved
  // Tiny hash so unknown ids land on a stable bucket. Mirrors the
  // approach React Flow uses internally for default edge colours.
  let hash = 0
  for (let i = 0; i < buttonId.length; i++) {
    hash = (hash << 5) - hash + buttonId.charCodeAt(i)
    hash |= 0
  }
  const idx = Math.abs(hash) % EDGE_COLORS.length
  return EDGE_COLORS[idx]
}

/**
 * Source-handle id convention: each reply-keyboard button exposes a
 * dedicated handle whose id encodes the button. The
 * `buildReplyToScreenEdges` helper picks the same id on the edge
 * `sourceHandle` so React Flow positions the line emerging precisely
 * from the right edge of that button's row.
 */
export function replyButtonHandleId(buttonId: string): string {
  return `reply-btn-${buttonId}`
}
