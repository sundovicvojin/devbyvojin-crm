import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Lead, LeadInsert, Stage } from '@/types/database'

export function useStages(orgId: string) {
  return useQuery({
    queryKey: ['stages', orgId],
    queryFn: async (): Promise<Stage[]> => {
      const { data, error } = await supabase.from('pipeline_stages').select('*').eq('organization_id', orgId).order('position')
      if (error) throw error
      return data
    },
  })
}

export function useLeads(orgId: string) {
  return useQuery({
    queryKey: ['leads', orgId],
    queryFn: async (): Promise<Lead[]> => {
      const { data, error } = await supabase.from('leads').select('*').eq('organization_id', orgId).order('position')
      if (error) throw error
      return data
    },
  })
}

export function useSaveLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id?: string; values: LeadInsert }) => {
      const { error } = input.id
        ? await supabase.from('leads').update(input.values).eq('id', input.id)
        : await supabase.from('leads').insert(input.values)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['leads'] })
      void qc.invalidateQueries({ queryKey: ['today'] })
    },
  })
}

export function useDeleteLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['leads'] })
      void qc.invalidateQueries({ queryKey: ['today'] })
    },
  })
}

export type MoveInput = { lead: Lead; stage: Stage; position: number; lostReason?: string }

/** Polja leada koja zavise od faze u kojoj se nalazi. */
export function stageFields(stage: Stage, lostReason: string | null): Pick<Lead, 'stage_id' | 'closed_at' | 'lost_reason'> {
  return {
    stage_id: stage.id,
    closed_at: stage.kind === 'open' ? null : new Date().toISOString(),
    lost_reason: stage.kind === 'lost' ? lostReason : null,
  }
}

export function useMoveLead(orgId: string) {
  const qc = useQueryClient()
  const key = ['leads', orgId]
  return useMutation({
    mutationFn: async ({ lead, stage, position, lostReason }: MoveInput) => {
      const { error } = await supabase
        .from('leads')
        .update({ ...stageFields(stage, lostReason ?? null), position })
        .eq('id', lead.id)
      if (error) throw error
    },
    onMutate: async ({ lead, stage, position, lostReason }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<Lead[]>(key)
      qc.setQueryData<Lead[]>(key, (old) =>
        old?.map((l) => (l.id === lead.id ? { ...l, ...stageFields(stage, lostReason ?? null), position } : l)),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key })
      void qc.invalidateQueries({ queryKey: ['today'] })
    },
  })
}
