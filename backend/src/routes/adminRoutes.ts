import { Router } from 'express'
import { exportData, resetAuction } from '../controllers/adminController.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { UserRole } from '../models/enums.js'

const router = Router()

router.use(authenticate, requireRole(UserRole.ADMIN))
router.get('/export', exportData)
router.post('/reset', resetAuction)

export default router
