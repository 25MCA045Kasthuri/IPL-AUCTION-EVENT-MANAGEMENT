import { Router } from 'express'
import { listPlayers, createPlayer, updatePlayer, deletePlayer, getPlayer } from '../controllers/playerController.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { UserRole } from '../models/enums.js'

const router = Router()

// Only admins can modify players; conductors can view the list.
router.use(authenticate)
router.get('/', listPlayers)
router.get('/:id', getPlayer)
router.post('/', requireRole(UserRole.ADMIN), createPlayer)
router.put('/:id', requireRole(UserRole.ADMIN), updatePlayer)
router.delete('/:id', requireRole(UserRole.ADMIN), deletePlayer)

export default router
