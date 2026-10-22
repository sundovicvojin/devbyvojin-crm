import type { InputHTMLAttributes, Ref } from 'react'
import { cn } from '@/lib/utils'

type Props = InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }

export function Input({ className, ...props }: Props) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-md border bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary',
        className,
      )}
      {...props}
    />
  )
}
