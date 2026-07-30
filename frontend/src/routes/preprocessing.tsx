import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { SlidersHorizontal } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { StagePage } from '@/components/stage-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  fetchDatasets,
  fetchExperiment,
  fetchFallbackFeaturesPreview,
  runPreprocessing,
  subscribeToPreprocessingProgress,
  applyFallbackPreprocessing,
  type FallbackFeaturesPreview,
  type PreprocessingRequest,
  type PreprocessingResult,
} from '@/lib/api'
import { useCurrentExperimentStore } from '@/lib/current-experiment'

export const Route = createFileRoute('/preprocessing')({
  component: Preprocessing,
})

const numberPattern = /^-?\d+(\.\d+)?$/

function numberListField(label: string) {
  return z
    .string()
    .trim()
    .min(1, `Enter at least one ${label}`)
    .refine((value) => {
      const parts = value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
      return parts.length > 0 && parts.every((v) => numberPattern.test(v))
    }, `${label} must be a comma-separated list of numbers`)
}

function parseNumberList(value: string): number[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .map(Number)
}

function integerField(label: string, min = 1) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine(
      (value) => /^\d+$/.test(value) && Number(value) >= min,
      `${label} must be an integer of at least ${min}`,
    )
}

const formSchema = z
  .object({
    datasetId: z.string().trim().min(1, 'Select a dataset'),
    targetWidth: integerField('Target width'),
    targetHeight: integerField('Target height'),
    maxRegions: integerField('Max regions'),
    isNorm: z.boolean(),
    ignoreZeros: z.boolean(),
    firstOrderTurnOn: z.boolean(),
    glcmTurnOn: z.boolean(),
    glcmIsSymmetric: z.boolean(),
    glcmD: numberListField('GLCM distance'),
    glcmTheta: numberListField('GLCM angle'),
    glrlmTurnOn: z.boolean(),
    glrlmTheta: numberListField('GLRLM angle'),
    glszmTurnOn: z.boolean(),
    glszmConnectivity: numberListField('GLSZM connectivity'),
  })
  .refine(
    (data) => data.firstOrderTurnOn || data.glcmTurnOn || data.glrlmTurnOn || data.glszmTurnOn,
    {
      message: 'Enable at least one feature type to extract.',
      path: ['firstOrderTurnOn'],
    },
  )

type FormValues = z.infer<typeof formSchema>

const defaultValues: FormValues = {
  datasetId: '',
  targetWidth: '128',
  targetHeight: '128',
  maxRegions: '2',
  isNorm: true,
  ignoreZeros: true,
  firstOrderTurnOn: true,
  glcmTurnOn: true,
  glcmIsSymmetric: false,
  glcmD: '1, 2, 3',
  glcmTheta: '0, 45',
  glrlmTurnOn: true,
  glrlmTheta: '0',
  glszmTurnOn: true,
  glszmConnectivity: '4',
}

function toRequestPayload(values: FormValues): PreprocessingRequest {
  return {
    datasetId: values.datasetId,
    extractionParams: {
      targetSize: [Number(values.targetWidth), Number(values.targetHeight)],
      maxRegions: Number(values.maxRegions),
      isNorm: values.isNorm,
      ignoreZeros: values.ignoreZeros,
      firstOrderFeatures: { turnOn: values.firstOrderTurnOn },
      glcm: {
        turnOn: values.glcmTurnOn,
        isSymmetric: values.glcmIsSymmetric,
        d: parseNumberList(values.glcmD),
        theta: parseNumberList(values.glcmTheta),
      },
      glrlm: {
        turnOn: values.glrlmTurnOn,
        theta: parseNumberList(values.glrlmTheta),
      },
      glszm: {
        turnOn: values.glszmTurnOn,
        connectivity: parseNumberList(values.glszmConnectivity),
      },
    },
  }
}

