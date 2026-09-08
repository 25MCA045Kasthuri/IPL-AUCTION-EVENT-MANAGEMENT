import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import mongoose from 'mongoose'

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ success: false, message: 'Route not found' })
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Log details without exposing secrets.
  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
    return res.status(400).json({ success: false, message: 'Validation failed', errors: issues })
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => e.message)
    return res.status(400).json({ success: false, message: errors.join('; ') })
  }

  const statusCode = (err as { statusCode?: number }).statusCode || 500
  const message = (err as Error).message || 'Internal server error'

  if (statusCode >= 500) {
    console.error('[ERROR]', err)
  }

  return res.status(statusCode).json({ success: false, message })
}
