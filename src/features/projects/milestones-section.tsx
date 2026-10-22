import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatDate, formatMoney } from '@/lib/format'
import { useOrg } from '@/lib/org'
import type { Milestone, Project } from '@/types/database'
import { useDeleteMilestone, useMilestones, useSaveMilestone } from './api'

const schema = z.object({
  name: z.string().trim().min(1, 'projects.nameRequired'),
  due_date: z.string(),
  amount: z.string(),
  percent: z.string(),
  status: z.enum(['planned', 'due', 'invoiced', 'paid']),
})
type Values = z.infer<typeof schema>
const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? null : Number(s))

function MilestoneForm({ project, milestone, onDone }: { project: Project; milestone?: Milestone; onDone: () => void }) {
  const { t } = useTranslation()
  const org = useOrg()
  const save = useSaveMilestone()
  const del = useDeleteMilestone()
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: milestone?.name ?? '',
      due_date: milestone?.due_date ?? '',
      amount: milestone?.amount?.toString() ?? '',
      percent: milestone?.percent?.toString() ?? '',
      status: milestone?.status ?? 'planned',
    },
  })

  async function onSubmit(v: Values) {
    const percent = num(v.percent)
    if (percent !== null && (percent < 0 || percent > 100)) return
    await save.mutateAsync({
      ...(milestone ? { id: milestone.id } : {}),
      values: {
        organization_id: org.id, project_id: project.id, name: v.name, due_date: v.due_date || null,
        amount: num(v.amount), percent, status: v.status,
      },
    })
    onDone()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Field label={t('milestones.name')} error={errors.name?.message ? t(errors.name.message) : undefined}><Input autoFocus placeholder="Avans, Dizajn, Isporuka…" {...register('name')} /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label={t('milestones.dueDate')}><Input type="date" {...register('due_date')} /></Field>
        <Field label={`${t('milestones.amount')} (${project.currency})`}><Input type="number" min={0} step="0.01" {...register('amount')} /></Field>
        <Field label={t('milestones.percent')}><Input type="number" min={0} max={100} step="0.01" {...register('percent')} /></Field>
      </div>
      <Field label={t('projects.statusLabel')}>
        <Select {...register('status')}>
          {(['planned', 'due', 'invoiced', 'paid'] as const).map((s) => <option key={s} value={s}>{t(`milestones.status.${s}`)}</option>)}
        </Select>
      </Field>
      {save.error ?? del.error ? <p className="text-sm text-destructive">{(save.error ?? del.error)?.message}</p> : null}
      <div className="flex justify-between pt-2">
        {milestone ? (
          <Button type="button" variant="ghost" className="text-destructive"
            onClick={() => { if (window.confirm(t('milestones.confirmDelete'))) void del.mutateAsync(milestone.id).then(onDone) }}>
            {t('common.delete')}
          </Button>
        ) : <span />}
        <Button type="submit" disabled={save.isPending}>{t('common.save')}</Button>
      </div>
    </form>
  )
}

export function MilestonesSection({ project }: { project: Project }) {
  const { t } = useTranslation()
  const milestones = useMilestones(project.id)
  const [editing, setEditing] = useState<Milestone | 'new' | null>(null)

  const amountOf = (m: Milestone) => m.amount ?? (m.percent !== null ? (project.value * m.percent) / 100 : null)

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">{t('milestones.title')}</h2>
        <Button size="sm" variant="outline" onClick={() => setEditing('new')}><Plus className="size-3.5" />{t('milestones.new')}</Button>
      </div>
      {milestones.isPending ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
      {milestones.data?.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{t('milestones.empty')}</p> : null}
      <ul className="divide-y rounded-xl border empty:hidden">
        {milestones.data?.map((m) => {
          const amt = amountOf(m)
          return (
            <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <div>
                <p className="font-medium">{m.name}</p>
                <p className="text-xs text-muted-foreground">
                  {m.due_date ? formatDate(m.due_date) : t('milestones.noDate')}{m.percent !== null && m.amount === null ? ` · ${m.percent}%` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {amt !== null ? <span>{formatMoney(amt, project.currency)}</span> : null}
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{t(`milestones.status.${m.status}`)}</span>
                <button type="button" className="rounded p-1 hover:bg-muted" onClick={() => setEditing(m)} aria-label={t('common.edit')}><Pencil className="size-3.5" /></button>
              </div>
            </li>
          )
        })}
      </ul>
      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? t('milestones.new') : t('milestones.edit')}>
        <MilestoneForm project={project} {...(editing && editing !== 'new' ? { milestone: editing } : {})} onDone={() => setEditing(null)} />
      </Dialog>
    </section>
  )
}
