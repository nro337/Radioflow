import { createFileRoute, Link } from '@tanstack/react-router'
import { PlayCircle } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { StagePage } from '@/components/stage-page'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  AVAILABLE_MODELS,
  AVAILABLE_SCALERS,
  fetchPreprocessingStatus,
  fetchTrainingStatus,
  runTraining,
  subscribeToTrainingProgress,
  type TrainingRequest,
  type TrainingResult,
} from '@/lib/api'
import { useCurrentExperimentStore } from '@/lib/current-experiment'

export const Route = createFileRoute('/training')({
  component: Training,
})

const numberPattern = /^-?\d+(\.\d+)?$/

const testRatiosField = z
  .string()
  .trim()
  .min(1, 'Enter at least one test ratio')
  .refine((value) => {
    const parts = value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
    return parts.length > 0 && parts.every((v) => numberPattern.test(v))
  }, 'Test ratios must be a comma-separated list of numbers (e.g. 0.2, 0.3)')

function parseNumberList(value: string): number[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .map(Number)
}

const formSchema = z.object({
  testRatios: testRatiosField,
  scalers: z.array(z.string()).min(1, 'Select at least one scaler'),
  models: z.array(z.string()).min(1, 'Select at least one model'),
  targetColumn: z.string().trim().min(1, 'Target column is required'),
  dropFirstColumn: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

const defaultValues: FormValues = {
  testRatios: '0.2',
  scalers: ['Standard'],
  models: ['RF', 'DT', 'KNN'],
  targetColumn: 'Class',
  dropFirstColumn: true,
}

function toRequestPayload(values: FormValues): TrainingRequest {
  return {
    testRatios: parseNumberList(values.testRatios),
    scalers: values.scalers,
    models: values.models,
    targetColumn: values.targetColumn,
    dropFirstColumn: values.dropFirstColumn,
  }
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function Training() {
  const currentExperimentId = useCurrentExperimentStore((state) => state.currentExperimentId)

  const preprocessingQuery = useQuery({
    queryKey: ['preprocessing-status', currentExperimentId],
    queryFn: () => fetchPreprocessingStatus(currentExperimentId!),
    enabled: !!currentExperimentId,
    retry: false,
  })

  const initialStatusQuery = useQuery({
    queryKey: ['training-status', currentExperimentId],
    queryFn: () => fetchTrainingStatus(currentExperimentId!),
    enabled: !!currentExperimentId && preprocessingQuery.data?.status === 'completed',
    retry: false,
  })

  const [progress, setProgress] = useState<TrainingResult | null>(null)
  const unsubscribeRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (initialStatusQuery.data) {
      setProgress(initialStatusQuery.data)
      if (initialStatusQuery.data.status === 'running') {
        unsubscribeRef.current()
        unsubscribeRef.current = subscribeToTrainingProgress(currentExperimentId!, setProgress)
      }
    }
    // Only seed from the initial fetch once it resolves; live updates take over from there.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStatusQuery.data])

  useEffect(() => () => unsubscribeRef.current(), [])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      runTraining(currentExperimentId!, toRequestPayload(values)),
    onSuccess: (result) => {
      setProgress(result)
      unsubscribeRef.current()
      unsubscribeRef.current = subscribeToTrainingProgress(currentExperimentId!, setProgress)
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    setProgress(null)
    mutation.mutate(values)
  })

  const scalers = form.watch('scalers')
  const models = form.watch('models')
  const isRunning = progress?.status === 'pending' || progress?.status === 'running'
  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.processed / progress.total) * 100)
      : 0
  const combinationCount = (() => {
    const testRatios = parseNumberList(form.watch('testRatios') || '')
    return testRatios.length * scalers.length * models.length
  })()

  if (!currentExperimentId) {
    return (
      <StagePage
        icon={PlayCircle}
        title="Training"
        description="Kick off training and monitor progress for the experiment's model sweep."
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

  if (preprocessingQuery.isLoading) {
    return (
      <StagePage
        icon={PlayCircle}
        title="Training"
        description="Kick off training and monitor progress for the experiment's model sweep."
      >
        <p className="text-sm text-muted-foreground">Checking preprocessing status…</p>
      </StagePage>
    )
  }

  if (preprocessingQuery.data?.status !== 'completed') {
    return (
      <StagePage
        icon={PlayCircle}
        title="Training"
        description="Kick off training and monitor progress for the experiment's model sweep."
      >
        <p className="text-sm text-muted-foreground">
          Preprocessing must complete before training. Head to{' '}
          <Link to="/preprocessing" className="text-primary underline-offset-4 hover:underline">
            Preprocessing
          </Link>{' '}
          to extract features first.
        </p>
      </StagePage>
    )
  }

  return (
    <StagePage
      icon={PlayCircle}
      title="Training"
      description="Sweep classification models and scalers, then track live progress."
    >
      <Form {...form}>
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <FormField
            control={form.control}
            name="testRatios"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Test ratios</FormLabel>
                <FormControl>
                  <Input placeholder="0.2, 0.3" disabled={isRunning} {...field} />
                </FormControl>
                <FormDescription>Comma-separated train/test split ratios.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          <FormField
            control={form.control}
            name="scalers"
            render={() => (
              <FormItem>
                <FormLabel>Scalers</FormLabel>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {AVAILABLE_SCALERS.map((scaler) => (
                    <label key={scaler} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={scalers.includes(scaler)}
                        disabled={isRunning}
                        onCheckedChange={() =>
                          form.setValue('scalers', toggleValue(scalers, scaler), {
                            shouldValidate: true,
                          })
                        }
                      />
                      {scaler}
                    </label>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          <FormField
            control={form.control}
            name="models"
            render={() => (
              <FormItem>
                <FormLabel>Models</FormLabel>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {AVAILABLE_MODELS.map((model) => (
                    <label key={model} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={models.includes(model)}
                        disabled={isRunning}
                        onCheckedChange={() =>
                          form.setValue('models', toggleValue(models, model), {
                            shouldValidate: true,
                          })
                        }
                      />
                      {model}
                    </label>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="targetColumn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target column</FormLabel>
                  <FormControl>
                    <Input disabled={isRunning} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dropFirstColumn"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3">
                  <FormLabel>Drop first column (index/ID)</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isRunning}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {combinationCount} model/scaler/test-ratio combination
            {combinationCount === 1 ? '' : 's'} will be trained and evaluated.
          </p>

          {mutation.isError && (
            <p className="text-xs font-medium text-destructive">{mutation.error.message}</p>
          )}

          {progress && isRunning && (
            <div className="flex flex-col gap-2">
              <Progress value={progressPercent} />
              <p className="text-xs text-muted-foreground">
                {progress.total > 0
                  ? `Training ${progress.processed} / ${progress.total} — ${progress.currentTask}`
                  : 'Starting…'}
              </p>
            </div>
          )}

          {progress?.status === 'failed' && (
            <p className="text-xs font-medium text-destructive">
              {progress.error ?? 'Training failed.'}
            </p>
          )}

          {progress?.status === 'completed' && (
            <p className="text-xs font-medium text-primary">
              Training completed. Results saved to: {progress.resultsPath}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending || isRunning}>
              {mutation.isPending || isRunning ? 'Running…' : 'Start training'}
            </Button>
          </div>
        </form>
      </Form>
    </StagePage>
  )
}
