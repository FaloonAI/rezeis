/**
 * MiniAppTerminalView — read-only inspector for `mini-app-terminal`
 * nodes. Surfaces the cabinet route + its description so the operator
 * can confirm where the path ends without leaving the map. Editing
 * the page itself happens in the cabinet (reiwa) codebase.
 */
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

import type { MiniAppTerminalMapNode } from '../../types'

interface MiniAppTerminalViewProps {
  readonly node: MiniAppTerminalMapNode
}

export function MiniAppTerminalView({ node }: MiniAppTerminalViewProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Globe className="h-3.5 w-3.5" aria-hidden />
          {t('botMapPage.terminal.title')}
        </p>
        <h2 className="text-base font-semibold">{node.title}</h2>
        <Badge variant="outline" className="font-mono text-[10px]">
          {t('botMapPage.terminal.route')}: {node.route}
        </Badge>
      </header>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {t('botMapPage.terminal.subtitle')}
      </p>

      <div className="rounded-lg border bg-muted/30 p-3 text-xs">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('botMapPage.terminal.description')}
        </p>
        <p className="mt-1 leading-relaxed">{node.descriptionRu}</p>
        <p className="mt-2 text-muted-foreground leading-relaxed">{node.descriptionEn}</p>
      </div>
    </div>
  )
}
