import { createFileRoute } from '@tanstack/react-router'
import { ClipboardCheck } from 'lucide-react'
import { StagePage } from '@/components/stage-page'

export const Route = createFileRoute('/evaluation')({
  component: Evaluation,
})

function Evaluation() {
  return (
    <StagePage
      icon={ClipboardCheck}
      title="Evaluation"
      description="Review performance metrics for the experiment's trained model."
    />
  )
}
