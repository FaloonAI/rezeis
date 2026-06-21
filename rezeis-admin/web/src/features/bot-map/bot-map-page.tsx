/**
 * Bot map page — `/bot-map`.
 *
 * Wave 2 of the bot-studio-redesign spec. Replaces the full-screen
 * "Навигация бота" canvas with a contained, list-first module that
 * unifies graph screens, the reply keyboard, notification templates,
 * and Mini App terminals into one searchable surface.
 *
 * Lazy-loaded through `withFeatureBundle('botMap', …)` in the router so
 * the i18n bundle ships next to the page chunk on first open.
 */
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

import { BotMapShell } from './components/BotMapShell'
import { BOT_MAP_QUERY_KEY, fetchBotMap } from './bot-map-api'

export default function BotMapPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: BOT_MAP_QUERY_KEY,
    queryFn: fetchBotMap,
    staleTime: 30_000,
  })

  if (isLoading || data === undefined) {
    if (isError) {
      return (
        <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          {t('botMapPage.loadFailed')}
        </div>
      )
    }
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    )
  }

  return (
    <BotMapShell
      payload={data}
      isFetching={isFetching}
      onRefresh={() => {
        void queryClient.invalidateQueries({ queryKey: BOT_MAP_QUERY_KEY })
        void refetch()
      }}
    />
  )
}
