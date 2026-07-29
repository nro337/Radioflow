import { createFileRoute } from '@tanstack/react-router'
import { FlaskConical, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/experiments')({
  component: Experiments,
})

function Experiments() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        {/* Center the content */}
        <div className="flex-1">
          <h2 className="font-heading text-lg font-semibold">Experiments</h2>
          <p className="text-sm text-muted-foreground">
            Define a problem and track it through the radiomics workflow.
          </p>
        </div>
        <Button disabled className="ml-auto flex items-center">
          <Plus className="size-3.5" />
          New experiment
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <FlaskConical className="size-4 text-muted-foreground" />
            All experiments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No experiments yet.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
