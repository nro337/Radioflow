import { createFileRoute, Link } from '@tanstack/react-router'
import { Cpu } from 'lucide-react'
import { StagePage } from '@/components/stage-page'

export const Route = createFileRoute('/models')({
  component: Models,
})

function Models() {
  return (
    <StagePage
      icon={Cpu}
      title="Model"
      description="Choose and configure the model architecture and hyperparameters for the experiment."
    >
      <p className="text-sm text-muted-foreground">
        Model and scaler selection happens directly on the{' '}
        <Link to="/training" className="text-primary underline-offset-4 hover:underline">
          Training
        </Link>{' '}
        page, alongside the sweep configuration.
      </p>
    </StagePage>
  )
}
