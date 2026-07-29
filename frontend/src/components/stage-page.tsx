import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StagePageProps {
  icon: LucideIcon
  title: string
  description: string
  children?: ReactNode
}

export function StagePage({ icon: Icon, title, description, children }: StagePageProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Icon className="size-4 text-muted-foreground" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {children ?? (
            <p className="text-sm text-muted-foreground">
              This stage isn't wired up to the API yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
