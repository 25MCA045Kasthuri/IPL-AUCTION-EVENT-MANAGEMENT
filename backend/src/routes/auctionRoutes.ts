import { Router } from 'express'
import { sellPlayer, undoSale, editSale, markUnsold, reauction, reauctionAll } from '../controllers/auctionController.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { UserRole } from '../models/enums.js'

const router = Router()

// Only ADMIN manages the auction. (Conductor cannot modify sales.)
router.use(authenticate, requireRole(UserRole.ADMIN))

router.post('/sell', sellPlayer)
router.post('/undo', undoSale)
router.post('/edit', editSale)
router.post('/unsold', markUnsold)
router.post('/reauction', reauction)
router.post('/reauction-all', reauctionAll)

export default router
