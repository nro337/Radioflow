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

export function fetchPreprocessingStatus(experimentId: string): Promise<PreprocessingResult> {
  return fetchJson<PreprocessingResult>(
    `/experiments/${encodeURIComponent(experimentId)}/preprocessing`,
  )
}

export function applyFallbackPreprocessing(experimentId: string): Promise<PreprocessingResult> {
  return sendJson<PreprocessingResult>(
    `/experiments/${encodeURIComponent(experimentId)}/preprocessing/use-fallback`,
    'POST',
  )
}

export interface FallbackFeaturesPreview {
  path: string
  columns: string[]
  rows: string[][]
}

export function fetchFallbackFeaturesPreview(limit = 10): Promise<FallbackFeaturesPreview> {
  return fetchJson<FallbackFeaturesPreview>(`/preprocessing/fallback?limit=${limit}`)
}

export type ExperimentStage =
  | 'created'
  | 'preprocessing'
  | 'preprocessing_failed'
  | 'preprocessed'
  | 'training'
  | 'training_failed'
  | 'trained'

export interface Experiment {
  id: string
  name: string
  datasetId: string
  description: string | null
  createdAt: string
  stage: ExperimentStage
}

export interface ExperimentCreate {
  name: string
  datasetId: string
  description?: string
}

async function sendJson<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(detail || `Request to ${path} failed with status ${res.status}`)
  }
  return res.json() as Promise<T>
}

export function fetchExperiments(): Promise<Experiment[]> {
  return fetchJson<Experiment[]>('/experiments')
}

export function fetchExperiment(experimentId: string): Promise<Experiment> {
  return fetchJson<Experiment>(`/experiments/${encodeURIComponent(experimentId)}`)
}

export function createExperiment(payload: ExperimentCreate): Promise<Experiment> {
  return sendJson<Experiment>('/experiments', 'POST', payload)
}

export async function deleteExperiment(experimentId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/experiments/${encodeURIComponent(experimentId)}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(detail || `Request failed with status ${res.status}`)
  }
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

// Scaler/model names understood by the backend, mirroring `classification_core.scalers`/`models`.
export const AVAILABLE_SCALERS = [
  'Normalizer',
  'Standard',
  'MinMax',
  'Robust',
  'MaxAbs',
  'QT',
] as const

export const AVAILABLE_MODELS = [
  'MLP',
  'RF',
  'AB',
  'KNN',
  'DT',
  'ETs',
  'SGD',
  'SVC',
  'GNB',
  'LR',
  'GB',
  'Bagging',
  'XGB',
  'LGBM',
  'Voting',
  'Stacking',
] as const

export interface TrainingRequest {
  testRatios: number[]
  scalers: string[]
  models: string[]
  targetColumn: string
  dropFirstColumn: boolean
}

export type TrainingJobStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface TrainingResult {
  status: TrainingJobStatus
  processed: number
  total: number
  currentTask: string
  error: string | null
  resultsPath: string | null
}

export function runTraining(
  experimentId: string,
  payload: TrainingRequest,
): Promise<TrainingResult> {
  return sendJson<TrainingResult>(
    `/experiments/${encodeURIComponent(experimentId)}/train`,
    'POST',
    payload,
  )
}

export function fetchTrainingStatus(experimentId: string): Promise<TrainingResult> {
  return fetchJson<TrainingResult>(`/experiments/${encodeURIComponent(experimentId)}/train`)
}

export function subscribeToTrainingProgress(
  experimentId: string,
  onProgress: (result: TrainingResult) => void,
): () => void {
  const source = new EventSource(
    `${API_BASE_URL}/experiments/${encodeURIComponent(experimentId)}/train/stream`,
  )
  source.onmessage = (event) => {
    onProgress(JSON.parse(event.data) as TrainingResult)
  }
  source.onerror = () => {
    source.close()
  }
  return () => source.close()
}

export type EvaluationStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface EvaluationRow {
  testRatio: number
  model: string
  scaler: string
  metrics: Record<string, number>
  countMetrics: Record<string, string>
}

export interface EvaluationResult {
  status: EvaluationStatus
  rows: EvaluationRow[]
  error: string | null
}

export function fetchEvaluation(experimentId: string): Promise<EvaluationResult> {
  return fetchJson<EvaluationResult>(`/experiments/${encodeURIComponent(experimentId)}/evaluate`)
}

export interface ConfusionMatrix {
  labels: string[]
  matrix: number[][]
}

export interface PredictionRequest {
  testRatio: number
  model: string
  scaler: string
}

export interface PredictionResult {
  sampleIndex: number
  file: string | null
  trueClass: string
  predictedClass: string
  probabilities: Record<string, number> | null
  datasetId: string
  imagePath: string | null
}

export function runPrediction(
  experimentId: string,
  payload: PredictionRequest,
): Promise<PredictionResult> {
  return sendJson<PredictionResult>(
    `/experiments/${encodeURIComponent(experimentId)}/predict`,
    'POST',
    payload,
  )
}

export function fetchConfusionMatrix(
  experimentId: string,
  testRatio: number,
  model: string,
  scaler: string,
): Promise<ConfusionMatrix> {
  const params = new URLSearchParams({
    testRatio: String(testRatio),
    model,
    scaler,
  })
  return fetchJson<ConfusionMatrix>(
    `/experiments/${encodeURIComponent(experimentId)}/evaluate/confusion-matrix?${params.toString()}`,
  )
}
