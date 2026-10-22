import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useClients } from '@/features/clients/api'
import { Timeline } from '@/features/clients/timeline'
import { dateInputToIso, toDateInput } from '@/lib/format'
import { useOrg } from '@/lib/org'
import type { Lead } from '@/types/database'
import { stageFields, useDeleteLead, useLeads, useSaveLead, useStages } from './api'

const schema = z.object({
  title: z.string().trim().min(1, 'leads.titleRequired'),
  client_id: z.string(),
  stage_id: z.string().min(1),
  source: z.string().trim(),
  estimated_value: z.number().min(0),
  currency: z.enum(['EUR', 'RSD', 'USD']),
  next_step_at: z.string(),
  next_step_note: z.string(),
  lost_reason: z.string(),
})
type Values = z.infer<typeof schema>
const orNull = (s: string) => (s.trim() === '' ? null : s.trim())

export function LeadForm({ lead, defaultStageId, onDone }: { lead?: Lead; defaultStageId?: string; onDone: () => void }) {
  const { t } = useTranslation()
  const org = useOrg()
  const stages = useStages(org.id)
  const clients = useClients(org.id)
  const leads = useLeads(org.id)
  const save = useSaveLead()
  const del = useDeleteLead()
  const firstStage = stages.data?.[0]?.id ?? ''
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: lead?.title ?? '',
      client_id: lead?.client_id ?? '',
      stage_id: lead?.stage_id ?? defaultStageId ?? firstStage,
      source: lead?.source ?? '',
      estimated_value: lead?.estimated_value ?? 0,
      currency: lead?.currency ?? org.currency,
      next_step_at: lead?.next_step_at ? toDateInput(lead.next_step_at) : '',
      next_step_note: lead?.next_step_note ?? '',
      lost_reason: lead?.lost_reason ?? '',
    },
  })

  const stage = stages.data?.find((s) => s.id === watch('stage_id'))

  async function onSubmit(v: Values) {
    if (!stage) return
    if (stage.kind === 'lost' && v.lost_reason.trim() === '') {
      setError('lost_reason', { message: 'leads.lostReasonRequired' })
      return
    }
    const sameStage = lead?.stage_id === stage.id
    const position = sameStage
      ? lead.position
      : Math.max(0, ...(leads.data ?? []).filter((l) => l.stage_id === stage.id).map((l) => l.position)) + 1
    await save.mutateAsync({
      ...(lead ? { id: lead.id } : {}),
      values: {
        organization_id: org.id,
        title: v.title,
        client_id: orNull(v.client_id),
        source: orNull(v.source),
        estimated_value: v.estimated_value,
        currency: v.currency,
        next_step_at: v.next_step_at ? dateInputToIso(v.next_step_at) : null,
        next_step_note: orNull(v.next_step_note),
        position,
        ...(sameStage
          ? { closed_at: lead.closed_at, lost_reason: stage.kind === 'lost' ? v.lost_reason.trim() : null, stage_id: stage.id }
          : stageFields(stage, v.lost_reason.trim() || null)),
      },
    })
    onDone()
  }

  const err = save.error ?? del.error

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Field label={t('leads.title')} error={errors.title?.message ? t(errors.title.message) : undefined}>
          <Input autoFocus {...register('title')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('leads.client')}>
            <Select {...register('client_id')}>
              <option value="">—</option>
              {clients.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label={t('leads.stage')}>
            <Select {...register('stage_id')}>
              {stages.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('leads.value')}><Input type="number" min={0} step="0.01" {...register('estimated_value', { valueAsNumber: true })} /></Field>
          <Field label={t('clients.currency')}>
            <Select {...register('currency')}><option>EUR</option><option>RSD</option><option>USD</option></Select>
          </Field>
          <Field label={t('leads.source')}><Input {...register('source')} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('leads.nextStepAt')}><Input type="date" {...register('next_step_at')} /></Field>
          <div className="col-span-2">
            <Field label={t('leads.nextStepNote')}><Input {...register('next_step_note')} /></Field>
          </div>
        </div>
        {stage?.kind === 'lost' ? (
          <Field label={t('leads.lostReason')} error={errors.lost_reason?.message ? t(errors.lost_reason.message) : undefined}>
            <Textarea {...register('lost_reason')} />
          </Field>
        ) : null}
        {err ? <p className="text-sm text-destructive">{err.message}</p> : null}
        <div className="flex justify-between pt-2">
          {lead ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive"
              onClick={() => {
                if (window.confirm(t('leads.confirmDelete'))) void del.mutateAsync(lead.id).then(onDone)
              }}
            >
              {t('common.delete')}
            </Button>
          ) : <span />}
          <Button type="submit" disabled={save.isPending}>{t('common.save')}</Button>
        </div>
      </form>
      {lead ? <Timeline leadId={lead.id} /> : null}
    </div>
  )
}
