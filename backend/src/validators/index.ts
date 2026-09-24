import { z } from 'zod'
import { PLAYER_ROLES } from '../models/enums.js'

export const playerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  role: z.enum(PLAYER_ROLES as [string, ...string[]], { message: 'Invalid role' }),
  nationality: z.string().trim().min(1, 'Nationality is required').default('India'),
  ranking: z.coerce.number().int().positive('IPL Ranking must be a positive whole number'),
  basePrice: z.coerce.number().min(0).default(0),
})

const BASE_PRICE_TIERS = [0.2, 0.4, 0.6, 0.8, 1] as const

export const manualPlayerSchema = z.object({
  name: z.string().trim().min(1, 'Player name is required'),
  role: z.enum(PLAYER_ROLES as [string, ...string[]], { message: 'Invalid role' }),
  nationality: z.string().trim().min(1, 'Nationality is required').default('India'),
  matches: z.coerce.number().int('Matches must be a whole number').min(0, 'Matches cannot be negative').default(0),
  runs: z.coerce.number().int('Runs must be a whole number').min(0, 'Runs cannot be negative').default(0),
  battingAverage: z.coerce.number().min(0, 'Batting Average cannot be negative').default(0),
  strikeRate: z.coerce.number().min(0, 'Strike Rate cannot be negative').default(0),
  wickets: z.coerce.number().int('Wickets must be a whole number').min(0, 'Wickets cannot be negative').default(0),
  economy: z.preprocess(
    (v) => {
      if (v === '' || v === '-' || v === null || v === undefined) return null
      return v
    },
    z.union([z.null(), z.coerce.number().min(0, 'Economy cannot be negative')]),
  ),
  ranking: z.coerce.number().int('IPL Ranking must be a whole number').min(1, 'IPL Ranking must be at least 1').max(110, 'IPL Ranking cannot exceed 110'),
  basePrice: z.coerce.number().refine((v) => (BASE_PRICE_TIERS as readonly number[]).includes(v), { message: 'Invalid base price' }),
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

const RANK_ERR = 'Invalid rank filter value.'

export const rankFilterSchema = z
  .object({
    rankFrom: z.coerce
      .number({ message: RANK_ERR })
      .int(RANK_ERR)
      .min(1, RANK_ERR)
      .optional(),
    rankTo: z.coerce
      .number({ message: RANK_ERR })
      .int(RANK_ERR)
      .min(1, RANK_ERR)
      .optional(),
  })
  .refine((v) => v.rankFrom === undefined || v.rankTo === undefined || v.rankFrom <= v.rankTo, {
    message: 'Rank From cannot be greater than Rank To.',
    path: ['rankFrom'],
  })
