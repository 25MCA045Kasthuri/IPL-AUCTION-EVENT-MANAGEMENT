import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import { config } from './config/index.js'
import authRoutes from './routes/authRoutes.js'
import playerRoutes from './routes/playerRoutes.js'
import teamRoutes from './routes/teamRoutes.js'
import auctionRoutes from './routes/auctionRoutes.js'
import importRoutes from './routes/importRoutes.js'
import resultRoutes from './routes/resultRoutes.js'
import settingsRoutes from './routes/settingsRoutes.js'
import transactionRoutes from './routes/transactionRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import publicRoutes from './routes/publicRoutes.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

export function createApp() {
  const app = express()
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const frontendDist = path.resolve(__dirname, '../../frontend/dist')

  app.use(
    cors({
      origin: config.clientUrl,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, status: 'ok', message: 'IPL Auction API is running' })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/public', publicRoutes)
  app.use('/api/players', playerRoutes)
  app.use('/api/teams', teamRoutes)
  app.use('/api/auction', auctionRoutes)
  app.use('/api/import', importRoutes)
  app.use('/api/results', resultRoutes)
  app.use('/api/settings', settingsRoutes)
  app.use('/api/transactions', transactionRoutes)
  app.use('/api/admin', adminRoutes)

  app.use(express.static(frontendDist))

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(frontendDist, 'index.html'))
  })

  app.use(notFound)
  app.use(errorHandler)

  return app
}
