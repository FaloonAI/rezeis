/**
 * LocaleTextarea — RU/EN side-by-side textarea pair for inspector
 * editors. Captures the same blur-save flow used by the legacy graph
 * editor so an operator never has to press a save button to persist a
 * copy edit. Empty EN value is allowed (server falls back to RU).
 */
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface LocaleTextareaProps {
  readonly labelRu: string
  readonly labelEn: string
  readonly placeholderRu?: string
  readonly placeholderEn?: string
  readonly valueRu: string
  readonly valueEn: string
  readonly rows?: number
  readonly onSave: (next: { readonly ru?: string; readonly en?: string | null }) => void
  readonly disabled?: boolean
}

export function LocaleTextarea({
  labelRu,
  labelEn,
  placeholderRu,
  placeholderEn,
  valueRu,
  valueEn,
  rows = 4,
  onSave,
  disabled,
}: LocaleTextareaProps) {
  const { t } = useTranslation()
  const ruId = useId()
  const enId = useId()

  // Mirror the props into local state so the operator sees their typing
  // immediately. Sync back when the canonical values change (a refetch
  // landed) and the local state still matches the previous canonical
  // values — keeps an in-flight edit from being yanked.
  const [localRu, setLocalRu] = useState(valueRu)
  const [localEn, setLocalEn] = useState(valueEn)
  const lastSyncedRu = useRef(valueRu)
  const lastSyncedEn = useRef(valueEn)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (lastSyncedRu.current !== valueRu && localRu === lastSyncedRu.current) {
      setLocalRu(valueRu)
    }
    lastSyncedRu.current = valueRu
  }, [valueRu, localRu])
  useEffect(() => {
    if (lastSyncedEn.current !== valueEn && localEn === lastSyncedEn.current) {
      setLocalEn(valueEn)
    }
    lastSyncedEn.current = valueEn
  }, [valueEn, localEn])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleBlurRu = () => {
    if (localRu === valueRu) return
    onSave({ ru: localRu })
  }
  const handleBlurEn = () => {
    if (localEn === valueEn) return
    // Send `null` to clear the override (fall back to RU at delivery).
    onSave({ en: localEn.length === 0 ? null : localEn })
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={ruId} className="text-xs">
          {labelRu}
        </Label>
        <Textarea
          id={ruId}
          rows={rows}
          value={localRu}
          onChange={(e) => setLocalRu(e.target.value)}
          onBlur={handleBlurRu}
          placeholder={placeholderRu}
          disabled={disabled}
          className="font-mono text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={enId} className="text-xs">
          {labelEn}
        </Label>
        <Textarea
          id={enId}
          rows={rows}
          value={localEn}
          onChange={(e) => setLocalEn(e.target.value)}
          onBlur={handleBlurEn}
          placeholder={placeholderEn}
          disabled={disabled}
          className="font-mono text-sm"
        />
        {localEn.length === 0 && (
          <p className="text-[10px] leading-snug text-muted-foreground">
            {t('botMapPage.inspector.enFallback')}
          </p>
        )}
      </div>
    </div>
  )
}
