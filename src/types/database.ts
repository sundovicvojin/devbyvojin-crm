// PRIVREMENO: ručno napisan podskup šeme dok se migracije ne primene.
// Zameni generisanim fajlom: `npm run gen:types` (traži `supabase login`).

export type OrgRole = 'owner' | 'member' | 'collaborator'

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          default_currency: string
          locale: string
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: never
        Update: { name?: string; default_currency?: string; locale?: string }
        Relationships: []
      }
      memberships: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          role: OrgRole
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: { user_id: string; organization_id: string; role?: OrgRole }
        Update: { role?: OrgRole }
        Relationships: [
          {
            foreignKeyName: 'memberships_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      create_organization: {
        Args: { p_name: string; p_currency?: string; p_locale?: string }
        Returns: string
      }
    }
    Enums: { org_role: OrgRole }
    CompositeTypes: Record<string, never>
  }
}
