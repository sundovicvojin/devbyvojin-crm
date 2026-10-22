import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Activity, Client, ClientInsert, Contact, ContactInsert } from '@/types/database'

export function useClients(orgId: string) {
  return useQuery({
    queryKey: ['clients', orgId],
    queryFn: async (): Promise<Client[]> => {
      const { data, error } = await supabase.from('clients').select('*').eq('organization_id', orgId).order('name')
      if (error) throw error
      return data
    },
  })
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ['client', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Client> => {
      const { data, error } = await supabase.from('clients').select('*').eq('id', id ?? '').single()
      if (error) throw error
      return data
    },
  })
}

export function useSaveClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id?: string; values: ClientInsert }): Promise<Client> => {
      const q = input.id
        ? supabase.from('clients').update(input.values).eq('id', input.id)
        : supabase.from('clients').insert(input.values)
      const { data, error } = await q.select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clients'] })
      void qc.invalidateQueries({ queryKey: ['client'] })
    },
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries(),
  })
}

export function useContacts(clientId: string) {
  return useQuery({
    queryKey: ['contacts', clientId],
    queryFn: async (): Promise<Contact[]> => {
      const { data, error } = await supabase.from('contacts').select('*').eq('client_id', clientId).order('full_name')
      if (error) throw error
      return data
    },
  })
}

export function useAllContacts(orgId: string) {
  return useQuery({
    queryKey: ['contacts', 'all', orgId],
    queryFn: async (): Promise<Contact[]> => {
      const { data, error } = await supabase.from('contacts').select('*').eq('organization_id', orgId).order('full_name')
      if (error) throw error
      return data
    },
  })
}

export function useSaveContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id?: string; values: ContactInsert }) => {
      const { error } = input.id
        ? await supabase.from('contacts').update(input.values).eq('id', input.id)
        : await supabase.from('contacts').insert(input.values)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['contacts'] }),
  })
}

export function useDeleteContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['contacts'] }),
  })
}

export function useActivities(filter: { clientId?: string; leadId?: string }) {
  return useQuery({
    queryKey: ['activities', filter],
    queryFn: async (): Promise<Activity[]> => {
      let q = supabase.from('activities').select('*').order('occurred_at', { ascending: false })
      if (filter.clientId) q = q.eq('client_id', filter.clientId)
      if (filter.leadId) q = q.eq('lead_id', filter.leadId)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })
}

export function useCreateActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<Activity, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { error } = await supabase.from('activities').insert(values)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['activities'] }),
  })
}

export function useDeleteActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('activities').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['activities'] }),
  })
}
