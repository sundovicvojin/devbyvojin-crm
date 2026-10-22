import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toDateInput } from '@/lib/format'
import type {
  ChangeRequest, ChangeRequestInsert, Milestone, MilestoneInsert, Project, ProjectFile, ProjectInsert,
  ProjectStatus, ProjectTemplate, Task, TaskInsert,
} from '@/types/database'

export const PROJECT_STATUSES: ProjectStatus[] = ['preparation', 'in_progress', 'waiting_client', 'review', 'completed', 'maintenance']

function useInvalidate() {
  const qc = useQueryClient()
  return (...keys: string[]) => {
    for (const k of keys) void qc.invalidateQueries({ queryKey: [k] })
  }
}

// ---------- Projekti ----------
export function useProjects(orgId: string) {
  return useQuery({
    queryKey: ['projects', orgId],
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase.from('projects').select('*').eq('organization_id', orgId).order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Project> => {
      const { data, error } = await supabase.from('projects').select('*').eq('id', id ?? '').single()
      if (error) throw error
      return data
    },
  })
}

export function useSaveProject() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (input: { id?: string; values: ProjectInsert; templateId?: string }): Promise<Project> => {
      const values = { ...input.values, last_update_at: new Date().toISOString() }
      const q = input.id ? supabase.from('projects').update(values).eq('id', input.id) : supabase.from('projects').insert(values)
      const { data, error } = await q.select().single()
      if (error) throw error

      if (!input.id && input.templateId) {
        const { data: tt, error: e2 } = await supabase.from('project_template_tasks').select('*').eq('template_id', input.templateId).order('position')
        if (e2) throw e2
        if (tt.length > 0) {
          const base = new Date()
          const { error: e3 } = await supabase.from('tasks').insert(
            tt.map((x) => {
              const due = new Date(base)
              if (x.offset_days !== null) due.setDate(due.getDate() + x.offset_days)
              return {
                organization_id: data.organization_id,
                project_id: data.id,
                title: x.title,
                position: x.position,
                due_date: x.offset_days === null ? null : toDateInput(due),
              }
            }),
          )
          if (e3) throw e3
        }
      }
      return data
    },
    onSuccess: () => invalidate('projects', 'project', 'tasks', 'today'),
  })
}

export function useSetProjectStatus(orgId: string) {
  const qc = useQueryClient()
  const key = ['projects', orgId]
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProjectStatus }) => {
      const { error } = await supabase.from('projects').update({ status, last_update_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<Project[]>(key)
      qc.setQueryData<Project[]>(key, (old) => old?.map((p) => (p.id === id ? { ...p, status } : p)))
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['projects'] })
      void qc.invalidateQueries({ queryKey: ['project'] })
    },
  })
}

export function useDeleteProject() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate('projects', 'project', 'tasks', 'milestones', 'today'),
  })
}

// ---------- Šabloni ----------
export function useTemplates(orgId: string) {
  return useQuery({
    queryKey: ['templates', orgId],
    queryFn: async (): Promise<ProjectTemplate[]> => {
      const { data, error } = await supabase.from('project_templates').select('*').eq('organization_id', orgId).order('name')
      if (error) throw error
      return data
    },
  })
}

// ---------- Zadaci ----------
export function useProjectTasks(projectId: string) {
  return useQuery({
    queryKey: ['tasks', 'project', projectId],
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase.from('tasks').select('*').eq('project_id', projectId).order('position').order('created_at')
      if (error) throw error
      return data
    },
  })
}

export function useAllTasksWithDue(orgId: string) {
  return useQuery({
    queryKey: ['tasks', 'due', orgId],
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase.from('tasks').select('*').eq('organization_id', orgId).not('due_date', 'is', null).neq('status', 'done')
      if (error) throw error
      return data
    },
  })
}

