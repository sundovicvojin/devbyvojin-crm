import { Briefcase, CalendarCheck, FileText, Globe, Kanban, LogOut, Megaphone, Settings, Users, Wrench } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
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
  return (
    <div className="flex h-full">
      <aside className="flex w-56 shrink-0 flex-col border-r bg-muted/40 p-3">
        <div className="mb-4 flex items-center gap-2 px-2 pt-6 text-sm font-semibold" data-tauri-drag-region>
          <Globe className="size-4 text-primary" />
          <span className="truncate">{orgName}</span>
        </div>
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
    </div>
  )
}
