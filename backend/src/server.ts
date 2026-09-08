import http from 'http'
import { createApp } from './app.js'
import { connectDB, disconnectDB } from './config/db.js'
import { config } from './config/index.js'
import { initSocket } from './sockets/index.js'
import { startHeartbeat } from './sockets/events.js'
import { Team } from './models/Team.js'

const TEAMS = [
  { name: 'Chennai Super Kings', shortName: 'CSK', order: 1 },
  { name: 'Mumbai Indians', shortName: 'MI', order: 2 },
  { name: 'Royal Challengers Bengaluru', shortName: 'RCB', order: 3 },
  { name: 'Kolkata Knight Riders', shortName: 'KKR', order: 4 },
  { name: 'Gujarat Titans', shortName: 'GT', order: 5 },
]

async function ensureTeams() {
  for (const t of TEAMS) {
    const existing = await Team.findOne({ shortName: t.shortName })
    if (!existing) {
      await Team.create({ ...t, initialPurse: 90, remainingPurse: 90, playerCount: 0 })
    }
  }
}

async function main() {
  await connectDB()
  console.log('[DB] connected to MongoDB')

  await ensureTeams()
  console.log('[DB] teams ensured')

  const app = createApp()
  const server = http.createServer(app)
  initSocket(server)
  startHeartbeat()

  server.listen(config.port, () => {
    console.log(`[API] backend running on http://localhost:${config.port}`)
    console.log(`[API] client origin: ${config.clientUrl}`)
  })

  const shutdown = async () => {
    console.log('\n[API] shutting down...')
    server.close(async () => {
      await disconnectDB()
      process.exit(0)
    })
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('[API] fatal startup error:', err)
  process.exit(1)
})