export function useSaveTask() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (input: { id?: string; values: Partial<TaskInsert> & Pick<TaskInsert, 'organization_id'> }) => {
      const { error } = input.id
        ? await supabase.from('tasks').update(input.values).eq('id', input.id)
        : await supabase.from('tasks').insert({ title: '', ...input.values })
      if (error) throw error
    },
    onSuccess: () => invalidate('tasks', 'today', 'projects'),
  })
}

export function useToggleTask() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status: done ? 'done' : 'todo', completed_at: done ? new Date().toISOString() : null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate('tasks', 'today'),
  })
}

export function useDeleteTask() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate('tasks', 'today'),
  })
}

// ---------- Milestone-ovi ----------
export function useMilestones(projectId: string) {
  return useQuery({
    queryKey: ['milestones', 'project', projectId],
    queryFn: async (): Promise<Milestone[]> => {
      const { data, error } = await supabase.from('project_milestones').select('*').eq('project_id', projectId).order('position').order('created_at')
      if (error) throw error
      return data
    },
  })
}

export function useAllMilestonesWithDue(orgId: string) {
  return useQuery({
    queryKey: ['milestones', 'due', orgId],
    queryFn: async (): Promise<Milestone[]> => {
      const { data, error } = await supabase.from('project_milestones').select('*').eq('organization_id', orgId).not('due_date', 'is', null).neq('status', 'paid')
      if (error) throw error
      return data
    },
  })
}

export function useSaveMilestone() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (input: { id?: string; values: MilestoneInsert }) => {
      const { error } = input.id
        ? await supabase.from('project_milestones').update(input.values).eq('id', input.id)
        : await supabase.from('project_milestones').insert(input.values)
      if (error) throw error
    },
    onSuccess: () => invalidate('milestones', 'projects'),
  })
}

export function useDeleteMilestone() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_milestones').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate('milestones'),
  })
}

// ---------- Change requests ----------
export function useChangeRequests(projectId: string) {
  return useQuery({
    queryKey: ['change_requests', projectId],
    queryFn: async (): Promise<ChangeRequest[]> => {
      const { data, error } = await supabase.from('change_requests').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useSaveChangeRequest() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (input: { id?: string; values: ChangeRequestInsert }) => {
      const { error } = input.id
        ? await supabase.from('change_requests').update(input.values).eq('id', input.id)
        : await supabase.from('change_requests').insert(input.values)
      if (error) throw error
    },
    onSuccess: () => invalidate('change_requests', 'projects'),
  })
}

export function useDeleteChangeRequest() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('change_requests').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate('change_requests'),
  })
}

// ---------- Fajlovi ----------
export function useProjectFiles(projectId: string) {
  return useQuery({
    queryKey: ['files', projectId],
    queryFn: async (): Promise<ProjectFile[]> => {
      const { data, error } = await supabase.from('files').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useUploadFile(orgId: string, projectId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (file: File) => {
      const safeName = file.name.replace(/[^\w.\-]+/g, '_')
      const path = `${orgId}/${projectId}/${crypto.randomUUID()}-${safeName}`
      const up = await supabase.storage.from('files').upload(path, file, { contentType: file.type || undefined })
      if (up.error) throw up.error
      const { error } = await supabase.from('files').insert({
        organization_id: orgId, project_id: projectId, storage_path: path, name: file.name,
        mime_type: file.type || null, size_bytes: file.size,
      })
      if (error) {
        await supabase.storage.from('files').remove([path])
        throw error
      }
    },
    onSuccess: () => invalidate('files', 'projects'),
  })
}

export function useDeleteFile() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (file: ProjectFile) => {
      const { error } = await supabase.from('files').delete().eq('id', file.id)
      if (error) throw error
      await supabase.storage.from('files').remove([file.storage_path])
    },
    onSuccess: () => invalidate('files'),
  })
}

export async function openFile(file: ProjectFile): Promise<void> {
  const { data, error } = await supabase.storage.from('files').createSignedUrl(file.storage_path, 60)
  if (error) throw error
  window.open(data.signedUrl, '_blank', 'noopener')
}
