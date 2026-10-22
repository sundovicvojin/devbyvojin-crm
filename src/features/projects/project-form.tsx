import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useClients } from '@/features/clients/api'
import { useOrg } from '@/lib/org'
import type { Project } from '@/types/database'
import { PROJECT_STATUSES, useDeleteProject, useSaveProject, useTemplates } from './api'

const schema = z.object({
  name: z.string().trim().min(1, 'projects.nameRequired'),
  client_id: z.string().min(1, 'projects.clientRequired'),
  status: z.enum(['preparation', 'in_progress', 'waiting_client', 'review', 'completed', 'maintenance']),
  deadline: z.string(),
  value: z.number().min(0),
  currency: z.enum(['EUR', 'RSD', 'USD']),
  repo_url: z.string(),
  figma_url: z.string(),
  staging_url: z.string(),
  production_url: z.string(),
  template_id: z.string(),
})
type Values = z.infer<typeof schema>
const orNull = (s: string) => (s.trim() === '' ? null : s.trim())

export function ProjectForm({ project, defaultClientId, onDone }: { project?: Project; defaultClientId?: string; onDone: (saved?: Project) => void }) {
  const { t } = useTranslation()
  const org = useOrg()
  const clients = useClients(org.id)
  const templates = useTemplates(org.id)
  const save = useSaveProject()
  const del = useDeleteProject()
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: project?.name ?? '',
      client_id: project?.client_id ?? defaultClientId ?? '',
      status: project?.status ?? 'preparation',
      deadline: project?.deadline ?? '',
      value: project?.value ?? 0,
      currency: project?.currency ?? org.currency,
      repo_url: project?.repo_url ?? '',
      figma_url: project?.figma_url ?? '',
      staging_url: project?.staging_url ?? '',
      production_url: project?.production_url ?? '',
      template_id: '',
    },
  })

  async function onSubmit(v: Values) {
    const saved = await save.mutateAsync({
      ...(project ? { id: project.id } : {}),
      ...(!project && v.template_id ? { templateId: v.template_id } : {}),
      values: {
        organization_id: org.id,
        name: v.name,
        client_id: v.client_id,
        status: v.status,
        deadline: orNull(v.deadline),
        value: v.value,
        currency: v.currency,
        repo_url: orNull(v.repo_url),
        figma_url: orNull(v.figma_url),
        staging_url: orNull(v.staging_url),
        production_url: orNull(v.production_url),
      },
    })
    onDone(saved)
  }

  const err = save.error ?? del.error

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Field label={t('projects.name')} error={errors.name?.message ? t(errors.name.message) : undefined}>
        <Input autoFocus {...register('name')} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('leads.client')} error={errors.client_id?.message ? t(errors.client_id.message) : undefined}>
          <Select {...register('client_id')}>
            <option value="">—</option>
            {clients.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label={t('projects.statusLabel')}>
          <Select {...register('status')}>
            {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{t(`projects.status.${s}`)}</option>)}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label={t('projects.deadline')}><Input type="date" {...register('deadline')} /></Field>
        <Field label={t('projects.value')}><Input type="number" min={0} step="0.01" {...register('value', { valueAsNumber: true })} /></Field>
        <Field label={t('clients.currency')}>
          <Select {...register('currency')}><option>EUR</option><option>RSD</option><option>USD</option></Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Repo"><Input placeholder="https://github.com/…" {...register('repo_url')} /></Field>
        <Field label="Figma"><Input placeholder="https://figma.com/…" {...register('figma_url')} /></Field>
        <Field label="Staging"><Input {...register('staging_url')} /></Field>
        <Field label={t('projects.production')}><Input {...register('production_url')} /></Field>
      </div>
      {!project ? (
        <Field label={t('projects.template')}>
          <Select {...register('template_id')}>
            <option value="">{t('projects.noTemplate')}</option>
            {templates.data?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </Select>
        </Field>
      ) : null}
      {err ? <p className="text-sm text-destructive">{err.message}</p> : null}
      <div className="flex justify-between pt-2">
        {project ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              if (window.confirm(t('projects.confirmDelete'))) void del.mutateAsync(project.id).then(() => onDone())
            }}
          >
            {t('common.delete')}
          </Button>
        ) : <span />}
        <Button type="submit" disabled={save.isPending}>{t('common.save')}</Button>
      </div>
    </form>
  )
}
