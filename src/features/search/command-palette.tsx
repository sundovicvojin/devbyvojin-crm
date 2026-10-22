import { Command } from 'cmdk'
import { Kanban, Plus, Search, User, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Dialog } from '@/components/ui/dialog'
import { useAllContacts, useClients } from '@/features/clients/api'
import { useLeads } from '@/features/leads/api'
import { useOrg } from '@/lib/org'

export function CommandPalette({ open, onClose, onQuickAdd }: { open: boolean; onClose: () => void; onQuickAdd: () => void }) {
  const { t } = useTranslation()
  const org = useOrg()
  const navigate = useNavigate()
  const clients = useClients(org.id)
  const contacts = useAllContacts(org.id)
  const leads = useLeads(org.id)

  function go(path: string) {
    onClose()
    void navigate(path)
  }

  const item = 'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm aria-selected:bg-muted'

  return (
    <Dialog open={open} onClose={onClose} title={t('search.title')} className="max-w-xl">
      <Command label={t('search.title')} className="space-y-2">
        <div className="flex items-center gap-2 rounded-md border px-3">
          <Search className="size-4 text-muted-foreground" />
          <Command.Input autoFocus placeholder={t('search.placeholder')} className="h-9 w-full bg-transparent text-sm outline-none" />
        </div>
        <Command.List className="max-h-80 overflow-auto">
          <Command.Empty className="p-4 text-center text-sm text-muted-foreground">{t('common.noResults')}</Command.Empty>
          <Command.Group heading={t('search.actions')} className="text-xs text-muted-foreground">
            <Command.Item className={item} onSelect={() => { onClose(); onQuickAdd() }}><Plus className="size-4" />{t('quick.title')}</Command.Item>
          </Command.Group>
          <Command.Group heading={t('nav.clients')} className="text-xs text-muted-foreground">
            {clients.data?.map((c) => (
              <Command.Item key={c.id} value={`klijent ${c.name} ${c.tags.join(' ')}`} className={item} onSelect={() => go(`/clients/${c.id}`)}>
                <Users className="size-4" />{c.name}
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading={t('contacts.title')} className="text-xs text-muted-foreground">
            {contacts.data?.filter((c) => c.client_id).map((c) => (
              <Command.Item key={c.id} value={`kontakt ${c.full_name} ${c.email ?? ''}`} className={item} onSelect={() => go(`/clients/${c.client_id ?? ''}`)}>
                <User className="size-4" />{c.full_name}{c.email ? <span className="text-xs text-muted-foreground">{c.email}</span> : null}
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading={t('nav.leads')} className="text-xs text-muted-foreground">
            {leads.data?.map((l) => (
              <Command.Item key={l.id} value={`lead ${l.title}`} className={item} onSelect={() => go(`/leads?lead=${l.id}`)}>
                <Kanban className="size-4" />{l.title}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </Dialog>
  )
}
