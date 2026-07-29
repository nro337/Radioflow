import { createFileRoute } from '@tanstack/react-router'
import { Target } from 'lucide-react'
import { StagePage } from '@/components/stage-page'

export const Route = createFileRoute('/prediction')({
  component: Prediction,
})

function Prediction() {
  return (
    <StagePage
      icon={Target}
      title="Prediction"
      description="Run inference on new images or features using the experiment's trained model."
    />
  )
}
