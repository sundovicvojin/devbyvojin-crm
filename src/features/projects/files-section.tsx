import { Download, FileIcon, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { useOrg } from '@/lib/org'
import { cn } from '@/lib/utils'
import { openFile, useDeleteFile, useProjectFiles, useUploadFile } from './api'

function formatSize(bytes: number | null): string {
  if (bytes === null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function FilesSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const org = useOrg()
  const files = useProjectFiles(projectId)
  const upload = useUploadFile(org.id, projectId)
  const del = useDeleteFile()
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function uploadAll(list: FileList | null) {
    if (!list) return
    setError(null)
    for (const f of Array.from(list)) {
      try {
        await upload.mutateAsync(f)
      } catch (e) {
        setError(e instanceof Error ? e.message : t('common.error'))
      }
    }
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">{t('files.title')}</h2>
        <Button size="sm" variant="outline" disabled={upload.isPending} onClick={() => input.current?.click()}>
          <Upload className="size-3.5" />{upload.isPending ? t('files.uploading') : t('files.upload')}
        </Button>
        <input ref={input} type="file" multiple className="hidden" onChange={(e) => { void uploadAll(e.target.files); e.target.value = '' }} />
      </div>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); void uploadAll(e.dataTransfer.files) }}
        className={cn('rounded-xl border border-dashed', over && 'border-primary bg-primary/5')}
      >
        {files.data?.length === 0 ? <p className="p-4 text-center text-sm text-muted-foreground">{t('files.empty')}</p> : null}
        <ul className="divide-y empty:hidden">
          {files.data?.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <FileIcon className="size-4 text-muted-foreground" />
              <span className="flex-1 truncate">{f.name}</span>
              <span className="text-xs text-muted-foreground">{formatSize(f.size_bytes)} · {formatDate(f.created_at)}</span>
              <button type="button" aria-label={t('files.open')} className="rounded p-1 hover:bg-muted" onClick={() => void openFile(f).catch((e: Error) => setError(e.message))}><Download className="size-4" /></button>
              <button type="button" aria-label={t('common.delete')} className="rounded p-1 text-muted-foreground hover:bg-muted"
                onClick={() => { if (window.confirm(t('files.confirmDelete'))) del.mutate(f) }}><Trash2 className="size-3.5" /></button>
            </li>
          ))}
        </ul>
      </div>
      {error ?? del.error?.message ? <p className="mt-1 text-sm text-destructive">{error ?? del.error?.message}</p> : null}
    </section>
  )
}
