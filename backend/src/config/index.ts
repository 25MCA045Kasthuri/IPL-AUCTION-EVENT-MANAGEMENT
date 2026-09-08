import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Resolve the project root .env regardless of the working directory
// (works whether run from the repo root or from backend/).
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootEnvPath = path.resolve(__dirname, '../../../.env')
dotenv.config({ path: rootEnvPath })
dotenv.config()

const num = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && value !== '' && value !== undefined ? parsed : fallback
}

export const config = {
  port: num(process.env.PORT, 5000),
  mongodbUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  admin: {
    name: process.env.ADMIN_NAME || 'Event Admin',
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
  },
  conductor: {
    name: process.env.CONDUCTOR_NAME || 'Event Conductor',
    email: process.env.CONDUCTOR_EMAIL || 'conductor@example.com',
    password: process.env.CONDUCTOR_PASSWORD || 'Conductor@123',
  },
  weights: {
    ranking: num(process.env.RANKING_WEIGHT, 70),
    purse: num(process.env.PURSE_WEIGHT, 30),
  },
  maxSquadPlayers: 25,
  defaultPurse: 90,
}

export const isProduction = process.env.NODE_ENV === 'production'
