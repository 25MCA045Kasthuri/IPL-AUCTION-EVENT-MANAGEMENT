import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest'
import request from 'supertest'
import { connect, disconnect, cleanDB, createPlayer, seedTeams, getTeamByShort, buildApp, createUser } from './helpers.js'
import { PlayerStatus, PLAYER_STATUSES, UserRole } from '../src/models/enums.js'
import { Player } from '../src/models/Player.js'
import { markUnsold, reauction, sellPlayer } from '../src/services/auctionService.js'
import { getPlayerCounts } from '../src/services/publicDataService.js'

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
  await seedTeams()
})

afterEach(async () => {
  await cleanDB()
})

describe('Player model — unsold queue wiring', () => {
  it('exposes the UNSOLD_QUEUE status value', () => {
    expect(PlayerStatus.UNSOLD_QUEUE).toBe('Unsold Queue')
    expect(PLAYER_STATUSES).toContain('Unsold Queue')
  })

  it('keeps legacy statuses intact (Available/Sold/Unsold)', () => {
    expect(PLAYER_STATUSES).toEqual(
      expect.arrayContaining(['Available', 'Sold', 'Unsold', 'Unsold Queue']),
    )
  })

  it('defaults unsoldCount to 0 and queueOrder to null on a fresh doc', async () => {
    const player = await createPlayer()
    expect(player.unsoldCount).toBe(0)
    expect(player.queueOrder).toBeNull()
  })

  it('accepts the legacy Unsold status value', async () => {
    const player = await createPlayer({ status: PlayerStatus.UNSOLD })
    expect(player.status).toBe('Unsold')
  })

  it('accepts the new Unsold Queue status and stores queue fields', async () => {
    const player = await createPlayer({
      name: 'Queue Player',
      status: PlayerStatus.UNSOLD_QUEUE,
      unsoldCount: 2,
      queueOrder: 5,
    })
    const reloaded = await Player.findById(player._id).lean()
    expect(reloaded!.status).toBe('Unsold Queue')
    expect(reloaded!.unsoldCount).toBe(2)
    expect(reloaded!.queueOrder).toBe(5)
  })
})

