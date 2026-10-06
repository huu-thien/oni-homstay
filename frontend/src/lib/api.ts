export type ApiSuccessResponse<T> = {
  success: true
  data: T
  message: string
}

type ApiErrorResponse = {
  success?: false
  message?: string | string[]
  errors?: Record<string, string[]>
}

export class ApiError extends Error {
  details?: Record<string, string[]>

  constructor(message: string, details?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiError'
    this.details = details
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiSuccessResponse<T>> {
  const isFormData = init?.body instanceof FormData
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers ?? {}),
    },
  })

  const raw = (await response.json()) as ApiSuccessResponse<T> | ApiErrorResponse

  if (!response.ok || !('success' in raw) || !raw.success) {
    const errorPayload = raw as ApiErrorResponse
    const message = Array.isArray(errorPayload.message) ? errorPayload.message.join('; ') : errorPayload.message
    throw new ApiError(message || 'Có lỗi xảy ra khi gọi API.', errorPayload.errors)
  }

  return raw
}
