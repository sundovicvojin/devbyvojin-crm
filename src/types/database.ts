// RUČNO pisan podskup šeme (do sada korišćene tabele). Zameni generisanim fajlom
// kad uradiš `npx supabase login`, pa `npm run gen:types`.

export type OrgRole = 'owner' | 'member' | 'collaborator'
export type Currency = 'EUR' | 'RSD' | 'USD'
export type Lang = 'sr' | 'en' | 'de'
export type StageKind = 'open' | 'won' | 'lost'
export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'message'
export type ProjectStatus = 'preparation' | 'in_progress' | 'waiting_client' | 'review' | 'completed' | 'maintenance'
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type MilestoneStatus = 'planned' | 'due' | 'invoiced' | 'paid'
export type ChangeRequestStatus = 'proposed' | 'approved' | 'rejected'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'

type Meta = { id: string; created_at: string; updated_at: string; created_by: string | null }
type Auto = 'id' | 'created_at' | 'updated_at' | 'created_by'
type Tbl<R, Optional extends keyof R = never> = {
  Row: R
  Insert: Omit<R, Optional | Auto> & Partial<Pick<R, Optional>> & Partial<Pick<R, Auto & keyof R>>
  Update: Partial<R>
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: Meta & { name: string; default_currency: Currency; locale: string }
        Insert: never
        Update: { name?: string; default_currency?: Currency; locale?: string }
        Relationships: []
      }
      memberships: Omit<Tbl<Meta & { user_id: string; organization_id: string; role: OrgRole }, 'role'>, 'Relationships'> & {
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
      clients: Tbl<
        Meta & {
          organization_id: string
          name: string
          country: string | null
          language: Lang
          currency: Currency
          tags: string[]
          notes: string | null
          source: string | null
        },
        'country' | 'language' | 'currency' | 'tags' | 'notes' | 'source'
      >
      contacts: Tbl<
        Meta & {
          organization_id: string
          client_id: string | null
          full_name: string
          email: string | null
          phone: string | null
          role_title: string | null
          private_notes: string | null
        },
        'client_id' | 'email' | 'phone' | 'role_title' | 'private_notes'
      >
      pipeline_stages: Tbl<
        Meta & {
          organization_id: string
          name: string
          position: number
          kind: StageKind
          probability: number
          color: string | null
        },
        'position' | 'kind' | 'probability' | 'color'
      >
      leads: Tbl<
        Meta & {
          organization_id: string
          title: string
          client_id: string | null
          contact_id: string | null
          stage_id: string
          source: string | null
          estimated_value: number
          currency: Currency
          position: number
          lost_reason: string | null
          next_step_at: string | null
          next_step_note: string | null
          closed_at: string | null
        },
        | 'client_id'
        | 'contact_id'
        | 'source'
        | 'estimated_value'
        | 'currency'
        | 'position'
        | 'lost_reason'
        | 'next_step_at'
        | 'next_step_note'
        | 'closed_at'
      >
      activities: Tbl<
        Meta & {
          organization_id: string
          type: ActivityType
          content: string
          occurred_at: string
          client_id: string | null
          lead_id: string | null
          project_id: string | null
        },
        'type' | 'occurred_at' | 'client_id' | 'lead_id' | 'project_id'
      >
      projects: Tbl<
        Meta & {
          organization_id: string
          client_id: string
          name: string
          status: ProjectStatus
          deadline: string | null
          value: number
          currency: Currency
          repo_url: string | null
          figma_url: string | null
          staging_url: string | null
          production_url: string | null
          last_update_at: string
        },
        'status' | 'deadline' | 'value' | 'currency' | 'repo_url' | 'figma_url' | 'staging_url' | 'production_url' | 'last_update_at'
      >
      tasks: Tbl<
        Meta & {
          organization_id: string
          project_id: string | null
          parent_id: string | null
          title: string
          due_date: string | null
          status: TaskStatus
          priority: TaskPriority
          waiting_on_client: boolean
          completed_at: string | null
          position: number
        },
        'project_id' | 'parent_id' | 'due_date' | 'status' | 'priority' | 'waiting_on_client' | 'completed_at' | 'position'
      >
      project_milestones: Tbl<
        Meta & {
          organization_id: string
          project_id: string
          name: string
          due_date: string | null
          amount: number | null
          percent: number | null
          status: MilestoneStatus
          position: number
        },
        'due_date' | 'amount' | 'percent' | 'status' | 'position'
      >
      change_requests: Tbl<
        Meta & {
          organization_id: string
          project_id: string
          description: string
          price: number
          currency: Currency
          status: ChangeRequestStatus
        },
        'price' | 'currency' | 'status'
      >
      project_templates: Tbl<Meta & { organization_id: string; name: string; description: string | null }, 'description'>
      project_template_tasks: Tbl<
        Meta & { organization_id: string; template_id: string; title: string; position: number; offset_days: number | null },
        'position' | 'offset_days'
      >
      files: Tbl<
        Meta & {
          organization_id: string
          project_id: string | null
          client_id: string | null
          storage_path: string
          name: string
          mime_type: string | null
          size_bytes: number | null
        },
        'project_id' | 'client_id' | 'mime_type' | 'size_bytes'
      >
      invoices: Tbl<
        Meta & {
          organization_id: string
          number: string
          client_id: string
          status: InvoiceStatus
          due_date: string | null
          currency: Currency
          total: number
        },
        'status' | 'due_date' | 'currency' | 'total'
      >
      reminders: Tbl<
        Meta & {
          organization_id: string
          title: string
          remind_at: string
          done_at: string | null
        },
        'done_at'
      >
      maintenance_items: Tbl<
        Meta & {
          organization_id: string
          client_id: string
          name: string
          domain: string | null
          domain_expires_at: string | null
          ssl_expires_at: string | null
          hosting_expires_at: string | null
        },
        'domain' | 'domain_expires_at' | 'ssl_expires_at' | 'hosting_expires_at'
      >
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

type Rows = Database['public']['Tables']
export type Client = Rows['clients']['Row']
export type ClientInsert = Rows['clients']['Insert']
export type Contact = Rows['contacts']['Row']
export type ContactInsert = Rows['contacts']['Insert']
export type Stage = Rows['pipeline_stages']['Row']
export type Lead = Rows['leads']['Row']
export type LeadInsert = Rows['leads']['Insert']
export type Activity = Rows['activities']['Row']
export type Project = Rows['projects']['Row']
export type ProjectInsert = Rows['projects']['Insert']
export type Task = Rows['tasks']['Row']
export type TaskInsert = Rows['tasks']['Insert']
export type Milestone = Rows['project_milestones']['Row']
export type MilestoneInsert = Rows['project_milestones']['Insert']
export type ChangeRequest = Rows['change_requests']['Row']
export type ChangeRequestInsert = Rows['change_requests']['Insert']
export type ProjectTemplate = Rows['project_templates']['Row']
export type TemplateTask = Rows['project_template_tasks']['Row']
export type ProjectFile = Rows['files']['Row']
