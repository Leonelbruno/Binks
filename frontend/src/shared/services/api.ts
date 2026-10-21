import type { ApiErrorBody, ApiResponse } from '../types/api'

const BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// Error que lanza el cliente cuando el backend responde con error
// o cuando no se puede conectar con él.
export class ApiError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

type RequestOptions = {
  body?: unknown
  signal?: AbortSignal
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function request<T>(
  method: string,
  path: string,
  { body, signal }: RequestOptions = {},
): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (error) {
    // Se cancela a propósito (AbortController): se deja pasar tal cual.
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor')
  }

  // 204 No Content: no hay body para leer.
  if (response.status === 204) {
    return undefined as T
  }

  const json = await readJson(response)

  if (!response.ok) {
    const apiError = (json as ApiErrorBody | null)?.error
    throw new ApiError(
      response.status,
      apiError?.code ?? 'UNKNOWN_ERROR',
      apiError?.message ?? 'Error inesperado del servidor',
      apiError?.details,
    )
  }

  return (json as ApiResponse<T>).data
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
}
