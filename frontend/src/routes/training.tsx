import { createFileRoute } from '@tanstack/react-router'
import { PlayCircle } from 'lucide-react'
import { StagePage } from '@/components/stage-page'

export const Route = createFileRoute('/training')({
  component: Training,
})

function Training() {
  return (
    <StagePage
      icon={PlayCircle}
      title="Training"
      description="Kick off training and monitor progress, loss, and epochs for the experiment's model."
    />
  )
}
