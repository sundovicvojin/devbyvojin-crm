import { zodResolver } from '@hookform/resolvers/zod'
import { Calendar, FileText, Mail, MessageSquare, Phone, Trash2, type LucideIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime } from '@/lib/format'
import { useOrg } from '@/lib/org'
import type { ActivityType } from '@/types/database'
import { useActivities, useCreateActivity, useDeleteActivity } from './api'

export const activityIcons: Record<ActivityType, LucideIcon> = {
  note: FileText,
  call: Phone,
  email: Mail,
  meeting: Calendar,
  message: MessageSquare,
}

const schema = z.object({
  type: z.enum(['note', 'call', 'email', 'meeting', 'message']),
  content: z.string().trim().min(1),
})
type Values = z.infer<typeof schema>

export function Timeline({ clientId, leadId }: { clientId?: string; leadId?: string }) {
  const { t } = useTranslation()
  const org = useOrg()
  const activities = useActivities({ ...(clientId ? { clientId } : {}), ...(leadId ? { leadId } : {}) })
  const create = useCreateActivity()
  const del = useDeleteActivity()
  const { register, handleSubmit, reset, formState: { isValid } } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { type: 'note', content: '' },
  })

  async function onSubmit(v: Values) {
    await create.mutateAsync({
      organization_id: org.id,
      type: v.type,
      content: v.content,
      occurred_at: new Date().toISOString(),
      client_id: clientId ?? null,
      lead_id: leadId ?? null,
      project_id: null,
    })
    reset({ type: v.type, content: '' })
  }

  return (
    <section>
      <h2 className="mb-2 font-semibold">{t('timeline.title')}</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 rounded-xl border p-3">
        <Textarea
          placeholder={t('timeline.placeholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleSubmit(onSubmit)()
          }}
          {...register('content')}
        />
        <div className="flex items-center justify-between">
          <Select className="w-40" {...register('type')}>
            {(['note', 'call', 'email', 'meeting', 'message'] as const).map((k) => (
              <option key={k} value={k}>{t(`activity.${k}`)}</option>
            ))}
          </Select>
          <Button type="submit" size="sm" disabled={!isValid || create.isPending}>{t('timeline.add')}</Button>
        </div>
        {create.error ? <p className="text-sm text-destructive">{create.error.message}</p> : null}
      </form>

      {activities.isPending ? <p className="mt-3 text-sm text-muted-foreground">{t('common.loading')}</p> : null}
      {activities.isError ? <p className="mt-3 text-sm text-destructive">{t('common.error')}</p> : null}
      {activities.data?.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">{t('timeline.empty')}</p> : null}
      <ul className="mt-3 space-y-3">
        {activities.data?.map((a) => {
          const Icon = activityIcons[a.type]
          return (
            <li key={a.id} className="group flex gap-3">
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted"><Icon className="size-3.5 text-muted-foreground" /></div>
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap text-sm">{a.content}</p>
                <p className="text-xs text-muted-foreground">{t(`activity.${a.type}`)} · {formatDateTime(a.occurred_at)}</p>
              </div>
              <button
                type="button"
                className="invisible rounded p-1 text-muted-foreground hover:bg-muted group-hover:visible"
                onClick={() => del.mutate(a.id)}
                aria-label={t('common.delete')}
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
