import { ArrowLeft, Pencil } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { formatDate, formatMoney } from '@/lib/format'
import { useOrg } from '@/lib/org'
import { useLeads, useStages } from '@/features/leads/api'
import { useClient } from './api'
import { ClientForm } from './client-form'
import { ContactsSection } from './contacts-section'
import { Timeline } from './timeline'

export function ClientDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const org = useOrg()
  const client = useClient(id)
  const leads = useLeads(org.id)
  const stages = useStages(org.id)
  const [editing, setEditing] = useState(false)

  if (client.isPending) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  if (client.isError) return <p className="text-sm text-destructive">{t('common.error')}</p>

  const c = client.data
  const clientLeads = leads.data?.filter((l) => l.client_id === c.id) ?? []
  const stageName = (sid: string) => stages.data?.find((s) => s.id === sid)?.name ?? ''

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link to="/clients" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"><ArrowLeft className="size-3.5" />{t('nav.clients')}</Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{c.name}</h1>
            <p className="text-sm text-muted-foreground">{[c.country, c.language.toUpperCase(), c.currency, c.source].filter(Boolean).join(' · ')}</p>
            <div className="mt-2 flex gap-1">
              {c.tags.map((tag) => <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{tag}</span>)}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="size-3.5" />{t('common.edit')}</Button>
        </div>
        {c.notes ? <p className="mt-3 whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-sm">{c.notes}</p> : null}
      </div>

      <ContactsSection clientId={c.id} />

      {clientLeads.length > 0 ? (
        <section>
          <h2 className="mb-2 font-semibold">{t('nav.leads')}</h2>
          <ul className="divide-y rounded-xl border">
            {clientLeads.map((l) => (
              <li key={l.id}>
                <Link to={`/leads?lead=${l.id}`} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/50">
                  <span>{l.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {stageName(l.stage_id)} · {formatMoney(l.estimated_value, l.currency)}
                    {l.next_step_at ? ` · ${formatDate(l.next_step_at)}` : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Timeline clientId={c.id} />

      <Dialog open={editing} onClose={() => setEditing(false)} title={t('clients.edit')}>
        <ClientForm client={c} onDone={(saved) => { setEditing(false); if (!saved) void navigate('/clients') }} />
      </Dialog>
    </div>
  )
}
