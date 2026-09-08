import { Router } from 'express'
import { getWeights, updateWeights } from '../controllers/settingsController.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { UserRole } from '../models/enums.js'

const router = Router()

router.use(authenticate)
router.get('/', getWeights)
router.put('/', requireRole(UserRole.ADMIN), updateWeights)

export default router
