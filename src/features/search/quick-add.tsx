import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useClients, useCreateActivity } from '@/features/clients/api'
import { LeadForm } from '@/features/leads/lead-form'
import { useOrg } from '@/lib/org'
import { cn } from '@/lib/utils'
import type { ActivityType } from '@/types/database'

function NoteForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const org = useOrg()
  const clients = useClients(org.id)
  const create = useCreateActivity()
  const [clientId, setClientId] = useState('')
  const [type, setType] = useState<ActivityType>('note')
  const [content, setContent] = useState('')
  const valid = clientId !== '' && content.trim() !== ''

  async function submit() {
    if (!valid) return
    await create.mutateAsync({
      organization_id: org.id, type, content: content.trim(), occurred_at: new Date().toISOString(),
      client_id: clientId, lead_id: null, project_id: null,
    })
    onDone()
  }

  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit() }}>
      <Field label={t('leads.client')}>
        <Select value={clientId} onChange={(e) => setClientId(e.target.value)} autoFocus>
          <option value="">—</option>
          {clients.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label={t('quick.type')}>
        <Select value={type} onChange={(e) => setType(e.target.value as ActivityType)}>
          {(['note', 'call', 'email', 'meeting', 'message'] as const).map((k) => <option key={k} value={k}>{t(`activity.${k}`)}</option>)}
        </Select>
      </Field>
      <Textarea
        placeholder={t('timeline.placeholder')}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit() }}
      />
      {create.error ? <p className="text-sm text-destructive">{create.error.message}</p> : null}
      <div className="flex justify-end"><Button type="submit" disabled={!valid || create.isPending}>{t('common.save')}</Button></div>
    </form>
  )
}

export function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'note' | 'lead'>('note')
  return (
    <Dialog open={open} onClose={onClose} title={t('quick.title')} className="max-w-xl">
      <div className="mb-4 flex gap-1 rounded-md bg-muted p-1">
        {(['note', 'lead'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn('flex-1 rounded px-3 py-1 text-sm', tab === k && 'bg-card font-medium shadow-sm')}
          >
            {t(k === 'note' ? 'quick.note' : 'quick.lead')}
          </button>
        ))}
      </div>
      {tab === 'note' ? <NoteForm onDone={onClose} /> : <LeadForm onDone={onClose} />}
    </Dialog>
  )
}
