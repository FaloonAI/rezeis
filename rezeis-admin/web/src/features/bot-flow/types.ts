/** Types for the Bot Flow Editor feature. */

export type BotFlowButtonAction = 'NAVIGATE' | 'URL' | 'WEBAPP' | 'CALLBACK' | 'BACK' | 'START_OVER' | 'SUPPORT_URL'
export type BotFlowButtonStyle = 'PRIMARY' | 'SUCCESS' | 'DANGER' | 'DEFAULT'
export type BotFlowParseMode = 'HTML' | 'MARKDOWN' | 'PLAIN'
export type BotFlowMediaType = 'PHOTO' | 'VIDEO' | 'DOCUMENT' | 'ANIMATION'
export type BotFlowStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export interface BotFlowButton {
  id: string
  screenId: string
  labelRu: string
  labelEn: string
  row: number
  col: number
  actionType: BotFlowButtonAction
  targetScreenId: string | null
  url: string | null
  webAppUrl: string | null
  callbackAction: string | null
  style: BotFlowButtonStyle
  iconCustomEmojiId: string | null
}

export interface BotFlowScreen {
  id: string
  shortId: string
  flowId: string
  name: string
  textRu: string
  textEn: string
  parseMode: BotFlowParseMode
  mediaType: BotFlowMediaType | null
  mediaFileId: string | null
  mediaUrl: string | null
  positionX: number
  positionY: number
  isRoot: boolean
  buttons: BotFlowButton[]
}

export interface BotFlow {
  id: string
  name: string
  version: number
  status: BotFlowStatus
  layoutData: Record<string, unknown> | null
  publishedAt: string | null
  screens: BotFlowScreen[]
}

/** React Flow node data for a bot screen. */
export interface BotScreenNodeData extends Record<string, unknown> {
  shortId: string
  name: string
  textRu: string
  textEn: string
  parseMode: BotFlowParseMode
  mediaType: BotFlowMediaType | null
  mediaUrl: string | null
  isRoot: boolean
  buttons: BotFlowButton[][]  // grouped by row
  /**
   * Read-only preview of buttons reiwa injects at runtime (not stored in
   * `bot_flow_buttons`): the per-screen system buttons of built-in screens
   * (invite / rules / help) and the auto "◀️ В меню" row added to any screen
   * with no buttons. Rendered as muted chips so the operator sees the full
   * keyboard; the `isBack` chip anchors a dashed edge to the root screen.
   */
  systemButtons?: readonly SystemButtonPreview[]
}

/** One runtime-injected system button preview shown on the canvas. */
export interface SystemButtonPreview {
  readonly key: string
  /** i18n key for the chip label. */
  readonly labelKey: string
  /** True for the "back to menu" button — anchors the dashed edge to root. */
  readonly isBack: boolean
}
