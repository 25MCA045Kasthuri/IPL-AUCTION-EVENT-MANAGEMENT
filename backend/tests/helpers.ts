import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { createApp } from '../src/app.js'
import { Team } from '../src/models/Team.js'
import { Player } from '../src/models/Player.js'
import { User } from '../src/models/User.js'
import { UserRole, PlayerStatus, type APP_ROLE } from '../src/models/enums.js'

const TEST_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/ipl_auction_test'

export const TEAMS = [
  { name: 'Chennai Super Kings', shortName: 'CSK', order: 1 },
  { name: 'Mumbai Indians', shortName: 'MI', order: 2 },
  { name: 'Royal Challengers Bengaluru', shortName: 'RCB', order: 3 },
  { name: 'Kolkata Knight Riders', shortName: 'KKR', order: 4 },
  { name: 'Gujarat Titans', shortName: 'GT', order: 5 },
]

export async function connect() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_URI)
  }
}

export async function disconnect() {
  await mongoose.disconnect()
}

export async function cleanDB() {
  await Promise.all([
    Team.deleteMany({}),
    Player.deleteMany({}),
    User.deleteMany({}),
    mongoose.model('AuctionTransaction').deleteMany({}),
    mongoose.model('Settings').deleteMany({}),
    mongoose.model('Result').deleteMany({}),
  ])
}

export async function seedTeams() {
  for (const t of TEAMS) {
    await Team.create({ ...t, initialPurse: 90, remainingPurse: 90, playerCount: 0 })
  }
}

export async function createUser(role: APP_ROLE = UserRole.ADMIN, email = 'admin@test.com', password = 'Passw0rd!') {
  const passwordHash = await bcrypt.hash(password, 4)
  return User.create({ name: 'Test ' + role, email, role, passwordHash })
}

export function buildApp() {
  return createApp()
}

export async function createPlayer(overrides: Partial<Record<string, unknown>> = {}) {
  return Player.create({
    name: 'Test Player',
    role: 'Batsman',
    nationality: 'India',
    isOverseas: false,
    ranking: 50,
    basePrice: 0.2,
    status: PlayerStatus.AVAILABLE,
    ...overrides,
  })
}

export async function getTeamByShort(shortName: string) {
  return Team.findOne({ shortName })
}
