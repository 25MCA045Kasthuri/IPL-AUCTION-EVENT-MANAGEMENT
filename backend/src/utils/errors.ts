export class AppError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
  }
}

// Consistent successful API response shape.
export const ok = (data: unknown, message?: string) => ({ success: true, data, message })
