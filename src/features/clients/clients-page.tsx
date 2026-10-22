import { Plus, Search, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { useOrg } from '@/lib/org'
import { useClients } from './api'
import { ClientForm } from './client-form'

export function ClientsPage() {
  const { t } = useTranslation()
  const org = useOrg()
  const navigate = useNavigate()
  const clients = useClients(org.id)
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState('')

  if (clients.isPending) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  if (clients.isError) return <p className="text-sm text-destructive">{t('common.error')}</p>

  const q = filter.trim().toLowerCase()
  const rows = clients.data.filter((c) => !q || [c.name, c.country, ...c.tags].some((s) => s?.toLowerCase().includes(q)))

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('nav.clients')}</h1>
        <Button onClick={() => setCreating(true)}><Plus className="size-4" />{t('clients.new')}</Button>
      </div>

      {clients.data.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Users}
            title={t('clients.emptyTitle')}
            body={t('clients.emptyBody')}
            action={<Button onClick={() => setCreating(true)}>{t('clients.new')}</Button>}
          />
        </div>
      ) : (
        <>
          <div className="relative mt-6">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input className="pl-9" placeholder={t('clients.filter')} value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
          <ul className="mt-4 divide-y rounded-xl border">
            {rows.map((c) => (
              <li key={c.id}>
                <Link to={`/clients/${c.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{[c.country, c.source].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="flex gap-1">
                    {c.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                </Link>
              </li>
            ))}
            {rows.length === 0 ? <li className="px-4 py-6 text-center text-sm text-muted-foreground">{t('common.noResults')}</li> : null}
          </ul>
        </>
      )}

      <Dialog open={creating} onClose={() => setCreating(false)} title={t('clients.new')}>
        <ClientForm
          onDone={(saved) => {
            setCreating(false)
            if (saved) void navigate(`/clients/${saved.id}`)
          }}
        />
      </Dialog>
    </div>
  )
}
