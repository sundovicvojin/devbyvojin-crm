import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Client, Project, ProjectStatus } from '@/types/database'
import { PROJECT_STATUSES } from './api'

function Card({ project, client, overlay }: { project: Project; client: Client | undefined; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: project.id })
  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      {...attributes}
      {...listeners}
      className={cn('cursor-grab rounded-lg border bg-card p-3 text-sm shadow-sm', isDragging && !overlay && 'opacity-30')}
    >
      <Link to={`/projects/${project.id}`} className="font-medium hover:underline" onPointerDown={(e) => e.stopPropagation()}>{project.name}</Link>
      {client ? <p className="text-xs text-muted-foreground">{client.name}</p> : null}
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{project.value > 0 ? formatMoney(project.value, project.currency) : ''}</span>
        <span>{project.deadline ? formatDate(project.deadline) : ''}</span>
      </div>
    </div>
  )
}

function Column({ status, children, count }: { status: ProjectStatus; children: React.ReactNode; count: number }) {
  const { t } = useTranslation()
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div className="flex w-64 shrink-0 flex-col">
      <div className="mb-2 px-1 text-sm font-medium">{t(`projects.status.${status}`)} <span className="text-xs text-muted-foreground">{count}</span></div>
      <div ref={setNodeRef} className={cn('flex min-h-24 flex-1 flex-col gap-2 rounded-xl bg-muted/40 p-2', isOver && 'bg-muted')}>{children}</div>
    </div>
  )
}

export function ProjectsBoard({ projects, clients, onMove }: {
  projects: Project[]
  clients: Map<string, Client>
  onMove: (id: string, status: ProjectStatus) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = projects.find((p) => p.id === activeId)

  function onEnd(e: DragEndEvent) {
    setActiveId(null)
    const project = projects.find((p) => p.id === e.active.id)
    const status = e.over ? (String(e.over.id) as ProjectStatus) : null
    if (project && status && PROJECT_STATUSES.includes(status) && project.status !== status) onMove(project.id, status)
  }

  return (
    <DndContext sensors={sensors} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={onEnd} onDragCancel={() => setActiveId(null)}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PROJECT_STATUSES.map((s) => {
          const items = projects.filter((p) => p.status === s)
          return (
            <Column key={s} status={s} count={items.length}>
              {items.map((p) => <Card key={p.id} project={p} client={clients.get(p.client_id)} />)}
            </Column>
          )
        })}
      </div>
      <DragOverlay>{active ? <Card project={active} client={clients.get(active.client_id)} overlay /> : null}</DragOverlay>
    </DndContext>
  )
}
