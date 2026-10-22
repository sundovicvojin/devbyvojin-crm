import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Pencil, Phone, Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useOrg } from '@/lib/org'
import type { Contact } from '@/types/database'
import { useContacts, useDeleteContact, useSaveContact } from './api'

const schema = z.object({
  full_name: z.string().trim().min(1, 'clients.nameRequired'),
  email: z.union([z.literal(''), z.string().email('auth.invalidEmail')]),
  phone: z.string(),
  role_title: z.string(),
  private_notes: z.string(),
})
type Values = z.infer<typeof schema>
const orNull = (s: string) => (s.trim() === '' ? null : s.trim())

function ContactForm({ clientId, contact, onDone }: { clientId: string; contact?: Contact; onDone: () => void }) {
  const { t } = useTranslation()
  const org = useOrg()
  const save = useSaveContact()
  const del = useDeleteContact()
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: contact?.full_name ?? '',
      email: contact?.email ?? '',
      phone: contact?.phone ?? '',
      role_title: contact?.role_title ?? '',
      private_notes: contact?.private_notes ?? '',
    },
  })

  async function onSubmit(v: Values) {
    await save.mutateAsync({
      ...(contact ? { id: contact.id } : {}),
      values: {
        organization_id: org.id,
        client_id: clientId,
        full_name: v.full_name,
        email: orNull(v.email),
        phone: orNull(v.phone),
        role_title: orNull(v.role_title),
        private_notes: orNull(v.private_notes),
      },
    })
    onDone()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Field label={t('contacts.fullName')} error={errors.full_name?.message ? t(errors.full_name.message) : undefined}>
        <Input autoFocus {...register('full_name')} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('auth.email')} error={errors.email?.message ? t(errors.email.message) : undefined}><Input {...register('email')} /></Field>
        <Field label={t('contacts.phone')}><Input {...register('phone')} /></Field>
      </div>
      <Field label={t('contacts.role')}><Input {...register('role_title')} /></Field>
      <Field label={t('contacts.privateNotes')}><Textarea {...register('private_notes')} /></Field>
      {save.error ?? del.error ? <p className="text-sm text-destructive">{(save.error ?? del.error)?.message}</p> : null}
      <div className="flex justify-between pt-2">
        {contact ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              if (window.confirm(t('contacts.confirmDelete'))) void del.mutateAsync(contact.id).then(onDone)
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

export function ContactsSection({ clientId }: { clientId: string }) {
  const { t } = useTranslation()
  const contacts = useContacts(clientId)
  const [editing, setEditing] = useState<Contact | 'new' | null>(null)

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">{t('contacts.title')}</h2>
        <Button size="sm" variant="outline" onClick={() => setEditing('new')}><Plus className="size-3.5" />{t('contacts.new')}</Button>
      </div>
      {contacts.isPending ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
      {contacts.isError ? <p className="text-sm text-destructive">{t('common.error')}</p> : null}
      {contacts.data?.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{t('contacts.empty')}</p> : null}
      <ul className="divide-y rounded-xl border empty:hidden">
        {contacts.data?.map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium">{c.full_name} {c.role_title ? <span className="text-xs font-normal text-muted-foreground">· {c.role_title}</span> : null}</p>
              <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                {c.email ? <a className="inline-flex items-center gap-1 hover:underline" href={`mailto:${c.email}`}><Mail className="size-3" />{c.email}</a> : null}
                {c.phone ? <a className="inline-flex items-center gap-1 hover:underline" href={`tel:${c.phone}`}><Phone className="size-3" />{c.phone}</a> : null}
              </div>
              {c.private_notes ? <p className="mt-1 text-xs text-muted-foreground">{c.private_notes}</p> : null}
            </div>
            <button type="button" className="rounded p-1 hover:bg-muted" onClick={() => setEditing(c)} aria-label={t('common.edit')}><Pencil className="size-3.5" /></button>
          </li>
        ))}
      </ul>
      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? t('contacts.new') : t('contacts.edit')}>
        <ContactForm clientId={clientId} {...(editing && editing !== 'new' ? { contact: editing } : {})} onDone={() => setEditing(null)} />
      </Dialog>
    </section>
  )
}
