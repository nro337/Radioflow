const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'

export interface Dataset {
  id: string
  name: string
  image_count: number
}

export interface DatasetImage {
  path: string
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`)
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`)
  }
  return res.json() as Promise<T>
}

export function fetchDatasets(): Promise<Dataset[]> {
  return fetchJson<Dataset[]>('/datasets')
}

export function fetchDatasetImages(datasetId: string, limit = 60): Promise<DatasetImage[]> {
  return fetchJson<DatasetImage[]>(
    `/datasets/${encodeURIComponent(datasetId)}/images?limit=${limit}`,
  )
}

export function datasetImageUrl(datasetId: string, imagePath: string): string {
  return `${API_BASE_URL}/datasets/${encodeURIComponent(datasetId)}/images/${imagePath
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`
}

export interface PreprocessingExtractionParams {
  targetSize: [number, number]
  maxRegions: number
  isNorm: boolean
  ignoreZeros: boolean
  firstOrderFeatures: {
    turnOn: boolean
  }
  glcm: {
    turnOn: boolean
    isSymmetric: boolean
    d: number[]
    theta: number[]
  }
  glrlm: {
    turnOn: boolean
    theta: number[]
  }
  glszm: {
    turnOn: boolean
    connectivity: number[]
  }
}

export interface PreprocessingRequest {
  datasetId: string
  extractionParams: PreprocessingExtractionParams
}

export type PreprocessingStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface PreprocessingResult {
  status: PreprocessingStatus
  processed: number
  total: number
  currentFile: string
  error: string | null
  featuresPath: string | null
}

export async function runPreprocessing(
  experimentId: string,
  payload: PreprocessingRequest,
): Promise<PreprocessingResult> {
  const res = await fetch(
    `${API_BASE_URL}/experiments/${encodeURIComponent(experimentId)}/preprocessing`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(detail || `Request failed with status ${res.status}`)
  }
  return res.json() as Promise<PreprocessingResult>
}

export interface FallbackFeaturesPreview {
  path: string
  columns: string[]
  rows: string[][]
}

export function fetchFallbackFeaturesPreview(limit = 10): Promise<FallbackFeaturesPreview> {
  return fetchJson<FallbackFeaturesPreview>(`/preprocessing/fallback?limit=${limit}`)
}

export function subscribeToPreprocessingProgress(
  experimentId: string,
  onProgress: (result: PreprocessingResult) => void,
): () => void {
  const source = new EventSource(
    `${API_BASE_URL}/experiments/${encodeURIComponent(experimentId)}/preprocessing/stream`,
  )
  source.onmessage = (event) => {
    onProgress(JSON.parse(event.data) as PreprocessingResult)
  }
  source.onerror = () => {
    source.close()
  }
  return () => source.close()
}
