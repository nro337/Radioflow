import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { FlaskConical, Plus, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  createExperiment,
  deleteExperiment,
  fetchDatasets,
  fetchExperiments,
  type Experiment,
  type ExperimentStage,
} from '@/lib/api'
import { useCurrentExperimentStore } from '@/lib/current-experiment'

export const Route = createFileRoute('/experiments')({
  component: Experiments,
})

const formSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  datasetId: z.string().trim().min(1, 'Select a dataset'),
  description: z.string().trim().optional(),
})

type FormValues = z.infer<typeof formSchema>

const defaultValues: FormValues = { name: '', datasetId: '', description: '' }

const stageLabels: Record<ExperimentStage, string> = {
  created: 'Created',
  preprocessing: 'Preprocessing…',
  preprocessing_failed: 'Preprocessing failed',
  preprocessed: 'Preprocessed',
  training: 'Training…',
  training_failed: 'Training failed',
  trained: 'Trained',
}

const stageVariants: Record<ExperimentStage, 'secondary' | 'default' | 'destructive' | 'outline'> = {
  created: 'outline',
  preprocessing: 'secondary',
  preprocessing_failed: 'destructive',
  preprocessed: 'secondary',
  training: 'secondary',
  training_failed: 'destructive',
  trained: 'default',
}

function Experiments() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const currentExperimentId = useCurrentExperimentStore((state) => state.currentExperimentId)
  const setCurrentExperimentId = useCurrentExperimentStore(
    (state) => state.setCurrentExperimentId,
  )

  const experimentsQuery = useQuery({
    queryKey: ['experiments'],
    queryFn: fetchExperiments,
  })
  const datasetsQuery = useQuery({
    queryKey: ['datasets'],
    queryFn: fetchDatasets,
    enabled: showForm,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      createExperiment({
        name: values.name,
        datasetId: values.datasetId,
        description: values.description || undefined,
      }),
    onSuccess: (experiment) => {
      queryClient.invalidateQueries({ queryKey: ['experiments'] })
      setCurrentExperimentId(experiment.id)
      form.reset(defaultValues)
      setShowForm(false)
      navigate({ to: '/preprocessing' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (experimentId: string) => deleteExperiment(experimentId),
    onSuccess: (_data, experimentId) => {
      queryClient.invalidateQueries({ queryKey: ['experiments'] })
      if (currentExperimentId === experimentId) {
        setCurrentExperimentId(null)
      }
    },
  })

  const onSubmit = form.handleSubmit((values) => createMutation.mutate(values))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <div className="flex-1">
          <h2 className="font-heading text-lg font-semibold">Experiments</h2>
          <p className="text-sm text-muted-foreground">
            Define a problem and track it through the radiomics workflow.
          </p>
        </div>
        <Button
          type="button"
          className="ml-auto flex items-center"
          onClick={() => setShowForm((value) => !value)}
        >
          <Plus className="size-3.5" />
          New experiment
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">New experiment</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Radiomics experiment" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="What are you trying to classify?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {createMutation.isError && (
                  <p className="text-sm text-destructive">{createMutation.error.message}</p>
                )}
                <Separator />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating…' : 'Create experiment'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <FlaskConical className="size-4 text-muted-foreground" />
            All experiments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {experimentsQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading experiments…</p>
          )}
          {experimentsQuery.isError && (
            <p className="text-sm text-destructive">{experimentsQuery.error.message}</p>
          )}
          {experimentsQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No experiments yet.</p>
          )}
          <ul className="flex flex-col divide-y divide-border">
            {experimentsQuery.data?.map((experiment) => (
              <ExperimentRow
                key={experiment.id}
                experiment={experiment}
                isCurrent={experiment.id === currentExperimentId}
                onSelect={() => {
                  setCurrentExperimentId(experiment.id)
                  navigate({ to: '/preprocessing' })
                }}
                onDelete={() => deleteMutation.mutate(experiment.id)}
                isDeleting={deleteMutation.isPending && deleteMutation.variables === experiment.id}
              />
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

function ExperimentRow({
  experiment,
  isCurrent,
  onSelect,
  onDelete,
  isDeleting,
}: {
  experiment: Experiment
  isCurrent: boolean
  onSelect: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{experiment.name}</span>
          {isCurrent && <Badge variant="outline">Current</Badge>}
          <Badge variant={stageVariants[experiment.stage]}>
            {stageLabels[experiment.stage]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Dataset: {experiment.datasetId}
          {experiment.description ? ` — ${experiment.description}` : ''}
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onSelect}>
        Continue
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onDelete}
        disabled={isDeleting}
        aria-label={`Delete ${experiment.name}`}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </li>
  )
}
