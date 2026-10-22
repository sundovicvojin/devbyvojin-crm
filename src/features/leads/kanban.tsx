import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Client, Lead, Stage } from '@/types/database'

const COL = 'col:'

function LeadCard({ lead, client, onOpen, overlay }: { lead: Lead; client: Client | undefined; onOpen?: () => void; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id })
  const overdue = lead.next_step_at !== null && lead.closed_at === null && new Date(lead.next_step_at) < new Date(new Date().setHours(0, 0, 0, 0))
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={cn(
        'cursor-grab rounded-lg border bg-card p-3 text-sm shadow-sm active:cursor-grabbing',
        isDragging && !overlay && 'opacity-30',
      )}
    >
      <p className="font-medium">{lead.title}</p>
      {client ? <p className="text-xs text-muted-foreground">{client.name}</p> : null}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{lead.estimated_value > 0 ? formatMoney(lead.estimated_value, lead.currency) : ''}</span>
        {lead.next_step_at ? (
          <span className={cn(overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}>{formatDate(lead.next_step_at)}</span>
        ) : null}
      </div>
    </div>
  )
}

function Column({ stage, leads, clients, onOpen, onAdd }: {
  stage: Stage
  leads: Lead[]
  clients: Map<string, Client>
  onOpen: (lead: Lead) => void
  onAdd: () => void
}) {
  const { t } = useTranslation()
  const { setNodeRef, isOver } = useDroppable({ id: COL + stage.id })
  const total = leads.reduce((s, l) => s + l.estimated_value, 0)
  return (
    <div className="flex w-64 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: stage.color ?? 'var(--muted-foreground)' }} />
          <span className="text-sm font-medium">{stage.name}</span>
          <span className="text-xs text-muted-foreground">{leads.length}</span>
        </div>
        {stage.kind === 'open' ? (
          <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={onAdd} aria-label={t('leads.new')}>
            <Plus className="size-3.5" />
          </button>
        ) : null}
      </div>
      <div ref={setNodeRef} className={cn('flex min-h-24 flex-1 flex-col gap-2 rounded-xl bg-muted/40 p-2', isOver && 'bg-muted')}>
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((l) => (
            <LeadCard key={l.id} lead={l} client={l.client_id ? clients.get(l.client_id) : undefined} onOpen={() => onOpen(l)} />
          ))}
        </SortableContext>
      </div>
      {total > 0 ? <p className="mt-1 px-1 text-xs text-muted-foreground">{leads[0] ? formatMoney(total, leads[0].currency) : ''}</p> : null}
    </div>
  )
}

export type DropResult = { lead: Lead; stage: Stage; position: number }

export function Kanban({ stages, leads, clients, onDrop, onOpen, onAdd }: {
  stages: Stage[]
  leads: Lead[]
  clients: Map<string, Client>
  onDrop: (r: DropResult) => void
  onOpen: (lead: Lead) => void
  onAdd: (stageId: string) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const [activeId, setActiveId] = useState<string | null>(null)

  const byStage = (stageId: string) => leads.filter((l) => l.stage_id === stageId).sort((a, b) => a.position - b.position)

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const lead = leads.find((l) => l.id === e.active.id)
    const overId = e.over ? String(e.over.id) : null
    if (!lead || !overId || overId === lead.id) return

    let stage: Stage | undefined
    let overLead: Lead | undefined
    if (overId.startsWith(COL)) {
      stage = stages.find((s) => s.id === overId.slice(COL.length))
    } else {
      overLead = leads.find((l) => l.id === overId)
      stage = stages.find((s) => s.id === overLead?.stage_id)
    }
    if (!stage) return

    const target = byStage(stage.id).filter((l) => l.id !== lead.id)
    let idx = target.length
    if (overLead) {
      const overIdx = target.findIndex((l) => l.id === overLead.id)
      const original = byStage(stage.id)
      const movingDown = lead.stage_id === stage.id && original.findIndex((l) => l.id === lead.id) < original.findIndex((l) => l.id === overLead.id)
      idx = movingDown ? overIdx + 1 : overIdx
    }
    const before = target[idx - 1]?.position
    const after = target[idx]?.position
    const position = before === undefined ? (after === undefined ? 0 : after - 1) : after === undefined ? before + 1 : (before + after) / 2
    if (lead.stage_id === stage.id && position === lead.position) return
    onDrop({ lead, stage, position })
  }

  const active = leads.find((l) => l.id === activeId)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((s) => (
          <Column key={s.id} stage={s} leads={byStage(s.id)} clients={clients} onOpen={onOpen} onAdd={() => onAdd(s.id)} />
        ))}
      </div>
      <DragOverlay>{active ? <LeadCard lead={active} client={active.client_id ? clients.get(active.client_id) : undefined} overlay /> : null}</DragOverlay>
    </DndContext>
  )
}
