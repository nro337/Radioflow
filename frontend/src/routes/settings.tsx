import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Database, ImageOff, Settings as SettingsIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { datasetImageUrl, fetchDatasetImages, fetchDatasets } from '@/lib/api'

export const Route = createFileRoute('/settings')({
  component: Settings,
})

function Settings() {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null)

  const datasetsQuery = useQuery({
    queryKey: ['datasets'],
    queryFn: fetchDatasets,
  })

  useEffect(() => {
    if (!selectedDatasetId && datasetsQuery.data && datasetsQuery.data.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDatasetId(datasetsQuery.data[0].id)
    }
  }, [datasetsQuery.data, selectedDatasetId])

  const imagesQuery = useQuery({
    queryKey: ['dataset-images', selectedDatasetId],
    queryFn: () => fetchDatasetImages(selectedDatasetId!),
    enabled: !!selectedDatasetId,
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-lg font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Choose which dataset to run experiments on.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <SettingsIcon className="size-4 text-muted-foreground" />
            Dataset
          </CardTitle>
        </CardHeader>
        <CardContent>
          {datasetsQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading datasets…</p>
          )}
          {datasetsQuery.isError && (
            <p className="text-sm text-destructive">
              Couldn't load datasets. Confirm the backend is running and DATASET_PATH is set.
            </p>
          )}
          {datasetsQuery.data && datasetsQuery.data.length === 0 && (
            <p className="text-sm text-muted-foreground">No datasets available yet.</p>
          )}
          {datasetsQuery.data && datasetsQuery.data.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="dataset-select" className="text-xs font-medium text-muted-foreground">
                Dataset
              </label>
              <select
                id="dataset-select"
                className="h-9 w-full max-w-xs rounded-none border border-border bg-transparent px-3 text-sm outline-none focus-visible:border-primary sm:w-64"
                value={selectedDatasetId ?? ''}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
              >
                {datasetsQuery.data.map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.name} ({dataset.image_count} images)
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Database className="size-4 text-muted-foreground" />
            Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedDatasetId && (
            <p className="text-sm text-muted-foreground">Select a dataset to preview its images.</p>
          )}
          {selectedDatasetId && imagesQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading images…</p>
          )}
          {selectedDatasetId && imagesQuery.isError && (
            <p className="text-sm text-destructive">Couldn't load images for this dataset.</p>
          )}
          {selectedDatasetId && imagesQuery.data && imagesQuery.data.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageOff className="size-4" />
              No images found in this dataset.
            </div>
          )}
          {selectedDatasetId && imagesQuery.data && imagesQuery.data.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {imagesQuery.data.map((image) => (
                <div
                  key={image.path}
                  className="aspect-square overflow-hidden bg-muted ring-1 ring-foreground/10"
                >
                  <img
                    src={datasetImageUrl(selectedDatasetId, image.path)}
                    alt={image.path}
                    title={image.path}
                    className="size-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
