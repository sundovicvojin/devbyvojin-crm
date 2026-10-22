import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode; className?: string }

export function Dialog({ open, onClose, title, children, className }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className={cn(
        'm-auto w-full max-w-lg rounded-xl border bg-card p-0 text-foreground backdrop:bg-black/50',
        className,
      )}
    >
      {open ? (
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted" aria-label="Zatvori">
              <X className="size-4" />
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  )
}
