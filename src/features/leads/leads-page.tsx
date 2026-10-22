import { Kanban as KanbanIcon, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { useClients } from '@/features/clients/api'
import { useOrg } from '@/lib/org'
import type { Lead, Stage } from '@/types/database'
import { useLeads, useMoveLead, useStages } from './api'
import { Kanban, type DropResult } from './kanban'
import { LeadForm } from './lead-form'

export function LeadsPage() {
  const { t } = useTranslation()
  const org = useOrg()
  const stages = useStages(org.id)
  const leads = useLeads(org.id)
  const clients = useClients(org.id)
  const move = useMoveLead(org.id)
  const [params, setParams] = useSearchParams()
  const [creatingIn, setCreatingIn] = useState<string | null>(null)
  const [pendingLost, setPendingLost] = useState<DropResult | null>(null)
  const [reason, setReason] = useState('')

  const clientMap = useMemo(() => new Map((clients.data ?? []).map((c) => [c.id, c])), [clients.data])

  if (stages.isPending || leads.isPending) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  if (stages.isError || leads.isError) return <p className="text-sm text-destructive">{t('common.error')}</p>

  const editId = params.get('lead')
  const editing: Lead | undefined = editId ? leads.data.find((l) => l.id === editId) : undefined
  const firstOpen: Stage | undefined = stages.data.find((s) => s.kind === 'open')

  function closeEdit() {
    setParams((p) => { p.delete('lead'); return p }, { replace: true })
  }

  function handleDrop(r: DropResult) {
    if (r.stage.kind === 'lost' && r.lead.stage_id !== r.stage.id) {
      setReason('')
      setPendingLost(r)
      return
    }
    move.mutate(r)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('nav.leads')}</h1>
        <Button onClick={() => setCreatingIn(firstOpen?.id ?? '')}><Plus className="size-4" />{t('leads.new')}</Button>
      </div>

      {leads.data.length === 0 ? (
        <EmptyState
          icon={KanbanIcon}
          title={t('leads.emptyTitle')}
          body={t('leads.emptyBody')}
          action={<Button onClick={() => setCreatingIn(firstOpen?.id ?? '')}>{t('leads.new')}</Button>}
        />
      ) : (
        <Kanban
          stages={stages.data}
          leads={leads.data}
          clients={clientMap}
          onDrop={handleDrop}
          onOpen={(l) => setParams({ lead: l.id })}
          onAdd={(sid) => setCreatingIn(sid)}
        />
      )}
      {move.error ? <p className="mt-2 text-sm text-destructive">{move.error.message}</p> : null}

      <Dialog open={creatingIn !== null} onClose={() => setCreatingIn(null)} title={t('leads.new')} className="max-w-xl">
        <LeadForm defaultStageId={creatingIn ?? ''} onDone={() => setCreatingIn(null)} />
      </Dialog>

      <Dialog open={Boolean(editing)} onClose={closeEdit} title={t('leads.edit')} className="max-w-xl">
        {editing ? <LeadForm lead={editing} onDone={closeEdit} /> : null}
      </Dialog>

      <Dialog open={pendingLost !== null} onClose={() => setPendingLost(null)} title={t('leads.markLost')}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!pendingLost || reason.trim() === '') return
            move.mutate({ ...pendingLost, lostReason: reason.trim() })
            setPendingLost(null)
          }}
        >
          <Field label={t('leads.lostReason')}>
            <Textarea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setPendingLost(null)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={reason.trim() === ''}>{t('leads.markLost')}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
