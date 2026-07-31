import { createFileRoute, Link } from '@tanstack/react-router'
import { Target } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { StagePage } from '@/components/stage-page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { SortableTableHead, type SortDir } from '@/components/sortable-table-head'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  datasetImageUrl,
  fetchEvaluation,
  runPrediction,
  type EvaluationRow,
  type PredictionResult,
} from '@/lib/api'
import { useCurrentExperimentStore } from '@/lib/current-experiment'

export const Route = createFileRoute('/prediction')({
  component: Prediction,
})

type SortKey = 'testRatio' | 'model' | 'scaler' | 'Weighted Average'

function comboKey(row: Pick<EvaluationRow, 'testRatio' | 'model' | 'scaler'>): string {
  return `${row.testRatio}|${row.model}|${row.scaler}`
}

function pickBestRow(rows: EvaluationRow[]): EvaluationRow | null {
  if (rows.length === 0) return null
  return rows.reduce((best, row) => {
    const score = row.metrics['Weighted Average'] ?? -Infinity
    const bestScore = best.metrics['Weighted Average'] ?? -Infinity
    return score > bestScore ? row : best
  }, rows[0])
}

function formatMetric(value: number | undefined): string {
  return value === undefined ? '—' : value.toFixed(4)
}

function sortedProbabilities(probabilities: Record<string, number>): [string, number][] {
  return Object.entries(probabilities).sort((a, b) => b[1] - a[1])
}

function Prediction() {
  const currentExperimentId = useCurrentExperimentStore((state) => state.currentExperimentId)

  const evaluationQuery = useQuery({
    queryKey: ['evaluation', currentExperimentId],
    queryFn: () => fetchEvaluation(currentExperimentId!),
    enabled: !!currentExperimentId,
    retry: false,
  })

  const rows = useMemo(() => evaluationQuery.data?.rows ?? [], [evaluationQuery.data])
  const bestRow = useMemo(() => pickBestRow(rows), [rows])

  const [selectedCombo, setSelectedCombo] = useState<string | null>(null)
  const effectiveCombo = selectedCombo ?? (bestRow ? comboKey(bestRow) : null)
  const selectedRow = rows.find((row) => comboKey(row) === effectiveCombo) ?? null

  const [sortKey, setSortKey] = useState<SortKey>('Weighted Average')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortedRows = useMemo(() => {
    function valueFor(row: EvaluationRow): string | number | undefined {
      if (sortKey === 'testRatio') return row.testRatio
      if (sortKey === 'model') return row.model
      if (sortKey === 'scaler') return row.scaler
      return row.metrics[sortKey]
    }

    return [...rows].sort((a, b) => {
      const av = valueFor(a)
      const bv = valueFor(b)
      if (av === undefined || bv === undefined) return 0
      if (typeof av === 'string' || typeof bv === 'string') {
        const cmp = String(av).localeCompare(String(bv))
        return sortDir === 'asc' ? cmp : -cmp
      }
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [rows, sortKey, sortDir])

  const [result, setResult] = useState<PredictionResult | null>(null)

  const predictMutation = useMutation({
    mutationFn: () =>
      runPrediction(currentExperimentId!, {
        testRatio: selectedRow!.testRatio,
        model: selectedRow!.model,
        scaler: selectedRow!.scaler,
      }),
    onSuccess: setResult,
  })

  if (!currentExperimentId) {
    return (
      <StagePage
        icon={Target}
        title="Prediction"
        description="Run inference on a random sample using the experiment's trained model."
      >
        <p className="text-sm text-muted-foreground">
          No experiment selected. Create or continue one from{' '}
          <Link to="/experiments" className="text-primary underline-offset-4 hover:underline">
            Experiments
          </Link>{' '}
          first.
        </p>
      </StagePage>
    )
  }

  if (evaluationQuery.isLoading) {
    return (
      <StagePage
        icon={Target}
        title="Prediction"
        description="Run inference on a random sample using the experiment's trained model."
      >
        <p className="text-sm text-muted-foreground">Loading trained models…</p>
      </StagePage>
    )
  }

  if (evaluationQuery.isError || rows.length === 0) {
    return (
      <StagePage
        icon={Target}
        title="Prediction"
        description="Run inference on a random sample using the experiment's trained model."
      >
        <p className="text-sm text-muted-foreground">
          No trained models yet. Run a training sweep from{' '}
          <Link to="/training" className="text-primary underline-offset-4 hover:underline">
            Training
          </Link>{' '}
          first.
        </p>
      </StagePage>
    )
  }

  const isCorrect = result ? result.trueClass === result.predictedClass : null

  return (
    <StagePage
      icon={Target}
      title="Prediction"
      description="Pick a trained model/scaler combination, then classify a random sample."
    >
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">
            Trained combinations ({rows.length}) — click a row to select
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  label="Test Ratio"
                  active={sortKey === 'testRatio'}
                  dir={sortDir}
                  onClick={() => toggleSort('testRatio')}
                />
                <SortableTableHead
                  label="Model"
                  active={sortKey === 'model'}
                  dir={sortDir}
                  onClick={() => toggleSort('model')}
                />
                <SortableTableHead
                  label="Scaler"
                  active={sortKey === 'scaler'}
                  dir={sortDir}
                  onClick={() => toggleSort('scaler')}
                />
                <SortableTableHead
                  label="Weighted Average"
                  active={sortKey === 'Weighted Average'}
                  dir={sortDir}
                  onClick={() => toggleSort('Weighted Average')}
                  className="text-right"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((row) => {
                const key = comboKey(row)
                return (
                  <TableRow
                    key={key}
                    onClick={() => setSelectedCombo(key)}
                    aria-selected={key === effectiveCombo}
                    className={cn('cursor-pointer', key === effectiveCombo && 'bg-muted/60')}
                  >
                    <TableCell>{row.testRatio}</TableCell>
                    <TableCell>{row.model}</TableCell>
                    <TableCell>{row.scaler}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMetric(row.metrics['Weighted Average'])}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-medium">
              {selectedRow
                ? `Selected: ${selectedRow.model} · ${selectedRow.scaler} · test ${selectedRow.testRatio}`
                : 'No combination selected'}
            </h3>
            <Button
              onClick={() => predictMutation.mutate()}
              disabled={!selectedRow || predictMutation.isPending}
            >
              {predictMutation.isPending ? 'Predicting…' : 'Predict random sample'}
            </Button>
          </div>

          {predictMutation.isError && (
            <p className="text-sm font-medium text-destructive">
              {(predictMutation.error as Error).message}
            </p>
          )}

          {result && (
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex w-full max-w-xs shrink-0 flex-col gap-2">
                {result.imagePath ? (
                  <img
                    src={datasetImageUrl(result.datasetId, result.imagePath)}
                    alt={result.file ?? 'Sample image'}
                    className="w-full rounded-md border object-contain"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No image available for this sample.</p>
                )}
                {result.file && (
                  <p className="truncate text-xs text-muted-foreground">{result.file}</p>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Actual:</span>
                  <Badge variant="outline">{result.trueClass}</Badge>
                  <span className="text-muted-foreground">Predicted:</span>
                  <Badge variant={isCorrect ? 'default' : 'destructive'}>
                    {result.predictedClass}
                  </Badge>
                </div>

                {result.probabilities && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Class probabilities
                    </p>
                    {sortedProbabilities(result.probabilities).map(([className, prob]) => (
                      <div key={className} className="flex items-center gap-2">
                        <span className="w-24 shrink-0 truncate text-xs">{className}</span>
                        <Progress value={prob * 100} className="h-2" />
                        <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                          {(prob * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </StagePage>
  )
}
