import type { Ref, SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { ref?: Ref<HTMLSelectElement> }) {
  return (
    <select
      className={cn('h-9 w-full rounded-md border bg-transparent px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary', className)}
      {...props}
    />
  )
}
