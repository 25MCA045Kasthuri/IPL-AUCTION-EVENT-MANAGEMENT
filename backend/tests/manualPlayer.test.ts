import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest'
import request from 'supertest'
import { connect, disconnect, cleanDB, seedTeams, buildApp, createUser, createPlayer, getTeamByShort } from './helpers.js'
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
    ['ranking above 150', { ranking: 151 }],
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

describe('IPL ranking extended to 150 (TEST A/B/G)', () => {
  it('accepts a manual add with ranking 111 — within the extended 1-150 range', async () => {
    const token = await adminToken()

    const res = await request(app)
      .post('/api/players')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_PLAYER, name: 'Rank 111 Player', ranking: 111, basePrice: 0.4 })

    expect(res.status).toBe(201)
    expect(res.body.data.ranking).toBe(111)
    expect(res.body.data.status).toBe(PlayerStatus.AVAILABLE)
  })

  it('still rejects a duplicate ranking with the exact 409 message', async () => {
    await createPlayer({ name: 'Rohit Sharma', ranking: 4 })
    const token = await adminToken()

    const res = await request(app)
      .post('/api/players')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_PLAYER, name: 'New Player', ranking: 4 })

    expect(res.status).toBe(409)
    expect(res.body.message).toBe('IPL Ranking already assigned to another player.')
  })

  it('rejects ranking above 150 (e.g. 151)', async () => {
    const token = await adminToken()

    const res = await request(app)
      .post('/api/players')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_PLAYER, name: 'Rank 151 Player', ranking: 151 })

    expect(res.status).toBe(400)
    expect(res.body.errors.some((e: { message: string }) => e.message.includes('cannot exceed 150'))).toBe(true)
  })

  it('blocks the 151st player when 150 already exist with the exact message', async () => {
    const token = await adminToken()
    for (let i = 1; i <= 150; i++) {
      await createPlayer({ name: `Player ${i}`, ranking: i })
    }

    const res = await request(app)
      .post('/api/players')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_PLAYER, name: 'Player 151', ranking: 1 })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Maximum player limit of 150 reached.')
  })
})

describe('Player deletion — DELETE /api/players/:id (admin only)', () => {
  it('deletes an Available player; count decreases and ranking becomes reusable', async () => {
    await seedTeams()
    const victim = await createPlayer({ name: 'Delete Me', ranking: 57 })
    await createPlayer({ name: 'Another', ranking: 58 })
    const token = await adminToken()

    const del = await request(app)
      .delete(`/api/players/${victim._id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(del.status).toBe(200)
    expect(del.body.message).toBe('Player deleted')
    expect(await Player.findById(victim._id)).toBeNull()

    const add = await request(app)
      .post('/api/players')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_PLAYER, name: 'Replacement', ranking: 57 })

    expect(add.status).toBe(201)
    expect(await Player.countDocuments()).toBe(2)
  })

  it('accepts deleting an Unsold Queue player (queue shrinks)', async () => {
    const victim = await createPlayer({ name: 'Queued To Delete', ranking: 60 })
    const token = await adminToken()
    await markUnsoldPlayer(victim._id, token)

    const del = await request(app)
      .delete(`/api/players/${victim._id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(del.status).toBe(200)
    expect(await Player.findById(victim._id)).toBeNull()
    const queue = await request(app).get('/api/players/unsold-queue').set('Authorization', `Bearer ${token}`)
    expect(queue.body.total).toBe(0)
  })

  it('blocks deleting a SOLD player with the exact safety message', async () => {
    await seedTeams()
    const token = await adminToken()
    const player = await createPlayer({ name: 'Sold Lock', ranking: 61 })
    await request(app)
      .post('/api/auction/sell')
      .set('Authorization', `Bearer ${token}`)
      .send({ playerId: String(player._id), soldPrice: 5, teamShortName: 'CSK' })

    const res = await request(app)
      .delete(`/api/players/${player._id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(409)
    expect(res.body.message).toBe('This player is already sold. Reset/undo the player\'s sale before deleting.')
    expect(await Player.findById(player._id)).not.toBeNull()
  })

  it('returns 404 for a missing player', async () => {
    const token = await adminToken()
    const res = await request(app).delete('/api/players/000000000000000000000000').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('blocks conductors from deleting players', async () => {
    const victim = await createPlayer({ name: 'Conductor Cant Delete', ranking: 62 })
    await createUser(UserRole.CONDUCTOR, 'cond@test.com', 'Passw0rd!')
    const login = await request(app).post('/api/auth/login').send({ email: 'cond@test.com', password: 'Passw0rd!' })

    const res = await request(app)
      .delete(`/api/players/${victim._id}`)
      .set('Authorization', `Bearer ${login.body.data.token}`)

    expect(res.status).toBe(403)
    expect(await Player.findById(victim._id)).not.toBeNull()
  })
})

describe('Reset All Players — POST /api/admin/reset (TEST F)', () => {
  it('restores teams, players, and the queue to the initial auction state', async () => {
    await seedTeams()
    const token = await adminToken()

    const sold = await createPlayer({ name: 'Sold Reset Case', ranking: 63 })
    const queued = await createPlayer({ name: 'Queued Reset Case', ranking: 64 })
    await request(app).post('/api/auction/sell').set('Authorization', `Bearer ${token}`).send({ playerId: String(sold._id), soldPrice: 5, teamShortName: 'CSK' })
    await markUnsoldPlayer(queued._id, token)

    const beforeTeam = await getTeamByShort('CSK')
    expect(beforeTeam!.remainingPurse).toBe(85)
    expect(beforeTeam!.playerCount).toBe(1)

    const res = await request(app)
      .post('/api/admin/reset')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmation: 'RESET AUCTION' })

    expect(res.status).toBe(200)

    const reloadedSold = await Player.findById(sold._id).lean()
    const reloadedQueued = await Player.findById(queued._id).lean()
    expect(reloadedSold!.status).toBe(PlayerStatus.AVAILABLE)
    expect(reloadedSold!.soldPrice).toBeNull()
    expect(reloadedSold!.teamId).toBeNull()
    expect(reloadedQueued!.status).toBe(PlayerStatus.AVAILABLE)
    expect(reloadedQueued!.queueOrder).toBeNull()
    expect(reloadedQueued!.unsoldCount).toBe(0)

    const csk = await getTeamByShort('CSK')
    expect(csk!.remainingPurse).toBe(90)
    expect(csk!.playerCount).toBe(0)

    const queue = await request(app).get('/api/players/unsold-queue').set('Authorization', `Bearer ${token}`)
    expect(queue.body.total).toBe(0)
  })

  it('rejects reset without the exact confirmation', async () => {
    const token = await adminToken()
    const res = await request(app).post('/api/admin/reset').set('Authorization', `Bearer ${token}`).send({ confirmation: 'nope' })
    expect(res.status).toBe(400)
  })
})

async function markUnsoldPlayer(playerId: unknown, token: string) {
  await request(app)
    .post('/api/auction/unsold')
    .set('Authorization', `Bearer ${token}`)
    .send({ playerId: String(playerId) })
}