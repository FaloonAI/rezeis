import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Smile } from 'lucide-react'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/**
 * Lightweight, dependency-free emoji picker. A curated set of common emojis
 * grouped by category, with a keyword search. Inserts the selected emoji via
 * the `onSelect` callback (the caller splices it into the text at the caret).
 */
interface EmojiEntry {
  readonly c: string
  readonly k: string
}

const EMOJI_GROUPS: ReadonlyArray<{ readonly id: string; readonly items: readonly EmojiEntry[] }> = [
  {
    id: 'smileys',
    items: [
      { c: '😀', k: 'smile grin happy' },
      { c: '😃', k: 'smile happy' },
      { c: '😄', k: 'smile happy laugh' },
      { c: '😁', k: 'grin' },
      { c: '😆', k: 'laugh' },
      { c: '😅', k: 'sweat laugh' },
      { c: '😂', k: 'joy laugh tears' },
      { c: '🤣', k: 'rofl laugh' },
      { c: '😊', k: 'blush happy' },
      { c: '🙂', k: 'slight smile' },
      { c: '😉', k: 'wink' },
      { c: '😍', k: 'heart eyes love' },
      { c: '🥰', k: 'love hearts' },
      { c: '😘', k: 'kiss' },
      { c: '😎', k: 'cool sunglasses' },
      { c: '🤩', k: 'star struck' },
      { c: '🤔', k: 'thinking' },
      { c: '🤗', k: 'hug' },
      { c: '😇', k: 'angel' },
      { c: '🙃', k: 'upside down' },
      { c: '😴', k: 'sleep' },
      { c: '😢', k: 'cry sad' },
      { c: '😭', k: 'cry sob' },
      { c: '😡', k: 'angry mad' },
      { c: '🤯', k: 'mind blown' },
      { c: '😱', k: 'scream shock' },
      { c: '🥳', k: 'party celebrate' },
      { c: '😏', k: 'smirk' },
      { c: '😬', k: 'grimace' },
      { c: '🤝', k: 'handshake deal' },
    ],
  },
  {
    id: 'gestures',
    items: [
      { c: '👍', k: 'thumbs up like' },
      { c: '👎', k: 'thumbs down dislike' },
      { c: '👌', k: 'ok' },
      { c: '✌️', k: 'peace victory' },
      { c: '🤞', k: 'fingers crossed' },
      { c: '👏', k: 'clap' },
      { c: '🙌', k: 'raise hands' },
      { c: '🙏', k: 'pray thanks please' },
      { c: '💪', k: 'muscle strong' },
      { c: '👋', k: 'wave hello' },
      { c: '✍️', k: 'write' },
      { c: '👀', k: 'eyes look' },
    ],
  },
  {
    id: 'symbols',
    items: [
      { c: '❤️', k: 'heart love red' },
      { c: '🧡', k: 'orange heart' },
      { c: '💛', k: 'yellow heart' },
      { c: '💚', k: 'green heart' },
      { c: '💙', k: 'blue heart' },
      { c: '💜', k: 'purple heart' },
      { c: '🔥', k: 'fire hot lit' },
      { c: '⭐', k: 'star' },
      { c: '🌟', k: 'star glow' },
      { c: '✨', k: 'sparkles' },
      { c: '⚡', k: 'lightning bolt' },
      { c: '✅', k: 'check done yes' },
      { c: '❌', k: 'cross no error' },
      { c: '⚠️', k: 'warning' },
      { c: '❗', k: 'exclamation' },
      { c: '❓', k: 'question' },
      { c: '💯', k: 'hundred perfect' },
      { c: '🎉', k: 'party tada celebrate' },
      { c: '🎁', k: 'gift present' },
      { c: '🚀', k: 'rocket launch' },
      { c: '💰', k: 'money bag' },
      { c: '💎', k: 'diamond gem' },
      { c: '🔔', k: 'bell notification' },
      { c: '📢', k: 'announce loudspeaker' },
      { c: '📣', k: 'megaphone' },
      { c: '🏆', k: 'trophy win' },
      { c: '🎯', k: 'target goal' },
      { c: '💡', k: 'idea bulb' },
      { c: '📌', k: 'pin' },
      { c: '🔗', k: 'link' },
    ],
  },
]

const ALL_EMOJIS: readonly EmojiEntry[] = EMOJI_GROUPS.flatMap((g) => g.items)

interface CustomEmojiLite {
  readonly slug: string
  readonly name: string
  readonly imageUrl: string
}
interface CustomEmojiPackLite {
  readonly id: string
  readonly name: string
  readonly emojis: readonly CustomEmojiLite[]
}

export function EmojiPicker({
  onSelect,
  ariaLabel,
}: {
  readonly onSelect: (emoji: string) => void
  readonly ariaLabel: string
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'standard' | 'custom'>('standard')

  const { data: packs } = useQuery<ReadonlyArray<CustomEmojiPackLite>>({
    queryKey: ['admin', 'custom-emoji', 'packs'],
    queryFn: async () =>
      (await api.get<ReadonlyArray<CustomEmojiPackLite>>('/admin/custom-emoji/packs')).data,
    enabled: open,
    staleTime: 60_000,
  })

  const normalized = query.trim().toLowerCase()
  const filtered = normalized.length > 0
    ? ALL_EMOJIS.filter((e) => e.k.includes(normalized))
    : ALL_EMOJIS

  const hasCustom = (packs?.length ?? 0) > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          aria-label={ariaLabel}
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 overflow-hidden p-2" align="end">
        {hasCustom && (
          <div className="mb-2 flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={tab === 'standard' ? 'default' : 'outline'}
              className="h-7 flex-1 text-xs"
              onClick={() => setTab('standard')}
            >
              {t('broadcastPage.emoji.standard')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tab === 'custom' ? 'default' : 'outline'}
              className="h-7 flex-1 text-xs"
              onClick={() => setTab('custom')}
            >
              {t('broadcastPage.emoji.custom')}
            </Button>
          </div>
        )}

        {tab === 'standard' || !hasCustom ? (
          <>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('broadcastPage.emoji.search')}
              aria-label={t('broadcastPage.emoji.search')}
              className="h-8 mb-2 text-xs"
            />
            <div className="grid grid-cols-8 gap-1 max-h-52 overflow-y-auto overflow-x-hidden">
              {filtered.map((e) => (
                <button
                  type="button"
                  key={e.c}
                  aria-label={e.k}
                  onClick={() => {
                    onSelect(e.c)
                    setOpen(false)
                  }}
                  className="flex aspect-square w-full items-center justify-center rounded text-lg hover:bg-muted"
                >
                  {e.c}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="col-span-8 py-4 text-center text-xs text-muted-foreground">
                  {t('broadcastPage.emoji.empty')}
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="max-h-60 space-y-3 overflow-y-auto overflow-x-hidden">
            {packs?.map((pack) => (
              <div key={pack.id} className="space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground">{pack.name}</p>
                <div className="grid grid-cols-8 gap-1">
                  {pack.emojis.map((emoji) => (
                    <button
                      type="button"
                      key={emoji.slug}
                      title={`:${emoji.slug}:`}
                      aria-label={emoji.name}
                      onClick={() => {
                        onSelect(`:${emoji.slug}:`)
                        setOpen(false)
                      }}
                      className="flex aspect-square w-full items-center justify-center rounded hover:bg-muted"
                    >
                      <img src={emoji.imageUrl} alt={emoji.name} className="h-6 w-6 object-contain" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
