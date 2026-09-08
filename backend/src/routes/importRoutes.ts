import { Router } from 'express'
import multer from 'multer'
import { previewImport, confirmImport, importTemplate } from '../controllers/importController.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { UserRole } from '../models/enums.js'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      /\.(xlsx|xls)$/i.test(file.originalname)
    if (!ok) cb(new Error('Only .xlsx or .xls files are allowed'))
    else cb(null, true)
  },
})

router.use(authenticate, requireRole(UserRole.ADMIN))
router.post('/preview', upload.single('file'), previewImport)
router.post('/confirm', confirmImport)
router.get('/template', importTemplate)

export default router
