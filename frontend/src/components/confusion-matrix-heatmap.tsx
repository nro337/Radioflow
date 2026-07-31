import { cn } from '@/lib/utils'
import type { ConfusionMatrix } from '@/lib/api'

// system (--color-chart-1..5), lightest -> darkest as magnitude increases.
const HEATMAP_STEPS = [
  { bg: 'bg-chart-1', text: 'text-black' },
  { bg: 'bg-chart-2', text: 'text-black' },
  { bg: 'bg-chart-3', text: 'text-white' },
  { bg: 'bg-chart-4', text: 'text-white' },
  { bg: 'bg-chart-5', text: 'text-white' },
]

function heatmapStep(value: number, max: number) {
  if (max <= 0) return HEATMAP_STEPS[0]
  const ratio = value / max
  const index = Math.min(HEATMAP_STEPS.length - 1, Math.floor(ratio * HEATMAP_STEPS.length))
  return HEATMAP_STEPS[index]
}

export function ConfusionMatrixHeatmap({ data }: { data: ConfusionMatrix }) {
  const { labels, matrix } = data
  const max = Math.max(1, ...matrix.flat())

  return (
    <div className="flex gap-2">
      <div
        className="flex items-center justify-center text-xs font-medium text-muted-foreground"
        style={{ writingMode: 'vertical-rl' }}
      >
        True label
      </div>
      <div className="flex flex-col gap-2 overflow-x-auto">
        <div
          className="grid gap-px"
          style={{
            gridTemplateColumns: `minmax(64px, auto) repeat(${labels.length}, minmax(56px, 1fr))`,
          }}
        >
          <div />
          {labels.map((label) => (
            <div
              key={label}
              className="flex items-end justify-center pb-1 text-center text-xs font-medium text-muted-foreground"
              title={label}
            >
              <span className="line-clamp-2 break-all">{label}</span>
            </div>
          ))}
          {matrix.map((row, rowIndex) => (
            <div className="contents" key={labels[rowIndex]}>
              <div
                className="flex items-center justify-end pr-2 text-right text-xs font-medium text-muted-foreground"
                title={labels[rowIndex]}
              >
                <span className="line-clamp-2 break-all">{labels[rowIndex]}</span>
              </div>
              {row.map((value, colIndex) => {
                const step = heatmapStep(value, max)
                const isDiagonal = rowIndex === colIndex
                return (
                  <div
                    key={colIndex}
                    title={`True: ${labels[rowIndex]} · Predicted: ${labels[colIndex]} · Count: ${value}`}
                    className={cn(
                      'flex aspect-square min-h-12 items-center justify-center text-sm font-medium tabular-nums',
                      step.bg,
                      step.text,
                      isDiagonal && 'ring-2 ring-inset ring-primary/50',
                    )}
                  >
                    {value}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">Predicted label</p>
      </div>
    </div>
  )
}
