/**
 * /bot-config — Bot Studio entrypoint.
 *
 * The historic "bot-config" route is the operator's primary interface for
 * everything user-facing on the Telegram bot. It now renders the unified
 * Bot Studio canvas: inline-keyboard graph (per-screen), pinned reply
 * keyboard pseudo-node (global), and Sheet drawers for emojis & texts.
 *
 * Implementation lives in `features/bot-flow/bot-flow-page.tsx` because
 * the canvas was originally seeded by the bot-flow rewrite. We lazy-load
 * it here so the chunk only ships when an operator actually opens the
 * editor.
 */
import { lazy, Suspense, type JSX } from 'react'

import { Skeleton } from '@/components/ui/skeleton'

const BotStudioPage = lazy(() => import('@/features/bot-flow/bot-flow-page'))

export default function BotConfigPage(): JSX.Element {
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-background">
      <Suspense fallback={<Skeleton className="h-full w-full" />}>
        <BotStudioPage />
      </Suspense>
    </div>
  )
}