function Preprocessing() {
  const navigate = useNavigate()
  const currentExperimentId = useCurrentExperimentStore((state) => state.currentExperimentId)
  const experimentQuery = useQuery({
    queryKey: ['experiment', currentExperimentId],
    queryFn: () => fetchExperiment(currentExperimentId!),
    enabled: !!currentExperimentId,
  })
  const datasetsQuery = useQuery({
    queryKey: ['datasets'],
    queryFn: fetchDatasets,
  })
  const [progress, setProgress] = useState<PreprocessingResult | null>(null)
  const unsubscribeRef = useRef<() => void>(() => {})
  const [showFallback, setShowFallback] = useState(false)
  const fallbackQuery = useQuery({
    queryKey: ['preprocessing-fallback'],
    queryFn: () => fetchFallbackFeaturesPreview(8),
    enabled: showFallback,
  })
  const fallbackAvailabilityQuery = useQuery({
    queryKey: ['preprocessing-fallback-availability'],
    queryFn: () => fetchFallbackFeaturesPreview(1),
    retry: false,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      runPreprocessing(currentExperimentId!, toRequestPayload(values)),
    onSuccess: (result) => {
      setProgress(result)
      unsubscribeRef.current()
      unsubscribeRef.current = subscribeToPreprocessingProgress(
        currentExperimentId!,
        setProgress,
      )
    },
  })

  const useFallbackMutation = useMutation({
    mutationFn: () => applyFallbackPreprocessing(currentExperimentId!),
    onSuccess: (result) => {
      setProgress(result)
      unsubscribeRef.current()
      navigate({ to: '/training' })
    },
  })

  useEffect(() => () => unsubscribeRef.current(), [])

  useEffect(() => {
    const datasetId = experimentQuery.data?.datasetId ?? datasetsQuery.data?.[0]?.id
    if (datasetId && !form.getValues('datasetId')) {
      form.setValue('datasetId', datasetId)
    }
  }, [datasetsQuery.data, experimentQuery.data, form])

  const onSubmit = form.handleSubmit((values) => {
    setProgress(null)
    mutation.mutate(values)
  })

  const glcmOn = form.watch('glcmTurnOn')
  const glrlmOn = form.watch('glrlmTurnOn')
  const glszmOn = form.watch('glszmTurnOn')
  const isRunning = progress?.status === 'pending' || progress?.status === 'running'
  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.processed / progress.total) * 100)
      : 0

  if (!currentExperimentId) {
    return (
      <StagePage
        icon={SlidersHorizontal}
        title="Preprocessing"
        description="Normalize radiomics features, run feature selection."
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

  return (
    <StagePage
      icon={SlidersHorizontal}
      title="Preprocessing"
      description="Normalize radiomics features, run feature selection."
    >
      <div className="flex items-center justify-between gap-2 pb-4">
        <div>
          {fallbackAvailabilityQuery.data && (
            <p className="text-xs text-muted-foreground">
              A completed features CSV is available locally: {fallbackAvailabilityQuery.data.path}
            </p>
          )}
          {useFallbackMutation.isError && (
            <p className="text-xs font-medium text-destructive">
              {useFallbackMutation.error.message}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {fallbackAvailabilityQuery.data && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={useFallbackMutation.isPending || isRunning}
              onClick={() => useFallbackMutation.mutate()}
            >
              {useFallbackMutation.isPending ? 'Linking…' : 'Use this CSV for training'}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowFallback((value) => !value)}
          >
            {showFallback ? 'Back to form' : 'View completed CSV'}
          </Button>
        </div>
      </div>

      {showFallback ? (
        <FallbackFeaturesTable
          isLoading={fallbackQuery.isLoading}
          isError={fallbackQuery.isError}
          error={fallbackQuery.error}
          data={fallbackQuery.data}
        />
      ) : (
        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-6">
            <FormField
              control={form.control}
              name="datasetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dataset</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a dataset" />
                      </SelectTrigger>
                      <SelectContent>
                        {datasetsQuery.data?.map((dataset) => (
                          <SelectItem key={dataset.id} value={dataset.id}>
                            {dataset.name} ({dataset.image_count} images)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Dataset containing the "images" and "masks" directories to extract from.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="targetWidth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target width</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetHeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target height</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxRegions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max regions</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="isNorm"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3">
                    <FormLabel>Normalize features</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ignoreZeros"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3">
                    <FormLabel>Ignore zero-valued pixels</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <FormField
              control={form.control}
              name="firstOrderTurnOn"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3">
                  <FormLabel>First order features</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator />

            <div className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="glcmTurnOn"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3">
                    <FormLabel>GLCM features</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 pl-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="glcmD"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distances</FormLabel>
                      <FormControl>
                        <Input placeholder="1, 2, 3" disabled={!glcmOn} {...field} />
                      </FormControl>
                      <FormDescription>Comma-separated pixel distances.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="glcmTheta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Angles (degrees)</FormLabel>
                      <FormControl>
                        <Input placeholder="0, 45" disabled={!glcmOn} {...field} />
                      </FormControl>
                      <FormDescription>Comma-separated angles.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="glcmIsSymmetric"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 pl-4">
                    <FormLabel>Symmetric co-occurrence matrix</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!glcmOn}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="glrlmTurnOn"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3">
                    <FormLabel>GLRLM features</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="glrlmTheta"
                render={({ field }) => (
                  <FormItem className="pl-4">
                    <FormLabel>Angles (degrees)</FormLabel>
                    <FormControl>
                      <Input placeholder="0" disabled={!glrlmOn} {...field} />
                    </FormControl>
                    <FormDescription>Comma-separated angles.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="glszmTurnOn"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3">
                    <FormLabel>GLSZM features</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="glszmConnectivity"
                render={({ field }) => (
                  <FormItem className="pl-4">
                    <FormLabel>Connectivity</FormLabel>
                    <FormControl>
                      <Input placeholder="4" disabled={!glszmOn} {...field} />
                    </FormControl>
                    <FormDescription>
                      Comma-separated connectivity values (4 or 8).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form.formState.errors.firstOrderTurnOn && (
              <p className="text-xs font-medium text-destructive">
                {form.formState.errors.firstOrderTurnOn.message}
              </p>
            )}

            {mutation.isError && (
              <p className="text-xs font-medium text-destructive">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : 'Failed to run preprocessing.'}
              </p>
            )}

            {progress && isRunning && (
              <div className="flex flex-col gap-2">
                <Progress value={progressPercent} />
                <p className="text-xs text-muted-foreground">
                  {progress.total > 0
                    ? `Processing ${progress.processed} / ${progress.total} — ${progress.currentFile}`
                    : 'Starting…'}
                </p>
              </div>
            )}

            {progress?.status === 'failed' && (
              <p className="text-xs font-medium text-destructive">
                {progress.error ?? 'Preprocessing failed.'}
              </p>
            )}

            {progress?.status === 'completed' && (
              <p className="text-xs font-medium text-primary">
                Preprocessing completed: {progress.featuresPath}
              </p>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={mutation.isPending || isRunning}>
                {mutation.isPending || isRunning ? 'Running…' : 'Run preprocessing'}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </StagePage>
  )
}

function FallbackFeaturesTable({
  isLoading,
  isError,
  error,
  data,
}: {
  isLoading: boolean
  isError: boolean
  error: unknown
  data: FallbackFeaturesPreview | undefined
}) {
  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading CSV preview…</p>
  }

  if (isError) {
    return (
      <p className="text-xs font-medium text-destructive">
        {error instanceof Error ? error.message : 'Failed to load the fallback CSV.'}
      </p>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">{data.path}</p>
      <div className="overflow-x-auto rounded-none border border-border">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-muted">
              {data.columns.map((column) => (
                <th
                  key={column}
                  className="whitespace-nowrap border-b border-border px-2 py-1.5 text-left font-medium"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="whitespace-nowrap border-b border-border px-2 py-1.5"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
