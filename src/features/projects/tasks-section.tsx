import { Hourglass, Plus, Trash2 } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toDateInput } from '@/lib/format'
import { useOrg } from '@/lib/org'
import { cn } from '@/lib/utils'
import type { Task, TaskPriority } from '@/types/database'
import { useDeleteTask, useProjectTasks, useSaveTask, useToggleTask } from './api'

function EditableText({ value, onSave, className }: { value: string; onSave: (v: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  if (!editing) {
    return (
      <span className={cn('cursor-text', className)} onDoubleClick={() => { setDraft(value); setEditing(true) }} title="Dvoklik za izmenu">
        {value}
      </span>
    )
  }
  const commit = () => {
    setEditing(false)
    if (draft.trim() !== '' && draft.trim() !== value) onSave(draft.trim())
  }
  return (
    <Input
      autoFocus
      className="h-7"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setEditing(false)
      }}
    />
  )
}

function TaskRow({ task, projectId, level, onAddSub }: { task: Task; projectId: string; level: 0 | 1; onAddSub?: () => void }) {
  const { t } = useTranslation()
  const org = useOrg()
  const save = useSaveTask()
  const toggle = useToggleTask()
  const del = useDeleteTask()
  const done = task.status === 'done'
  const patch = (values: Partial<Task>) => save.mutate({ id: task.id, values: { organization_id: org.id, project_id: projectId, ...values } })

  return (
    <li className={cn('flex items-center gap-2 px-3 py-2 text-sm', level === 1 && 'pl-10', task.waiting_on_client && !done && 'bg-amber-500/5')}>
      <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={done} onChange={(e) => toggle.mutate({ id: task.id, done: e.target.checked })} />
      <EditableText value={task.title} onSave={(title) => patch({ title })} className={cn('flex-1', done && 'text-muted-foreground line-through')} />
      <button
        type="button"
        title={t('tasks.waitingClient')}
        onClick={() => patch({ waiting_on_client: !task.waiting_on_client })}
        className={cn('rounded p-1 hover:bg-muted', task.waiting_on_client ? 'text-amber-600' : 'text-muted-foreground/50')}
      >
        <Hourglass className="size-3.5" />
      </button>
      <Select className="h-7 w-24 text-xs" value={task.priority} onChange={(e) => patch({ priority: e.target.value as TaskPriority })}>
        {(['low', 'medium', 'high', 'urgent'] as const).map((p) => <option key={p} value={p}>{t(`tasks.priority.${p}`)}</option>)}
      </Select>
      <Input
        type="date"
        className="h-7 w-36 text-xs"
        value={task.due_date ?? ''}
        onChange={(e) => patch({ due_date: e.target.value || null })}
      />
      {onAddSub ? (
        <button type="button" title={t('tasks.addSub')} onClick={onAddSub} className="rounded p-1 text-muted-foreground hover:bg-muted"><Plus className="size-3.5" /></button>
      ) : <span className="w-6" />}
      <button type="button" aria-label={t('common.delete')} onClick={() => del.mutate(task.id)} className="rounded p-1 text-muted-foreground hover:bg-muted"><Trash2 className="size-3.5" /></button>
    </li>
  )
}

export function TasksSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const org = useOrg()
  const tasks = useProjectTasks(projectId)
  const save = useSaveTask()
  const [title, setTitle] = useState('')
  const [subOf, setSubOf] = useState<string | null>(null)
  const [subTitle, setSubTitle] = useState('')

  function add(parentId: string | null, value: string, reset: () => void) {
    if (value.trim() === '') return
    save.mutate(
      { values: { organization_id: org.id, project_id: projectId, title: value.trim(), parent_id: parentId, position: (tasks.data?.length ?? 0) + 1 } },
      { onSuccess: reset },
    )
  }
  const onEnter = (fn: () => void) => (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); fn() } }

  const top = tasks.data?.filter((x) => x.parent_id === null) ?? []
  const open = tasks.data?.filter((x) => x.status !== 'done').length ?? 0
  const waiting = tasks.data?.filter((x) => x.waiting_on_client && x.status !== 'done').length ?? 0

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-semibold">{t('tasks.title')}</h2>
        <span className="text-xs text-muted-foreground">
          {t('tasks.openCount', { count: open })}{waiting > 0 ? ` · ${t('tasks.waitingCount', { count: waiting })}` : ''}
        </span>
      </div>
      {tasks.isPending ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
      {tasks.isError ? <p className="text-sm text-destructive">{t('common.error')}</p> : null}
      {top.length > 0 ? (
        <ul className="divide-y rounded-xl border">
          {top.map((x) => (
            <div key={x.id}>
              <TaskRow task={x} projectId={projectId} level={0} onAddSub={() => { setSubOf(x.id); setSubTitle('') }} />
              {tasks.data?.filter((s) => s.parent_id === x.id).map((s) => <TaskRow key={s.id} task={s} projectId={projectId} level={1} />)}
              {subOf === x.id ? (
                <li className="list-none py-2 pl-10 pr-3">
                  <Input autoFocus className="h-7" placeholder={t('tasks.subPlaceholder')} value={subTitle}
                    onChange={(e) => setSubTitle(e.target.value)}
                    onBlur={() => !subTitle && setSubOf(null)}
                    onKeyDown={onEnter(() => add(x.id, subTitle, () => { setSubTitle(''); setSubOf(null) }))} />
                </li>
              ) : null}
            </div>
          ))}
        </ul>
      ) : tasks.data ? (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{t('tasks.empty')}</p>
      ) : null}
      <Input className="mt-2" placeholder={t('tasks.placeholder')} value={title} onChange={(e) => setTitle(e.target.value)}
        onKeyDown={onEnter(() => add(null, title, () => setTitle('')))} />
      {save.error ? <p className="mt-1 text-sm text-destructive">{save.error.message}</p> : null}
    </section>
  )
}
