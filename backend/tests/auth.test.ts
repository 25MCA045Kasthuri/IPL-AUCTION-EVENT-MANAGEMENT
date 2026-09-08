import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest'
import request from 'supertest'
import { connect, disconnect, cleanDB, buildApp, createUser } from './helpers.js'
import { UserRole } from '../src/models/enums.js'

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

describe('Authentication & access control', () => {
  it('public user cannot access the private Results API', async () => {
    const res = await request(app).get('/api/results')
    expect(res.status).toBe(401)
  })

  it('public user cannot access the Admin Players API', async () => {
    const res = await request(app).get('/api/players')
    expect(res.status).toBe(401)
  })

  it('public user CAN access the live auction snapshot', async () => {
    const res = await request(app).get('/api/public/live')
    expect(res.status).toBe(200)
  })

  it('logs in an admin and receives a token', async () => {
    await createUser(UserRole.ADMIN, 'admin@test.com', 'Passw0rd!')
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'Passw0rd!' })
    expect(res.status).toBe(200)
    expect(res.body.data.token).toBeTruthy()
    expect(res.body.data.user.role).toBe('ADMIN')
  })

  it('rejects a wrong password', async () => {
    await createUser(UserRole.ADMIN, 'admin@test.com', 'Passw0rd!')
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('a conductor cannot sell a player (admin-only action)', async () => {
    const conductor = await createUser(UserRole.CONDUCTOR, 'cond@test.com', 'Passw0rd!')
    const login = await request(app).post('/api/auth/login').send({ email: 'cond@test.com', password: 'Passw0rd!' })
    const token = login.body.data.token
    const res = await request(app)
      .post('/api/auction/sell')
      .set('Authorization', `Bearer ${token}`)
      .send({ playerId: '000000000000000000000000', soldPrice: 5, teamShortName: 'CSK' })
    expect(res.status).toBe(403)
  })

  it('an admin can access the players API', async () => {
    await createUser(UserRole.ADMIN, 'admin@test.com', 'Passw0rd!')
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'Passw0rd!' })
    const token = login.body.data.token
    const res = await request(app).get('/api/players').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })
})
