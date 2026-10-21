// Forma de las respuestas del backend.
// Éxito: { data: ... }  |  Error: { error: { code, message, details? } }

export type ApiResponse<T> = {
  data: T
}

export type ApiErrorBody = {
  error: {
    code: string
    message: string
    details?: unknown
  }
}