describe('Unsold Queue — FIFO behavior (TEST 1-4, 7, 8)', () => {
  it('TEST 1: first unsold marks the player UNSOLD_QUEUE with unsoldCount 1 and a queue position', async () => {
    const player = await createPlayer({ name: 'Player A' })
    expect(player.unsoldCount).toBe(0)

    await markUnsold({ playerId: String(player._id) })

    const reloaded = await Player.findById(player._id).lean()
    expect(reloaded!.status).toBe(PlayerStatus.UNSOLD_QUEUE)
    expect(reloaded!.unsoldCount).toBe(1)
    expect(reloaded!.queueOrder).toBe(1)
  })

  it('TEST 2: a second player is appended after the first (FIFO order)', async () => {
    const a = await createPlayer({ name: 'Player A' })
    const b = await createPlayer({ name: 'Player B' })

    await markUnsold({ playerId: String(a._id) })
    await markUnsold({ playerId: String(b._id) })

    const queue = await Player.find({ status: PlayerStatus.UNSOLD_QUEUE }).sort({ queueOrder: 1 }).lean()
    expect(queue.map((p) => p.name)).toEqual(['Player A', 'Player B'])
    expect(queue[0].queueOrder).toBe(1)
    expect(queue[1].queueOrder).toBe(2)
  })

  it('TEST 3: re-auction removes a player from the queue and preserves unsoldCount', async () => {
    const a = await createPlayer({ name: 'Player A' })
    const b = await createPlayer({ name: 'Player B' })
    await markUnsold({ playerId: String(a._id) })
    await markUnsold({ playerId: String(b._id) })

    await reauction({ playerId: String(a._id) })

    const queue = await Player.find({ status: PlayerStatus.UNSOLD_QUEUE }).sort({ queueOrder: 1 }).lean()
    expect(queue.map((p) => p.name)).toEqual(['Player B'])

    const reloadedA = await Player.findById(a._id).lean()
    expect(reloadedA!.status).toBe(PlayerStatus.AVAILABLE)
    expect(reloadedA!.unsoldCount).toBe(1)
    expect(reloadedA!.queueOrder).toBeNull()
  })

  it('TEST 4: an unsold-again player returns to the END of the queue with an incremented count', async () => {
    const a = await createPlayer({ name: 'Player A' })
    const b = await createPlayer({ name: 'Player B' })
    await markUnsold({ playerId: String(a._id) })
    await markUnsold({ playerId: String(b._id) })
    await reauction({ playerId: String(a._id) })

    await markUnsold({ playerId: String(a._id) })

    const queue = await Player.find({ status: PlayerStatus.UNSOLD_QUEUE }).sort({ queueOrder: 1 }).lean()
    expect(queue.map((p) => p.name)).toEqual(['Player B', 'Player A'])

    const reloadedA = await Player.findById(a._id).lean()
    expect(reloadedA!.unsoldCount).toBe(2)
    expect(reloadedA!.queueOrder).toBe(3)
  })

  it('TEST 7: rejects marking a SOLD player as unsold', async () => {
    const player = await createPlayer({ name: 'Sold Guy' })
    await sellPlayer({ playerId: String(player._id), soldPrice: 3, teamShortName: 'CSK' })

    await expect(markUnsold({ playerId: String(player._id) })).rejects.toThrow(/sold/i)

    const reloaded = await Player.findById(player._id).lean()
    expect(reloaded!.status).toBe(PlayerStatus.SOLD)
    expect(reloaded!.queueOrder).toBeNull()
  })

  it('TEST 8: double-click — a second markUnsold on a queued player is rejected without re-incrementing', async () => {
    const player = await createPlayer({ name: 'Player A' })
    await markUnsold({ playerId: String(player._id) })

    await expect(markUnsold({ playerId: String(player._id) })).rejects.toThrow(/already in the unsold queue/i)

    const reloaded = await Player.findById(player._id).lean()
    expect(reloaded!.unsoldCount).toBe(1)
    expect(reloaded!.queueOrder).toBe(1)
  })

  it('rejects re-auction of a player who is not in the queue', async () => {
    const player = await createPlayer({ name: 'Available Guy' })
    await expect(reauction({ playerId: String(player._id) })).rejects.toThrow(/not in the unsold queue/i)
    const reloaded = await Player.findById(player._id).lean()
    expect(reloaded!.status).toBe(PlayerStatus.AVAILABLE)
  })

  it('rejects re-auction of a SOLD player', async () => {
    const player = await createPlayer({ name: 'Sold Guy' })
    await sellPlayer({ playerId: String(player._id), soldPrice: 3, teamShortName: 'CSK' })
    await expect(reauction({ playerId: String(player._id) })).rejects.toThrow(/not in the unsold queue/i)
    const reloaded = await Player.findById(player._id).lean()
    expect(reloaded!.status).toBe(PlayerStatus.SOLD)
  })
})

async function adminToken() {
  await createUser(UserRole.ADMIN, 'admin@test.com', 'Passw0rd!')
  const login = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'Passw0rd!' })
  return login.body.data.token as string
}

