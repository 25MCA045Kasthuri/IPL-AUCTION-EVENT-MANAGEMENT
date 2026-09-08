import { Router } from 'express'
import { listTeams, teamSummaries, squadValidation } from '../controllers/teamController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)
router.get('/', listTeams)
router.get('/summaries', teamSummaries)
router.get('/squad-validation', squadValidation)

export default router
