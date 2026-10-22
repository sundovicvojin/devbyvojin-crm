import { Briefcase, Calendar, KanbanSquare, List, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { useClients } from '@/features/clients/api'
import { formatDate, formatMoney } from '@/lib/format'
import { useOrg } from '@/lib/org'
import { cn } from '@/lib/utils'
import { useProjects, useSetProjectStatus } from './api'
import { DeadlineCalendar } from './deadline-calendar'
import { ProjectForm } from './project-form'
import { ProjectsBoard } from './projects-board'

type View = 'list' | 'board' | 'calendar'
const VIEW_KEY = 'projects.view'

function loadView(): View {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    return v === 'board' || v === 'calendar' ? v : 'list'
  } catch {
    return 'list'
  }
}

export function ProjectsPage() {
  const { t } = useTranslation()
  const org = useOrg()
  const navigate = useNavigate()
  const projects = useProjects(org.id)
  const clients = useClients(org.id)
  const setStatus = useSetProjectStatus(org.id)
  const [view, setViewState] = useState<View>(loadView)
  const [creating, setCreating] = useState(false)
  const clientMap = useMemo(() => new Map((clients.data ?? []).map((c) => [c.id, c])), [clients.data])

  function setView(v: View) {
    setViewState(v)
    try { localStorage.setItem(VIEW_KEY, v) } catch { /* ignore */ }
  }

  if (projects.isPending) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  if (projects.isError) return <p className="text-sm text-destructive">{t('common.error')}</p>

  const views = [
    { id: 'list', icon: List, label: t('projects.viewList') },
    { id: 'board', icon: KanbanSquare, label: t('projects.viewBoard') },
    { id: 'calendar', icon: Calendar, label: t('projects.viewCalendar') },
  ] as const

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('nav.projects')}</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 rounded-md bg-muted p-1">
            {views.map(({ id, icon: Icon, label }) => (
              <button key={id} type="button" onClick={() => setView(id)} title={label}
                className={cn('flex items-center gap-1.5 rounded px-2.5 py-1 text-sm', view === id && 'bg-card font-medium shadow-sm')}>
                <Icon className="size-3.5" />{label}
              </button>
            ))}
          </div>
          <Button onClick={() => setCreating(true)}><Plus className="size-4" />{t('projects.new')}</Button>
        </div>
      </div>

      {projects.data.length === 0 && view !== 'calendar' ? (
        <EmptyState icon={Briefcase} title={t('projects.emptyTitle')} body={t('projects.emptyBody')}
          action={<Button onClick={() => setCreating(true)}>{t('projects.new')}</Button>} />
      ) : view === 'list' ? (
        <ul className="divide-y rounded-xl border">
          {projects.data.map((p) => (
            <li key={p.id}>
              <Link to={`/projects/${p.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/50">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{clientMap.get(p.client_id)?.name}</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{t(`projects.status.${p.status}`)}</span>
                  <span className="w-24 text-right text-muted-foreground">{p.deadline ? formatDate(p.deadline) : ''}</span>
                  <span className="w-20 text-right">{p.value > 0 ? formatMoney(p.value, p.currency) : ''}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : view === 'board' ? (
        <ProjectsBoard projects={projects.data} clients={clientMap} onMove={(id, status) => setStatus.mutate({ id, status })} />
      ) : (
        <DeadlineCalendar projects={projects.data} />
      )}
      {setStatus.error ? <p className="mt-2 text-sm text-destructive">{setStatus.error.message}</p> : null}

      <Dialog open={creating} onClose={() => setCreating(false)} title={t('projects.new')} className="max-w-xl">
        <ProjectForm onDone={(saved) => { setCreating(false); if (saved) void navigate(`/projects/${saved.id}`) }} />
      </Dialog>
    </div>
  )
}
