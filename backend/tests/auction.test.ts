import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest'
import {
  connect,
  disconnect,
  cleanDB,
  seedTeams,
  createPlayer,
  getTeamByShort,
} from './helpers.js'
import { sellPlayer, undoSale, editSale } from '../src/services/auctionService.js'

beforeAll(async () => {
  await connect()
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

describe('Auction business logic', () => {
  it('sells a player and deducts the correct purse', async () => {
    const player = await createPlayer({ name: 'Virat Kohli', ranking: 95 })
    await sellPlayer({ playerId: String(player._id), soldPrice: 7.5, teamShortName: 'CSK' })
    const csk = await getTeamByShort('CSK')
    expect(csk!.remainingPurse).toBe(90 - 7.5)
    expect(csk!.playerCount).toBe(1)
  })

  it('selling a ₹7.5 Cr player to a ₹90 Cr team leaves ₹82.5 Cr', async () => {
    const player = await createPlayer({ name: 'Virat Kohli' })
    await sellPlayer({ playerId: String(player._id), soldPrice: 7.5, teamShortName: 'CSK' })
    const csk = await getTeamByShort('CSK')
    expect(csk!.remainingPurse).toBe(82.5)
    expect(csk!.remainingPurse).toBeCloseTo(82.5, 5)
  })

  it('rejects selling the same player twice', async () => {
    const player = await createPlayer({ name: 'Virat Kohli' })
    await sellPlayer({ playerId: String(player._id), soldPrice: 7.5, teamShortName: 'CSK' })
    await expect(
      sellPlayer({ playerId: String(player._id), soldPrice: 5, teamShortName: 'MI' }),
    ).rejects.toThrow(/already sold/i)
    // CSK purse unchanged by the rejected second sale
    const csk = await getTeamByShort('CSK')
    expect(csk!.remainingPurse).toBe(82.5)
  })

  it('rejects a team spending more than its remaining purse', async () => {
    const player1 = await createPlayer({ name: 'P1' })
    const player2 = await createPlayer({ name: 'P2' })
    await sellPlayer({ playerId: String(player1._id), soldPrice: 90, teamShortName: 'MI' })
    const mi = await getTeamByShort('MI')
    expect(mi!.remainingPurse).toBe(0)
    await expect(
      sellPlayer({ playerId: String(player2._id), soldPrice: 5, teamShortName: 'MI' }),
    ).rejects.toThrow(/insufficient purse/i)
  })

  it('rejects a negative or zero sold price', async () => {
    const player = await createPlayer()
    await expect(
      sellPlayer({ playerId: String(player._id), soldPrice: -5, teamShortName: 'MI' }),
    ).rejects.toThrow(/greater than zero/i)
    await expect(
      sellPlayer({ playerId: String(player._id), soldPrice: 0, teamShortName: 'MI' }),
    ).rejects.toThrow(/greater than zero/i)
  })

  it('undoing a sale restores the purse', async () => {
    const player = await createPlayer({ name: 'Virat Kohli' })
    await sellPlayer({ playerId: String(player._id), soldPrice: 7.5, teamShortName: 'CSK' })
    await undoSale({ playerId: String(player._id) })
    const csk = await getTeamByShort('CSK')
    expect(csk!.remainingPurse).toBe(90)
    expect(csk!.playerCount).toBe(0)
  })

  it('moves a player between teams and updates both purses', async () => {
    const player = await createPlayer({ name: 'Virat Kohli' })
    await sellPlayer({ playerId: String(player._id), soldPrice: 10, teamShortName: 'CSK' })
    // Move CSK -> MI at a new price of 15
    await editSale({ playerId: String(player._id), soldPrice: 15, teamShortName: 'MI' })
    const csk = await getTeamByShort('CSK')
    const mi = await getTeamByShort('MI')
    // old team's purse restored, new team pays
    expect(csk!.remainingPurse).toBe(90)
    expect(mi!.remainingPurse).toBe(90 - 15)
    expect(csk!.playerCount).toBe(0)
    expect(mi!.playerCount).toBe(1)
  })

  it('editing the price on the same team applies the net change', async () => {
    const player = await createPlayer({ name: 'Virat Kohli' })
    await sellPlayer({ playerId: String(player._id), soldPrice: 10, teamShortName: 'CSK' })
    let csk = await getTeamByShort('CSK')
    expect(csk!.remainingPurse).toBe(80)
    // Change price 10 -> 15 on CSK
    await editSale({ playerId: String(player._id), soldPrice: 15, teamShortName: 'CSK' })
    csk = await getTeamByShort('CSK')
    expect(csk!.remainingPurse).toBe(75)
    expect(csk!.playerCount).toBe(1)
  })

  it('rejects a team exceeding 25 players', async () => {
    const players = []
    for (let i = 0; i < 25; i++) {
      const p = await createPlayer({ name: `P${i}` })
      players.push(p)
    }
    for (const p of players) {
      await sellPlayer({ playerId: String(p._id), soldPrice: 1, teamShortName: 'GT' })
    }
    const extra = await createPlayer({ name: 'Extra' })
    await expect(
      sellPlayer({ playerId: String(extra._id), soldPrice: 1, teamShortName: 'GT' }),
    ).rejects.toThrow(/25 players/)
  })

  it('rejects moving a player to a team already at 25 players', async () => {
    const players = []
    for (let i = 0; i < 25; i++) {
      const p = await createPlayer({ name: `P${i}` })
      players.push(p)
    }
    for (const p of players) {
      await sellPlayer({ playerId: String(p._id), soldPrice: 1, teamShortName: 'GT' })
    }
    const mover = await createPlayer({ name: 'Mover' })
    await sellPlayer({ playerId: String(mover._id), soldPrice: 1, teamShortName: 'CSK' })
    await expect(
      editSale({ playerId: String(mover._id), soldPrice: 1, teamShortName: 'GT' }),
    ).rejects.toThrow(/25 players/)
  })
})
