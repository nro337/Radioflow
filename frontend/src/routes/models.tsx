import { createFileRoute } from '@tanstack/react-router'
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
    />
  )
}