describe('Unsold Queue + rank filter — API (TEST 5, 6, validation 400s)', () => {
  it('TEST 5: rankFrom=1&rankTo=20 returns only ranks 1-20 sorted ascending', async () => {
    const token = await adminToken()
    await createPlayer({ name: 'Best', ranking: 5 })
    await createPlayer({ name: 'Mid', ranking: 15 })
    await createPlayer({ name: 'Worst', ranking: 25 })
    await createPlayer({ name: 'Top', ranking: 1 })

    const res = await request(app)
      .get('/api/players')
      .query({ rankFrom: 1, rankTo: 20 })
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(3)
    expect(res.body.data.map((p: { name: string }) => p.name)).toEqual(['Top', 'Best', 'Mid'])
  })

  it('TEST 6: role=Bowler + rank 1-30 returns only bowlers in range', async () => {
    const token = await adminToken()
    await createPlayer({ name: 'B1', role: 'Bowler', ranking: 5 })
    await createPlayer({ name: 'B2', role: 'Bowler', ranking: 40 })
    await createPlayer({ name: 'Bat', role: 'Batsman', ranking: 10 })

    const res = await request(app)
      .get('/api/players')
      .query({ role: 'Bowler', rankFrom: 1, rankTo: 30 })
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(1)
    expect(res.body.data[0].name).toBe('B1')
  })

  it('returns all players when no rank params are present (existing behavior)', async () => {
    const token = await adminToken()
    await createPlayer({ name: 'A', ranking: 50 })
    await createPlayer({ name: 'B', ranking: 1 })

    const res = await request(app).get('/api/players').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(2)
  })

  it('rejects rankFrom=-1 with 400', async () => {
    const token = await adminToken()
    const res = await request(app)
      .get('/api/players')
      .query({ rankFrom: -1 })
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
  })

  it('rejects rankFrom=0 with 400', async () => {
    const token = await adminToken()
    const res = await request(app)
      .get('/api/players')
      .query({ rankFrom: 0 })
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
  })

  it('rejects rankFrom=abc with 400', async () => {
    const token = await adminToken()
    const res = await request(app)
      .get('/api/players')
      .query({ rankFrom: 'abc' })
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
  })

  it('rejects rankFrom=50&rankTo=10 with the exact message', async () => {
    const token = await adminToken()
    const res = await request(app)
      .get('/api/players')
      .query({ rankFrom: 50, rankTo: 10 })
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
    expect(JSON.stringify(res.body.errors)).toContain('Rank From cannot be greater than Rank To.')
  })

  it('GET /api/players/unsold-queue returns the queue ordered by queueOrder', async () => {
    const token = await adminToken()
    const b = await createPlayer({ name: 'Queue B' })
    const a = await createPlayer({ name: 'Queue A' })
    await markUnsold({ playerId: String(a._id) })
    await markUnsold({ playerId: String(b._id) })

    const res = await request(app).get('/api/players/unsold-queue').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(2)
    expect(res.body.data.map((p: { name: string }) => p.name)).toEqual(['Queue A', 'Queue B'])
  })

  it('POST /api/auction/reauction re-auctions a queued player', async () => {
    const token = await adminToken()
    const a = await createPlayer({ name: 'Queue A' })
    await markUnsold({ playerId: String(a._id) })

    const res = await request(app)
      .post('/api/auction/reauction')
      .set('Authorization', `Bearer ${token}`)
      .send({ playerId: String(a._id) })

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Player "Queue A" moved back to auction')
    const reloaded = await Player.findById(a._id).lean()
    expect(reloaded!.status).toBe(PlayerStatus.AVAILABLE)
  })

  it('rejects reauction for a player not in the queue (409)', async () => {
    const token = await adminToken()
    const p = await createPlayer({ name: 'Available Guy' })
    const res = await request(app)
      .post('/api/auction/reauction')
      .set('Authorization', `Bearer ${token}`)
      .send({ playerId: String(p._id) })
    expect(res.status).toBe(409)
  })

  it('rejects reauction for a conductor (403, admin-only)', async () => {
    await createUser(UserRole.CONDUCTOR, 'cond@test.com', 'Passw0rd!')
    const login = await request(app).post('/api/auth/login').send({ email: 'cond@test.com', password: 'Passw0rd!' })
    const token = login.body.data.token as string
    const a = await createPlayer({ name: 'Queue A' })
    await markUnsold({ playerId: String(a._id) })

    const res = await request(app)
      .post('/api/auction/reauction')
      .set('Authorization', `Bearer ${token}`)
      .send({ playerId: String(a._id) })
    expect(res.status).toBe(403)
  })
})

describe('Unsold Queue — counts + reset (T4)', () => {
  it('getPlayerCounts exposes unsoldQueue and counts queue players into unsold', async () => {
    const queued = await createPlayer({ name: 'Queued' })
    await createPlayer({ name: 'Legacy Unused', status: PlayerStatus.UNSOLD })

    await markUnsold({ playerId: String(queued._id) })

    const counts = await getPlayerCounts()
    expect(counts.unsoldQueue).toBe(1)
    expect(counts.unsold).toBe(2)
  })

  it('resetAuction clears queue fields and restores queued players to Available', async () => {
    const token = await adminToken()
    const queued = await createPlayer({ name: 'Queued' })
    await markUnsold({ playerId: String(queued._id) })

    const res = await request(app)
      .post('/api/admin/reset')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmation: 'RESET AUCTION' })

    expect(res.status).toBe(200)

    const reloaded = await Player.findById(queued._id).lean()
    expect(reloaded!.status).toBe(PlayerStatus.AVAILABLE)
    expect(reloaded!.queueOrder).toBeNull()
    expect(reloaded!.unsoldCount).toBe(0)

    const counts = await getPlayerCounts()
    expect(counts.unsoldQueue).toBe(0)
  })
})