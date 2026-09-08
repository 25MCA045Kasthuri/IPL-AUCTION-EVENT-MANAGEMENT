import bcrypt from 'bcryptjs'
import { connectDB, disconnectDB } from '../config/db.js'
import { config } from '../config/index.js'
import { User } from '../models/User.js'
import { UserRole, type APP_ROLE } from '../models/enums.js'

async function upsertUser(email: string, name: string, password: string, role: APP_ROLE) {
  if (!password) {
    console.warn(`Skipping ${role} user "${email}": no password set in .env`)
    return
  }
  const passwordHash = await bcrypt.hash(password, 10)
  const existing = await User.findOne({ email: email.toLowerCase() })
  if (existing) {
    existing.name = name
    existing.role = role
    existing.passwordHash = passwordHash
    await existing.save()
    console.log(`Updated ${role} user: ${email}`)
  } else {
    await User.create({ email: email.toLowerCase(), name, role, passwordHash })
    console.log(`Created ${role} user: ${email}`)
  }
}

async function main() {
  await connectDB()
  console.log('[SEED] connected to MongoDB')

  await upsertUser(config.admin.email, config.admin.name, config.admin.password, UserRole.ADMIN)
  await upsertUser(config.conductor.email, config.conductor.name, config.conductor.password, UserRole.CONDUCTOR)

  await disconnectDB()
  console.log('[SEED] done')
}

main().catch((err) => {
  console.error('[SEED] error', err)
  process.exit(1)
})
