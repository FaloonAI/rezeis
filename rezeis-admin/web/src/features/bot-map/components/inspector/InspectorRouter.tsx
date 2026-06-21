/**
 * InspectorRouter — picks the right editor for the selected node.
 *
 * Single switch on `node.kind` so the page-level component doesn't need
 * to know which editor handles which kind. When no node is selected the
 * router renders an empty-state hint pointing at the rail.
 */
import { useTranslation } from 'react-i18next'

import type { BotMapNode } from '../../types'
import { GraphScreenEditor } from './GraphScreenEditor'
import { MiniAppTerminalView } from './MiniAppTerminalView'
import { NotificationEditor } from './NotificationEditor'
import { ReplyButtonEditor } from './ReplyButtonEditor'

interface InspectorRouterProps {
  readonly node: BotMapNode | null
}

export function InspectorRouter({ node }: InspectorRouterProps) {
  const { t } = useTranslation()

  if (node === null) {
    return (
      <p className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        {t('botMapPage.inspector.empty')}
      </p>
    )
  }

  switch (node.kind) {
    case 'graph-screen':
      return <GraphScreenEditor node={node} />
    case 'reply-keyboard':
      return <ReplyButtonEditor node={node} />
    case 'notification':
      return <NotificationEditor node={node} />
    case 'mini-app-terminal':
      return <MiniAppTerminalView node={node} />
  }
}
