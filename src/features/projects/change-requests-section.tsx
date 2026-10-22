import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatMoney } from '@/lib/format'
import { useOrg } from '@/lib/org'
import { cn } from '@/lib/utils'
import type { ChangeRequestStatus, Project } from '@/types/database'
import { useChangeRequests, useDeleteChangeRequest, useSaveChangeRequest } from './api'

const schema = z.object({
  description: z.string().trim().min(1, 'changeRequests.descriptionRequired'),
  price: z.number().min(0),
  currency: z.enum(['EUR', 'RSD', 'USD']),
})
type Values = z.infer<typeof schema>

function NewForm({ project, onDone }: { project: Project; onDone: () => void }) {
  const { t } = useTranslation()
  const org = useOrg()
  const save = useSaveChangeRequest()
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { description: '', price: 0, currency: project.currency },
  })
  async function onSubmit(v: Values) {
    await save.mutateAsync({ values: { organization_id: org.id, project_id: project.id, ...v } })
    onDone()
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Field label={t('changeRequests.description')} error={errors.description?.message ? t(errors.description.message) : undefined}><Textarea autoFocus {...register('description')} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('changeRequests.price')}><Input type="number" min={0} step="0.01" {...register('price', { valueAsNumber: true })} /></Field>
        <Field label={t('clients.currency')}><Select {...register('currency')}><option>EUR</option><option>RSD</option><option>USD</option></Select></Field>
      </div>
      {save.error ? <p className="text-sm text-destructive">{save.error.message}</p> : null}
      <div className="flex justify-end"><Button type="submit" disabled={save.isPending}>{t('common.save')}</Button></div>
    </form>
  )
}

export function ChangeRequestsSection({ project }: { project: Project }) {
  const { t } = useTranslation()
  const org = useOrg()
  const list = useChangeRequests(project.id)
  const save = useSaveChangeRequest()
  const del = useDeleteChangeRequest()
  const [creating, setCreating] = useState(false)

  const setStatus = (id: string, status: ChangeRequestStatus) => {
    const cr = list.data?.find((c) => c.id === id)
    if (!cr) return
    save.mutate({ id, values: { organization_id: org.id, project_id: project.id, description: cr.description, status } })
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">{t('changeRequests.title')}</h2>
        <Button size="sm" variant="outline" onClick={() => setCreating(true)}><Plus className="size-3.5" />{t('changeRequests.new')}</Button>
      </div>
      {list.data?.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{t('changeRequests.empty')}</p> : null}
      <ul className="divide-y rounded-xl border empty:hidden">
        {list.data?.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <p className={cn('flex-1', c.status === 'rejected' && 'text-muted-foreground line-through')}>{c.description}</p>
            <span className="font-medium">{formatMoney(c.price, c.currency)}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{t(`changeRequests.status.${c.status}`)}</span>
            {c.status === 'proposed' ? (
              <span className="flex">
                <button type="button" title={t('changeRequests.approve')} className="rounded p-1 text-green-600 hover:bg-muted" onClick={() => setStatus(c.id, 'approved')}><Check className="size-4" /></button>
                <button type="button" title={t('changeRequests.reject')} className="rounded p-1 text-destructive hover:bg-muted" onClick={() => setStatus(c.id, 'rejected')}><X className="size-4" /></button>
              </span>
            ) : null}
            <button type="button" aria-label={t('common.delete')} className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => del.mutate(c.id)}><Trash2 className="size-3.5" /></button>
          </li>
        ))}
      </ul>
      {save.error ?? del.error ? <p className="mt-1 text-sm text-destructive">{(save.error ?? del.error)?.message}</p> : null}
      <Dialog open={creating} onClose={() => setCreating(false)} title={t('changeRequests.new')}>
        <NewForm project={project} onDone={() => setCreating(false)} />
      </Dialog>
    </section>
  )
}
