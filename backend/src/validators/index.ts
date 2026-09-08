import { z } from 'zod'
import { PLAYER_ROLES } from '../models/enums.js'

export const playerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  role: z.enum(PLAYER_ROLES as [string, ...string[]], { message: 'Invalid role' }),
  nationality: z.string().trim().min(1, 'Nationality is required').default('India'),
  ranking: z.coerce.number().int().positive('IPL Ranking must be a positive whole number'),
  basePrice: z.coerce.number().min(0).default(0),
})

export const sellSchema = z.object({
  playerId: z.string().min(1, 'playerId is required'),
  soldPrice: z.coerce.number().positive('Sold price must be greater than zero'),
  teamShortName: z.string().trim().min(1, 'Team is required'),
})

export const unsoldSchema = z.object({
  playerId: z.string().min(1, 'playerId is required'),
})

export const editSchema = z.object({
  playerId: z.string().min(1, 'playerId is required'),
  soldPrice: z.coerce.number().positive('Sold price must be greater than zero'),
  teamShortName: z.string().trim().min(1, 'Team is required'),
})

export const resetSchema = z.object({
  confirmation: z.literal('RESET AUCTION', { message: 'Type RESET AUCTION to confirm' }),
})

export const weightsSchema = z
  .object({
    rankingWeight: z.coerce.number().min(0).max(100),
    purseWeight: z.coerce.number().min(0).max(100),
  })
  .refine((v) => v.rankingWeight + v.purseWeight === 100, {
    message: 'Weights must total 100%',
    path: ['weights'],
  })

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
})
