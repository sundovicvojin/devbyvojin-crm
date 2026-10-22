import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useMyOrganizations() {
  return useQuery({
    queryKey: ['organizations', 'mine'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memberships')
        .select('role, organizations(id, name, default_currency, locale)')
        .order('created_at')
      if (error) throw error
      return data
    },
  })
}

export function useCreateOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; currency: string }) => {
      const { data, error } = await supabase.rpc('create_organization', {
        p_name: input.name,
        p_currency: input.currency,
        p_locale: 'sr',
      })
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organizations'] }),
  })
}
