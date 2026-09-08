import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { buildPublicSnapshot } from '../services/publicDataService.js'
import { listTeams } from '../controllers/teamController.js'

const router = Router()

// Public, read-only sanitized snapshot used to bootstrap the Live Auction page.
router.get('/live', asyncHandler(async (_req, res) => {
  const snapshot = await buildPublicSnapshot()
  res.json({ success: true, data: snapshot })
}))

// Public team list (no auth). Requires no sensitive data.
router.get('/teams', listTeams)

export default router
