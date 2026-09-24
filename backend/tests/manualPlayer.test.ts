import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest'
import request from 'supertest'
import { connect, disconnect, cleanDB, seedTeams, buildApp, createUser, createPlayer } from './helpers.js'
import { PlayerStatus, UserRole } from '../src/models/enums.js'
import { Player } from '../src/models/Player.js'

let app: ReturnType<typeof buildApp>

beforeAll(async () => {
  await connect()
  app = buildApp()
})

afterAll(async () => {
  await disconnect()
})

beforeEach(async () => {
  await cleanDB()
})

afterEach(async () => {
  await cleanDB()
})

async function adminToken() {
  await createUser(UserRole.ADMIN, 'admin@test.com', 'Passw0rd!')
  const login = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'Passw0rd!' })
  return login.body.data.token as string
}

const VALID_PLAYER = {
  name: 'MS Dhoni',
  role: 'Wicketkeeper',
  nationality: 'India',
  matches: 258,
  runs: 5082,
  battingAverage: 39.7,
  strikeRate: 137.5,
  wickets: 0,
  economy: 8.1,
  ranking: 3,
  basePrice: 1,
}

describe('Manual player entry — POST /api/players (admin only)', () => {
  it('creates a valid player with stats, status Available, correct isOverseas and importOrder', async () => {
    const existing = await createPlayer({ ranking: 2, importOrder: 5 })
    expect(existing).toBeTruthy()
    const token = await adminToken()

    const res = await request(app)
      .post('/api/players')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_PLAYER, name: 'Rohit Sharma', ranking: 8, basePrice: 0.8 })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    const saved = await Player.findById(res.body.data._id)
    expect(saved!.name).toBe('Rohit Sharma')
    expect(saved!.role).toBe('Wicketkeeper')
    expect(saved!.nationality).toBe('India')
    expect(saved!.isOverseas).toBe(false)
    expect(saved!.matches).toBe(258)
    expect(saved!.runs).toBe(5082)
    expect(saved!.battingAverage).toBe(39.7)
    expect(saved!.strikeRate).toBe(137.5)
    expect(saved!.economy).toBe(8.1)
    expect(saved!.ranking).toBe(8)
    expect(saved!.basePrice).toBe(0.8)
    expect(saved!.status).toBe(PlayerStatus.AVAILABLE)
    // Appended after the highest existing importOrder.
    expect(saved!.importOrder).toBe(6)
    expect(saved!.unsoldCount).toBe(0)
    expect(saved!.queueOrder).toBeNull()
  })

  it('marks overseas players from nationality', async () => {
    const token = await adminToken()
    const res = await request(app)
      .post('/api/players')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_PLAYER, name: 'Trent Boult', role: 'Bowler', nationality: 'New Zealand', ranking: 9, basePrice: 0.8 })
    expect(res.status).toBe(201)
    expect(res.body.data.isOverseas).toBe(true)
  })

  it('rejects a duplicate name case-insensitively', async () => {
    await createPlayer({ name: 'Virat Kohli', ranking: 10 })
    const token = await adminToken()

    const res = await request(app)
      .post('/api/players')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_PLAYER, name: 'VIRAT KOHLI', role: 'Batsman', ranking: 11 })

    expect(res.status).toBe(409)
    expect(res.body.message).toBe('Player already exists.')
  })

  it('rejects a duplicate IPL ranking', async () => {
    await createPlayer({ name: 'Rohit Sharma', ranking: 4 })
    const token = await adminToken()

    const res = await request(app)
      .post('/api/players')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_PLAYER, name: 'New Player', ranking: 4 })

    expect(res.status).toBe(409)
    expect(res.body.message).toBe('IPL Ranking already assigned to another player.')
  })

  it.each([
    ['ranking below 1', { ranking: 0 }],
    ['ranking above 110', { ranking: 111 }],
    ['non-integer ranking', { ranking: 2.5 }],
    ['negative base price', { basePrice: -1 }],
    ['non-tier base price', { basePrice: 0.5 }],
    ['negative matches', { matches: -1 }],
    ['negative runs', { runs: -2 }],
    ['negative economy', { economy: -1 }],
    ['blank name', { name: '   ' }],
    ['invalid role', { role: 'Batter' }],
  ])('rejects %s', async (_label, overrides) => {
    const token = await adminToken()
    const res = await request(app)
      .post('/api/players')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_PLAYER, ...overrides })
    expect(res.status).toBe(400)
  })

  it('accepts blank or "-" economy as null', async () => {
    const token = await adminToken()
    const cases = [
      { economy: '', name: 'Economy Blank', ranking: 21 },
      { economy: '-', name: 'Economy Dash', ranking: 22 },
    ]
    for (const c of cases) {
      const res = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...VALID_PLAYER, name: c.name, ranking: c.ranking, economy: c.economy })
      expect(res.status).toBe(201)
      expect(res.body.data.economy).toBeNull()
    }
  })

  it('trims whitespace from name and nationality', async () => {
    const token = await adminToken()
    const res = await request(app)
      .post('/api/players')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_PLAYER, name: '  Jasprit Bumrah  ', nationality: '  India  ', ranking: 22 })
    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('Jasprit Bumrah')
    expect(res.body.data.nationality).toBe('India')
  })

  it('blocks conductors from creating players', async () => {
    await createUser(UserRole.CONDUCTOR, 'cond@test.com', 'Passw0rd!')
    const login = await request(app).post('/api/auth/login').send({ email: 'cond@test.com', password: 'Passw0rd!' })
    const token = login.body.data.token

    const res = await request(app).post('/api/players').set('Authorization', `Bearer ${token}`).send(VALID_PLAYER)
    expect(res.status).toBe(403)
  })

  it('requires authentication', async () => {
    const res = await request(app).post('/api/players').send(VALID_PLAYER)
    expect(res.status).toBe(401)
  })
})