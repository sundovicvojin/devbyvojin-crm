import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { toDateInput } from '@/lib/format'
import { useOrg } from '@/lib/org'
import { cn } from '@/lib/utils'
import type { Project } from '@/types/database'
import { useAllMilestonesWithDue, useAllTasksWithDue } from './api'

type Entry = { key: string; label: string; kind: 'project' | 'milestone' | 'task'; projectId: string | null }

const kindCls: Record<Entry['kind'], string> = {
  project: 'bg-primary/15 text-primary',
  milestone: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  task: 'bg-muted text-muted-foreground',
}

export function DeadlineCalendar({ projects }: { projects: Project[] }) {
  const { t } = useTranslation()
  const org = useOrg()
  const tasks = useAllTasksWithDue(org.id)
  const milestones = useAllMilestonesWithDue(org.id)
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const byDay = useMemo(() => {
    const map = new Map<string, Entry[]>()
    const add = (date: string | null, e: Entry) => {
      if (!date) return
      map.set(date, [...(map.get(date) ?? []), e])
    }
    for (const p of projects) if (p.status !== 'completed') add(p.deadline, { key: `p${p.id}`, label: p.name, kind: 'project', projectId: p.id })
    for (const m of milestones.data ?? []) add(m.due_date, { key: `m${m.id}`, label: m.name, kind: 'milestone', projectId: m.project_id })
    for (const x of tasks.data ?? []) add(x.due_date, { key: `t${x.id}`, label: x.title, kind: 'task', projectId: x.project_id })
    return map
  }, [projects, tasks.data, milestones.data])

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const offset = (new Date(year, month, 1).getDay() + 6) % 7 // ponedeljak prvi
  const days = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => {
    const day = i - offset + 1
    return day >= 1 && day <= days ? day : null
  })
  const todayStr = toDateInput(new Date())
  const title = new Intl.DateTimeFormat('sr-Latn-RS', { month: 'long', year: 'numeric' }).format(cursor)

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Prethodni mesec"><ChevronLeft className="size-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Sledeći mesec"><ChevronRight className="size-4" /></Button>
        <span className="ml-2 font-medium capitalize">{title}</span>
        <span className="ml-auto flex gap-3 text-xs text-muted-foreground">
          <span>■ {t('calendar.project')}</span><span>■ {t('calendar.milestone')}</span><span>■ {t('calendar.task')}</span>
        </span>
      </div>
      <div className="grid grid-cols-7 overflow-hidden rounded-xl border text-sm">
        {['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'].map((d) => (
          <div key={d} className="border-b bg-muted/50 px-2 py-1 text-xs font-medium text-muted-foreground">{d}</div>
        ))}
        {cells.map((day, i) => {
          const dateStr = day ? toDateInput(new Date(year, month, day)) : ''
          const entries = day ? (byDay.get(dateStr) ?? []) : []
          return (
            <div key={i} className={cn('min-h-24 border-b border-r p-1.5', !day && 'bg-muted/30')}>
              {day ? (
                <>
                  <span className={cn('inline-flex size-5 items-center justify-center rounded-full text-xs', dateStr === todayStr && 'bg-primary text-primary-foreground')}>{day}</span>
                  <div className="mt-1 space-y-0.5">
                    {entries.slice(0, 3).map((e) => {
                      const cls = cn('block truncate rounded px-1 py-0.5 text-xs', kindCls[e.kind])
                      return e.projectId ? <Link key={e.key} to={`/projects/${e.projectId}`} className={cls}>{e.label}</Link> : <span key={e.key} className={cls}>{e.label}</span>
                    })}
                    {entries.length > 3 ? <span className="block px-1 text-xs text-muted-foreground">+{entries.length - 3}</span> : null}
                  </div>
                </>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
