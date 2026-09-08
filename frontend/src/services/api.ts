const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export class ApiError extends Error {
  status: number
  details?: unknown
  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

let authToken: string | null = localStorage.getItem('token')

export function setToken(token: string | null) {
  authToken = token
  if (token) localStorage.setItem('token', token)
  else localStorage.removeItem('token')
}

export function getToken() {
  return authToken
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(options.headers || {}),
      },
    })
  } catch {
    throw new ApiError('Network request failed. Is the backend running?', 0)
  }

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(body.message || 'Request failed', res.status, body)
  }
  return body as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data ?? {}) }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(data ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export async function uploadForm<T>(path: string, form: FormData): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      body: form,
    })
  } catch {
    throw new ApiError('Network request failed. Is the backend running?', 0)
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(body.message || 'Upload failed', res.status, body)
  return body as T
}

export { API_BASE }

export async function downloadFile(path: string, fallbackName = 'export.xlsx') {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    })
  } catch {
    throw new ApiError('Network request failed', 0)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body.message || 'Download failed', res.status)
  }
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="?([^"]+)"?/)
  const name = match ? match[1] : fallbackName
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
