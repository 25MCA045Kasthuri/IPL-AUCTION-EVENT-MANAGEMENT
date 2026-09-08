import { Router } from 'express'
import { listTransactions } from '../controllers/transactionController.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { UserRole } from '../models/enums.js'

const router = Router()

router.use(authenticate, requireRole(UserRole.ADMIN))
router.get('/', listTransactions)

export default router
