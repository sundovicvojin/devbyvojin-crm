import { ArrowLeft, ExternalLink, Pencil } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { useClient } from '@/features/clients/api'
import { formatDate, formatMoney } from '@/lib/format'
import { useOrg } from '@/lib/org'
import type { ProjectStatus } from '@/types/database'
import { PROJECT_STATUSES, useProject, useSetProjectStatus } from './api'
import { ChangeRequestsSection } from './change-requests-section'
import { FilesSection } from './files-section'
import { MilestonesSection } from './milestones-section'
import { ProjectForm } from './project-form'
import { TasksSection } from './tasks-section'

export function ProjectDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const org = useOrg()
  const project = useProject(id)
  const client = useClient(project.data?.client_id)
  const setStatus = useSetProjectStatus(org.id)
  const [editing, setEditing] = useState(false)

  if (project.isPending) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  if (project.isError) return <p className="text-sm text-destructive">{t('common.error')}</p>

  const p = project.data
  const links = [
    { label: 'Repo', url: p.repo_url }, { label: 'Figma', url: p.figma_url },
    { label: 'Staging', url: p.staging_url }, { label: t('projects.production'), url: p.production_url },
  ].filter((l): l is { label: string; url: string } => Boolean(l.url))

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link to="/projects" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"><ArrowLeft className="size-3.5" />{t('nav.projects')}</Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{p.name}</h1>
            <p className="text-sm text-muted-foreground">
              {client.data ? <Link to={`/clients/${client.data.id}`} className="hover:underline">{client.data.name}</Link> : null}
              {p.deadline ? ` · ${t('projects.deadline')}: ${formatDate(p.deadline)}` : ''}
              {p.value > 0 ? ` · ${formatMoney(p.value, p.currency)}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select className="w-44" value={p.status} onChange={(e) => setStatus.mutate({ id: p.id, status: e.target.value as ProjectStatus })}>
              {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{t(`projects.status.${s}`)}</option>)}
            </Select>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="size-3.5" />{t('common.edit')}</Button>
          </div>
        </div>
        {links.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {links.map((l) => (
              <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-muted">
                {l.label}<ExternalLink className="size-3" />
              </a>
            ))}
          </div>
        ) : null}
        {setStatus.error ? <p className="mt-2 text-sm text-destructive">{setStatus.error.message}</p> : null}
      </div>

      <TasksSection projectId={p.id} />
      <MilestonesSection project={p} />
      <ChangeRequestsSection project={p} />
      <FilesSection projectId={p.id} />

      <Dialog open={editing} onClose={() => setEditing(false)} title={t('projects.edit')} className="max-w-xl">
        <ProjectForm project={p} onDone={(saved) => { setEditing(false); if (!saved) void navigate('/projects') }} />
      </Dialog>
    </div>
  )
}
