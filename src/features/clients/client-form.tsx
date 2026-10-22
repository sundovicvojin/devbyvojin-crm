import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useOrg } from '@/lib/org'
import type { Client } from '@/types/database'
import { useDeleteClient, useSaveClient } from './api'

const schema = z.object({
  name: z.string().trim().min(1, 'clients.nameRequired'),
  country: z.string().trim(),
  language: z.enum(['sr', 'en', 'de']),
  currency: z.enum(['EUR', 'RSD', 'USD']),
  tags: z.string(),
  source: z.string().trim(),
  notes: z.string(),
})
type Values = z.infer<typeof schema>

const orNull = (s: string) => (s.trim() === '' ? null : s.trim())

export function ClientForm({ client, onDone }: { client?: Client; onDone: (saved?: Client) => void }) {
  const { t } = useTranslation()
  const org = useOrg()
  const save = useSaveClient()
  const del = useDeleteClient()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: client?.name ?? '',
      country: client?.country ?? '',
      language: client?.language ?? 'sr',
      currency: client?.currency ?? org.currency,
      tags: client?.tags.join(', ') ?? '',
      source: client?.source ?? '',
      notes: client?.notes ?? '',
    },
  })

  async function onSubmit(v: Values) {
    const saved = await save.mutateAsync({
      ...(client ? { id: client.id } : {}),
      values: {
        organization_id: org.id,
        name: v.name,
        country: orNull(v.country),
        language: v.language,
        currency: v.currency,
        tags: v.tags.split(',').map((x) => x.trim()).filter(Boolean),
        source: orNull(v.source),
        notes: orNull(v.notes),
      },
    })
    onDone(saved)
  }

  async function onDelete() {
    if (!client || !window.confirm(t('clients.confirmDelete'))) return
    await del.mutateAsync(client.id)
    onDone()
  }

  const err = save.error ?? del.error

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Field label={t('clients.name')} error={errors.name?.message ? t(errors.name.message) : undefined}>
        <Input autoFocus {...register('name')} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label={t('clients.country')}><Input {...register('country')} /></Field>
        <Field label={t('clients.language')}>
          <Select {...register('language')}>
            <option value="sr">Srpski</option>
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </Select>
        </Field>
        <Field label={t('clients.currency')}>
          <Select {...register('currency')}>
            <option>EUR</option>
            <option>RSD</option>
            <option>USD</option>
          </Select>
        </Field>
      </div>
      <Field label={t('clients.tags')}><Input placeholder="real-estate, wordpress" {...register('tags')} /></Field>
      <Field label={t('clients.source')}><Input {...register('source')} /></Field>
      <Field label={t('clients.notes')}><Textarea {...register('notes')} /></Field>
      {err ? <p className="text-sm text-destructive">{err.message}</p> : null}
      <div className="flex justify-between pt-2">
        {client ? (
          <Button type="button" variant="ghost" className="text-destructive" onClick={() => void onDelete()}>
            {t('common.delete')}
          </Button>
        ) : <span />}
        <Button type="submit" disabled={save.isPending}>{t('common.save')}</Button>
      </div>
    </form>
  )
}
