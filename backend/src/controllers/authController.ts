import { User } from '../models/User.js'
import bcrypt from 'bcryptjs'
import { signToken } from '../utils/token.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { AppError } from '../utils/errors.js'

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user) throw new AppError('Invalid email or password', 401)
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) throw new AppError('Invalid email or password', 401)
  const token = signToken({ sub: String(user._id), email: user.email, role: user.role, name: user.name })
  res.json({
    success: true,
    data: {
      token,
      user: { id: String(user._id), name: user.name, email: user.email, role: user.role },
    },
  })
})

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user })
})
