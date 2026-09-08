import { Router } from 'express'
import { calculateResults, getResults } from '../controllers/resultController.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { UserRole } from '../models/enums.js'

const router = Router()

// Results are private: accessible to ADMIN and CONDUCTOR only.
router.use(authenticate, requireRole(UserRole.ADMIN, UserRole.CONDUCTOR))
router.get('/', getResults)
router.post('/calculate', calculateResults)

export default router
