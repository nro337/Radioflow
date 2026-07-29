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
