import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'

export interface TokenPayload {
  sub: string
  email: string
  role: 'ADMIN' | 'CONDUCTOR'
  name: string
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '12h' })
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret) as TokenPayload
}
