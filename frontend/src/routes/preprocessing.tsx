import { createFileRoute } from '@tanstack/react-router'
import { SlidersHorizontal } from 'lucide-react'
import { StagePage } from '@/components/stage-page'

export const Route = createFileRoute('/preprocessing')({
  component: Preprocessing,
})

function Preprocessing() {
  return (
    <StagePage
      icon={SlidersHorizontal}
      title="Preprocessing"
      description="Normalize radiomics features, run feature selection, and define train/test splits."
    />
  )
}
