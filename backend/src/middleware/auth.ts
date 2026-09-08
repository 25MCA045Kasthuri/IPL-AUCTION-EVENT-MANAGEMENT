import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import type { TokenPayload } from '../utils/token.js'
import { APP_ROLE } from '../models/enums.js'

declare module 'express-serve-static-core' {
  interface Request {
    user?: TokenPayload
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return next(Object.assign(new Error('Authentication required'), { statusCode: 401 }))
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret) as TokenPayload
    req.user = payload
    return next()
  } catch {
    return next(Object.assign(new Error('Invalid or expired token'), { statusCode: 401 }))
  }
}

export function requireRole(...roles: APP_ROLE[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(Object.assign(new Error('Authentication required'), { statusCode: 401 }))
    }
    if (!roles.includes(req.user.role)) {
      return next(Object.assign(new Error('Access denied'), { statusCode: 403 }))
    }
    return next()
  }
}
