import { Briefcase, CalendarCheck, FileText, Globe, Kanban, LogOut, Megaphone, Plus, Search, Settings, Users, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { CommandPalette } from '@/features/search/command-palette'
import { QuickAdd } from '@/features/search/quick-add'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

const items = [
  { to: '/', key: 'today', icon: CalendarCheck },
  { to: '/clients', key: 'clients', icon: Users },
  { to: '/leads', key: 'leads', icon: Kanban },
  { to: '/projects', key: 'projects', icon: Briefcase },
  { to: '/invoices', key: 'invoices', icon: FileText },
  { to: '/maintenance', key: 'maintenance', icon: Wrench },
  { to: '/outreach', key: 'outreach', icon: Megaphone },
  { to: '/settings', key: 'settings', icon: Settings },
] as const

export function AppLayout({ orgName }: { orgName: string }) {
  const { t } = useTranslation()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key.toLowerCase() === 'k' && !e.shiftKey) {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      } else if (e.key.toLowerCase() === 'a' && e.shiftKey) {
        e.preventDefault()
        setQuickOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-full">
      <aside className="flex w-56 shrink-0 flex-col border-r bg-muted/40 p-3">
        <div className="mb-4 flex items-center gap-2 px-2 pt-6 text-sm font-semibold" data-tauri-drag-region>
          <Globe className="size-4 text-primary" />
          <span className="truncate">{orgName}</span>
        </div>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="mb-2 flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">{t('nav.search')}</span>
          <kbd className="text-xs">⌘K</kbd>
        </button>
        <button
          type="button"
          onClick={() => setQuickOpen(true)}
          className="mb-3 flex items-center gap-2 rounded-md bg-primary px-2 py-1.5 text-sm text-primary-foreground hover:opacity-90"
        >
          <Plus className="size-4" />
          <span className="flex-1 text-left">{t('quick.title')}</span>
          <kbd className="text-xs opacity-80">⌘⇧A</kbd>
        </button>
        <nav className="flex flex-1 flex-col gap-0.5">
          {items.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted',
                  isActive && 'bg-muted font-medium text-foreground',
                )
              }
            >
              <Icon className="size-4" />
              {t(`nav.${key}`)}
            </NavLink>
          ))}
        </nav>
        <Button variant="ghost" size="sm" className="justify-start" onClick={() => void supabase.auth.signOut()}>
          <LogOut className="size-4" />
          {t('common.logout')}
        </Button>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onQuickAdd={() => setQuickOpen(true)} />
      <QuickAdd open={quickOpen} onClose={() => setQuickOpen(false)} />
    </div>
  )
}
