import { createFileRoute, Link } from '@tanstack/react-router'
import { ClipboardCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { StagePage } from '@/components/stage-page'
import { ConfusionMatrixHeatmap } from '@/components/confusion-matrix-heatmap'
import { SortableTableHead, type SortDir } from '@/components/sortable-table-head'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  fetchConfusionMatrix,
  fetchEvaluation,
  type EvaluationRow,
} from '@/lib/api'
import { useCurrentExperimentStore } from '@/lib/current-experiment'

export const Route = createFileRoute('/evaluation')({
  component: Evaluation,
})

// Mirrors the aggregate metric keys CalculatePerformanceMetrics produces
// (per-class TP/FP/FN/TN/Weights arrays are dropped server-side).
const METRIC_COLUMNS = [
  'Macro Precision',
  'Macro Recall',
  'Macro F1',
  'Macro Accuracy',
  'Macro Specificity',
  'Macro Average',
  'Micro Precision',
  'Micro Recall',
  'Micro F1',
  'Micro Accuracy',
  'Micro Specificity',
  'Micro Average',
  'Weighted Precision',
  'Weighted Recall',
  'Weighted F1',
  'Weighted Accuracy',
  'Weighted Specificity',
  'Weighted Average',
]

// Per-class counts (comma-separated, one value per class label) rather than
// a single scalar, so they're sorted/displayed as text alongside the metrics.
const COUNT_COLUMNS = ['TP', 'FP', 'FN', 'TN']

type SortKey =
  | 'testRatio'
  | 'model'
  | 'scaler'
  | (typeof METRIC_COLUMNS)[number]
  | (typeof COUNT_COLUMNS)[number]

function comboKey(row: Pick<EvaluationRow, 'testRatio' | 'model' | 'scaler'>): string {
  return `${row.testRatio}|${row.model}|${row.scaler}`
}

function comboLabel(row: Pick<EvaluationRow, 'testRatio' | 'model' | 'scaler'>): string {
  return `${row.model} · ${row.scaler} · test ${row.testRatio}`
}

function pickBestRow(rows: EvaluationRow[]): EvaluationRow | null {
  if (rows.length === 0) return null
  return rows.reduce((best, row) => {
    const score = row.metrics['Weighted F1'] ?? row.metrics['Micro F1'] ?? -Infinity
    const bestScore = best.metrics['Weighted F1'] ?? best.metrics['Micro F1'] ?? -Infinity
    return score > bestScore ? row : best
  }, rows[0])
}

function formatMetric(value: number | undefined): string {
  return value === undefined ? '—' : value.toFixed(4)
}

function Evaluation() {
  const currentExperimentId = useCurrentExperimentStore((state) => state.currentExperimentId)

  const evaluationQuery = useQuery({
    queryKey: ['evaluation', currentExperimentId],
    queryFn: () => fetchEvaluation(currentExperimentId!),
    enabled: !!currentExperimentId,
    retry: false,
  })

  const rows = useMemo(() => evaluationQuery.data?.rows ?? [], [evaluationQuery.data])
  const bestRow = useMemo(() => pickBestRow(rows), [rows])

  // Explicit user selection wins; otherwise fall back to the best-scoring
  // combination, computed during render rather than seeded via an effect.
  const [selectedCombo, setSelectedCombo] = useState<string | null>(null)
  const effectiveCombo = selectedCombo ?? (bestRow ? comboKey(bestRow) : null)
  const selectedRow = rows.find((row) => comboKey(row) === effectiveCombo) ?? null

  const confusionMatrixQuery = useQuery({
    queryKey: ['confusion-matrix', currentExperimentId, effectiveCombo],
    queryFn: () =>
      fetchConfusionMatrix(
        currentExperimentId!,
        selectedRow!.testRatio,
        selectedRow!.model,
        selectedRow!.scaler,
      ),
    enabled: !!currentExperimentId && !!selectedRow,
  })

  const [sortKey, setSortKey] = useState<SortKey>('Weighted F1')
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
      if ((COUNT_COLUMNS as string[]).includes(sortKey)) return row.countMetrics[sortKey]
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

  if (!currentExperimentId) {
    return (
      <StagePage
        icon={ClipboardCheck}
        title="Evaluation"
        description="Review performance metrics for the experiment's trained model."
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
        icon={ClipboardCheck}
        title="Evaluation"
        description="Review performance metrics for the experiment's trained model."
      >
        <p className="text-sm text-muted-foreground">Loading evaluation results…</p>
      </StagePage>
    )
  }

  if (evaluationQuery.isError) {
    return (
      <StagePage
        icon={ClipboardCheck}
        title="Evaluation"
        description="Review performance metrics for the experiment's trained model."
      >
        <p className="text-sm text-muted-foreground">
          No training results yet. Run a training sweep from{' '}
          <Link to="/training" className="text-primary underline-offset-4 hover:underline">
            Training
          </Link>{' '}
          first.
        </p>
      </StagePage>
    )
  }

  const status = evaluationQuery.data?.status

  if (status === 'pending' || status === 'running') {
    return (
      <StagePage
        icon={ClipboardCheck}
        title="Evaluation"
        description="Review performance metrics for the experiment's trained model."
      >
        <p className="text-sm text-muted-foreground">
          Training is still in progress. Check back once it completes on the{' '}
          <Link to="/training" className="text-primary underline-offset-4 hover:underline">
            Training
          </Link>{' '}
          page.
        </p>
      </StagePage>
    )
  }

  if (status === 'failed') {
    return (
      <StagePage
        icon={ClipboardCheck}
        title="Evaluation"
        description="Review performance metrics for the experiment's trained model."
      >
        <p className="text-sm font-medium text-destructive">
          {evaluationQuery.data?.error ?? 'Training failed, so no evaluation results are available.'}
        </p>
      </StagePage>
    )
  }

  return (
    <StagePage
      icon={ClipboardCheck}
      title="Evaluation"
      description="Confusion matrices and performance metrics."
    >
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-medium">Confusion matrix</h3>
            <Select value={effectiveCombo ?? undefined} onValueChange={setSelectedCombo}>
              <SelectTrigger size="sm" className="min-w-64">
                <SelectValue placeholder="Select a model/scaler/test ratio" />
              </SelectTrigger>
              <SelectContent>
                {rows.map((row) => (
                  <SelectItem key={comboKey(row)} value={comboKey(row)}>
                    {comboLabel(row)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {confusionMatrixQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading confusion matrix…</p>
          )}
          {confusionMatrixQuery.data && (
            <ConfusionMatrixHeatmap data={confusionMatrixQuery.data} />
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">
            All results ({rows.length} combination{rows.length === 1 ? '' : 's'})
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
                {COUNT_COLUMNS.map((column) => (
                  <SortableTableHead
                    key={column}
                    label={`${column} (per class)`}
                    active={sortKey === column}
                    dir={sortDir}
                    onClick={() => toggleSort(column)}
                  />
                ))}
                {METRIC_COLUMNS.map((column) => (
                  <SortableTableHead
                    key={column}
                    label={column}
                    active={sortKey === column}
                    dir={sortDir}
                    onClick={() => toggleSort(column)}
                    className="text-right"
                  />
                ))}
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
                    {COUNT_COLUMNS.map((column) => (
                      <TableCell key={column} className="tabular-nums text-muted-foreground">
                        {row.countMetrics[column] ?? '—'}
                      </TableCell>
                    ))}
                    {METRIC_COLUMNS.map((column) => (
                      <TableCell key={column} className="text-right tabular-nums">
                        {formatMetric(row.metrics[column])}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </StagePage>
  )
}
