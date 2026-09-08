import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest'
import { connect, disconnect, cleanDB, seedTeams, createPlayer, getTeamByShort } from './helpers.js'
import { Player } from '../src/models/Player.js'
import { PlayerStatus, PlayerRole } from '../src/models/enums.js'
import { evaluateEligibility } from '../src/services/resultService.js'
import { getLatestResults, updateWeights, calculateResults } from '../src/services/resultService.js'

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

const COMP = (o: Partial<Record<string, number>>) => ({
  total: 0,
  batsmen: 0,
  bowlers: 0,
  allRounders: 0,
  wicketkeepers: 0,
  overseas: 0,
  ...o,
})

describe('Squad eligibility', () => {
  it('marks a valid 16-player squad (4/4/2/2, 4 overseas) as eligible', () => {
    const comp = COMP({
      total: 16,
      batsmen: 4,
      bowlers: 4,
      allRounders: 2,
      wicketkeepers: 2,
      overseas: 4,
    })
    const { eligible, reasons } = evaluateEligibility(comp, 10)
    expect(eligible).toBe(true)
    expect(reasons).toEqual([])
  })

  it('squad with only 3 batsmen is not eligible', () => {
    const { eligible, reasons } = evaluateEligibility(
      COMP({ total: 16, batsmen: 3, bowlers: 4, allRounders: 2, wicketkeepers: 2, overseas: 4 }),
      10,
    )
    expect(eligible).toBe(false)
    expect(reasons.some((r) => r.includes('Batsmen'))).toBe(true)
  })

  it('squad with only 15 total players is not eligible', () => {
    const { eligible, reasons } = evaluateEligibility(
      COMP({ total: 15, batsmen: 4, bowlers: 4, allRounders: 2, wicketkeepers: 2, overseas: 4 }),
      10,
    )
    expect(eligible).toBe(false)
    expect(reasons.some((r) => r.includes('Total players'))).toBe(true)
  })

  it('a team with more than the minimum in a category is still eligible', () => {
    const { eligible } = evaluateEligibility(
      COMP({ total: 20, batsmen: 6, bowlers: 5, allRounders: 3, wicketkeepers: 2, overseas: 4 }),
      20,
    )
    expect(eligible).toBe(true)
  })
})

async function buildTeamSquad(short: string, spec: { role: PlayerRole; overseas: boolean }[]) {
  for (let i = 0; i < spec.length; i++) {
    const s = spec[i]
    const player = await Player.create({
      name: `${short}-${i}`,
      role: s.role,
      nationality: s.overseas ? 'Australia' : 'India',
      isOverseas: s.overseas,
      ranking: 60 + i,
      basePrice: 1,
      status: PlayerStatus.SOLD,
      teamId: (await getTeamByShort(short))!._id,
      soldPrice: 1 + i * 0.5,
    })
  }
}

describe('Results', () => {
  it('results exclude disqualified teams', async () => {
    // CSK eligible
    await buildTeamSquad('CSK', [
      ...Array.from({ length: 4 }, () => ({ role: PlayerRole.BATSMAN, overseas: false })),
      ...Array.from({ length: 4 }, () => ({ role: PlayerRole.BOWLER, overseas: false })),
      ...Array.from({ length: 2 }, () => ({ role: PlayerRole.ALL_ROUNDER, overseas: false })),
      ...Array.from({ length: 2 }, () => ({ role: PlayerRole.WICKETKEEPER, overseas: false })),
      ...Array.from({ length: 4 }, () => ({ role: PlayerRole.BOWLER, overseas: true })),
    ])
    // MI not eligible (only 3 batsmen)
    await buildTeamSquad('MI', [
      ...Array.from({ length: 3 }, () => ({ role: PlayerRole.BATSMAN, overseas: false })),
      ...Array.from({ length: 5 }, () => ({ role: PlayerRole.BOWLER, overseas: false })),
      ...Array.from({ length: 2 }, () => ({ role: PlayerRole.ALL_ROUNDER, overseas: false })),
      ...Array.from({ length: 2 }, () => ({ role: PlayerRole.WICKETKEEPER, overseas: false })),
      ...Array.from({ length: 4 }, () => ({ role: PlayerRole.BOWLER, overseas: true })),
    ])

    const leaderboard = await getLatestResults()
    const csk = leaderboard.find((e) => e.shortName === 'CSK')
    const mi = leaderboard.find((e) => e.shortName === 'MI')
    expect(csk!.eligible).toBe(true)
    expect(mi!.eligible).toBe(false)
    // First place must be an eligible team
    expect(leaderboard[0].eligible).toBe(true)
  })

  it('scoring weights must total 100%', async () => {
    await expect(updateWeights(70, 20)).rejects.toThrow(/100/i)
    await expect(updateWeights(50, 40)).rejects.toThrow(/100/i)
    await updateWeights(70, 30)
    const res = await calculateResults()
    expect(res.weights).toEqual({ ranking: 70, purse: 30 })
  })

  it('a disqualified team has zero final score and no position', async () => {
    await buildTeamSquad('MI', [
      ...Array.from({ length: 3 }, () => ({ role: PlayerRole.BATSMAN, overseas: false })),
      ...Array.from({ length: 5 }, () => ({ role: PlayerRole.BOWLER, overseas: false })),
      ...Array.from({ length: 2 }, () => ({ role: PlayerRole.ALL_ROUNDER, overseas: false })),
      ...Array.from({ length: 2 }, () => ({ role: PlayerRole.WICKETKEEPER, overseas: false })),
      ...Array.from({ length: 4 }, () => ({ role: PlayerRole.BOWLER, overseas: true })),
    ])
    const leaderboard = await getLatestResults()
    const mi = leaderboard.find((e) => e.shortName === 'MI')
    expect(mi!.finalScore).toBe(0)
    expect(mi!.position).toBe(0)
  })
})
