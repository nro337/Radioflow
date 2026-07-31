import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type SortDir = 'asc' | 'desc'

export function SortableTableHead({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
  className?: string
}) {
  const Icon = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex items-center gap-1 whitespace-nowrap hover:text-foreground',
          active ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
        <Icon className="size-3" />
      </button>
    </TableHead>
  )
}
