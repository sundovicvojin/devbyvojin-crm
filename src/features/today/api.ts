import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { endOfToday, toDateInput } from '@/lib/format'
import type { Lead } from '@/types/database'

export type ExpiryKind = 'domain' | 'ssl' | 'hosting'
export type Expiry = { id: string; name: string; clientId: string; kind: ExpiryKind; date: string }

export type TodayData = {
  leads: Lead[]
  tasks: { id: string; title: string; due_date: string; priority: string; waiting_on_client: boolean }[]
  invoices: { id: string; number: string; client_id: string; due_date: string; total: number; currency: 'EUR' | 'RSD' | 'USD' }[]
  reminders: { id: string; title: string; remind_at: string }[]
  expiries: Expiry[]
}

export function useToday(orgId: string) {
  return useQuery({
    queryKey: ['today', orgId],
    queryFn: async (): Promise<TodayData> => {
      const todayStr = toDateInput(new Date())
      const in30 = new Date()
      in30.setDate(in30.getDate() + 30)
      const in30Str = toDateInput(in30)

      const [leads, tasks, invoices, reminders, maintenance] = await Promise.all([
        supabase.from('leads').select('*').eq('organization_id', orgId).is('closed_at', null).lte('next_step_at', endOfToday().toISOString()).order('next_step_at'),
        supabase.from('tasks').select('id,title,due_date,priority,waiting_on_client').eq('organization_id', orgId).neq('status', 'done').lte('due_date', todayStr).order('due_date'),
        supabase.from('invoices').select('id,number,client_id,due_date,total,currency').eq('organization_id', orgId).in('status', ['sent', 'overdue']).lt('due_date', todayStr).order('due_date'),
        supabase.from('reminders').select('id,title,remind_at').eq('organization_id', orgId).is('done_at', null).lte('remind_at', endOfToday().toISOString()).order('remind_at'),
        supabase.from('maintenance_items').select('id,name,client_id,domain_expires_at,ssl_expires_at,hosting_expires_at').eq('organization_id', orgId)
          .or(`domain_expires_at.lte.${in30Str},ssl_expires_at.lte.${in30Str},hosting_expires_at.lte.${in30Str}`),
      ])
      for (const r of [leads, tasks, invoices, reminders, maintenance]) if (r.error) throw r.error

      const expiries: Expiry[] = []
      for (const m of maintenance.data ?? []) {
        const pairs: [ExpiryKind, string | null][] = [['domain', m.domain_expires_at], ['ssl', m.ssl_expires_at], ['hosting', m.hosting_expires_at]]
        for (const [kind, date] of pairs) {
          if (date && date <= in30Str) expiries.push({ id: `${m.id}:${kind}`, name: m.name, clientId: m.client_id, kind, date })
        }
      }
      expiries.sort((a, b) => a.date.localeCompare(b.date))

      return {
        leads: leads.data ?? [],
        tasks: (tasks.data ?? []).flatMap((t) => (t.due_date ? [{ ...t, due_date: t.due_date }] : [])),
        invoices: (invoices.data ?? []).flatMap((i) => (i.due_date ? [{ ...i, due_date: i.due_date }] : [])),
        reminders: reminders.data ?? [],
        expiries,
      }
    },
  })
}

export function useCompleteReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reminders').update({ done_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['today'] }),
  })
}
