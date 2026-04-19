import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Send, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { paymentApi } from '@/features/payments/payments-api'
import { translateErrorMessage } from '@/lib/translate-error'
import { useTranslation } from 'react-i18next'

export function PaymentAlertsPage(): JSX.Element {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({
    queryKey: ['payments', 'alerts', 'settings'],
    queryFn: paymentApi.getPaymentOpsAlertSettings,
  })
  const [enabled, setEnabled] = useState(false)
  const [chatId, setChatId] = useState('')
  const [threadId, setThreadId] = useState('')
  const [hashtag, setHashtag] = useState('#payments_ops')
  const [testNote, setTestNote] = useState('Payment Ops test alert')

  useEffect(() => {
    if (!settingsQuery.data) {
      return
    }
    setEnabled(settingsQuery.data.enabled)
    setChatId(settingsQuery.data.chatId ?? '')
    setThreadId(settingsQuery.data.threadId ?? '')
    setHashtag(settingsQuery.data.hashtag ?? '#payments_ops')
  }, [settingsQuery.data])

  const saveMutation = useMutation({
    mutationFn: paymentApi.updatePaymentOpsAlertSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['payments', 'alerts'] })
    },
  })
  const testMutation = useMutation({
    mutationFn: paymentApi.sendPaymentOpsAlertTest,
  })

  function saveSettings(): void {
    void saveMutation.mutateAsync({
      enabled,
      chatId: chatId.trim() || null,
      threadId: threadId.trim() || null,
      hashtag: hashtag.trim() || null,
    })
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-border/80 bg-card/90 px-5 py-5 shadow-sm backdrop-blur sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Payments</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Telegram Alerts</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Send failed webhook and replay actions to an operations chat with stable hashtag markers.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Alert sink</CardTitle>
          <CardDescription>Uses the admin service BOT_TOKEN and sends machine-friendly summary messages.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <label className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm">
            <Checkbox checked={enabled} onCheckedChange={(checked) => setEnabled(checked === true)} />
            Enable Telegram alerts
          </label>
          <Field label="Chat ID">
            <Input value={chatId} onChange={(event) => setChatId(event.target.value)} placeholder="-1001234567890" />
          </Field>
          <Field label="Thread ID">
            <Input value={threadId} onChange={(event) => setThreadId(event.target.value)} placeholder="optional topic id" />
          </Field>
          <Field label="Base hashtag">
            <Input value={hashtag} onChange={(event) => setHashtag(event.target.value)} placeholder="#payments_ops" />
          </Field>
          <div className="lg:col-span-2 flex flex-wrap gap-2">
            <Button type="button" onClick={saveSettings} disabled={saveMutation.isPending}>
              <Save className="size-4" />
              Save alerts
            </Button>
          </div>
          {settingsQuery.error ? <ErrorMessage message={translateErrorMessage(t, settingsQuery.error.message)} /> : null}
          {saveMutation.error ? <ErrorMessage message={translateErrorMessage(t, saveMutation.error.message)} /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test message</CardTitle>
          <CardDescription>Send a probe message to the configured chat before relying on production alerts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea value={testNote} onChange={(event) => setTestNote(event.target.value)} />
          <Button type="button" variant="outline" onClick={() => void testMutation.mutateAsync(testNote)} disabled={testMutation.isPending}>
            <Send className="size-4" />
            Send test alert
          </Button>
          {testMutation.error ? <ErrorMessage message={translateErrorMessage(t, testMutation.error.message)} /> : null}
          {testMutation.isSuccess ? (
            <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">Test alert sent.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, children }: { readonly label: string; readonly children: JSX.Element }): JSX.Element {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function ErrorMessage({ message }: { readonly message: string }): JSX.Element {
  return <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive lg:col-span-2">{message}</p>
}
