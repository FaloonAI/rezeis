/**
 * MapInfoNode — read-only canvas node for bot-map entities that aren't part
 * of the editable BotFlow graph: notification templates and Mini App
 * terminals. They have no positionX/Y in the DB (they live only in the
 * unified `/admin/bot-map` payload), so the page lays them out in fixed
 * columns to the right of the graph. They're rendered so the operator can
 * SEE a selected event screen on the canvas and how it links to graph
 * screens — selecting one from the left rail centers the canvas on it.
 *
 * Visually distinct from graph screens (graph = solid card with handles for
 * editing; map = dashed info card). The single source handle is
 * non-connectable: edges into graph screens are drawn programmatically from
 * the bot-map payload, but the operator can't drag new links from here — the
 * routes are defined in the bot code, not editable per-node.
 */
import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { useTranslation } from 'react-i18next'
import { AppWindow, Bell } from 'lucide-react'

import { cn } from '@/lib/utils'

export const MAP_INFO_NODE_TYPE = 'mapInfo'

export interface MapInfoNodeData extends Record<string, unknown> {
  kind: 'notification' | 'mini-app-terminal'
  title: string
  group: string
  status: string | null
  subtitle: string
}

function MapInfoNodeComponent({ data, selected }: NodeProps) {
  const { t } = useTranslation()
  const { kind, title, status, subtitle } = data as unknown as MapInfoNodeData
  const isNotification = kind === 'notification'

  return (
    <div
      className={cn(
        'relative w-[240px] rounded-xl border-2 border-dashed bg-card shadow-sm transition-shadow',
        selected ? 'ring-2 ring-primary border-primary' : 'border-sky-500/50',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 rounded-t-xl border-b px-3 py-2 text-xs font-medium',
          isNotification
            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
            : 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
        )}
      >
        {isNotification ? (
          <Bell className="h-3 w-3" aria-hidden />
        ) : (
          <AppWindow className="h-3 w-3" aria-hidden />
        )}
        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider opacity-80">
          {t(isNotification ? 'botFlow.mapNode.notification' : 'botFlow.mapNode.miniApp')}
        </span>
      </div>

      <div className="space-y-1 px-3 py-2">
        <p className="truncate text-[11px] font-semibold">{title}</p>
        {subtitle.length > 0 ? (
          <code className="block truncate rounded bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground">
            {subtitle}
          </code>
        ) : null}
        {isNotification && status !== null ? (
          <span
            className={cn(
              'inline-block rounded px-1.5 py-0.5 text-[9px] font-medium',
              status === 'ACTIVE'
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {t(status === 'ACTIVE' ? 'botFlow.mapNode.active' : 'botFlow.mapNode.disabled')}
          </span>
        ) : null}
      </div>

      {/*
        Source handle for the programmatic bot-map edges (notification /
        mini-app → graph screen). Non-connectable: the operator can't drag
        new links from a read-only node.
      */}
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        style={{
          right: '-7px',
          top: '50%',
          background: isNotification ? '#f43f5e' : '#0ea5e9',
          border: '2px solid var(--color-background)',
          width: 10,
          height: 10,
        }}
      />
    </div>
  )
}

export const MapInfoNode = memo(MapInfoNodeComponent)
