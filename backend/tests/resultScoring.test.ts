import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest'
import { connect, disconnect, cleanDB, seedTeams, getTeamByShort } from './helpers.js'
import { Player } from '../src/models/Player.js'
import { PlayerStatus, PlayerRole } from '../src/models/enums.js'
import { computeTeamScores, getLatestResults } from '../src/services/resultService.js'

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

// ---- Exact sample-data verification (unit test on the pure scoring function) ----
// Expected approximate weighted result from the project spec:
//   MI:  Player 70.00  Purse 15.00  Final 85.00
//   KKR: Player 52.30  Purse 30.00  Final 82.30
//   CSK: Player 47.79  Purse 27.50  Final 75.29
//   RCB: Player 37.25  Purse 22.50  Final 59.75
// Expected order: 1st MI, 2nd KKR, 3rd CSK, 4th RCB
describe('computeTeamScores with the sample averages/purses', () => {
  const SAMPLES = [
    { name: 'MI', averageRank: 38.72, remainingPurse: 0.6 },
    { name: 'KKR', averageRank: 51.82, remainingPurse: 1.2 },
    { name: 'CSK', averageRank: 56.71, remainingPurse: 1.1 },
    { name: 'RCB', averageRank: 72.76, remainingPurse: 0.9 },
  ]

  it('awards the highest player score to the LOWEST average rank', () => {
    const scores = computeTeamScores(
      SAMPLES.map((s) => ({ averageRank: s.averageRank, remainingPurse: s.remainingPurse })),
      { ranking: 70, purse: 30 },
    )
    const byName = Object.fromEntries(SAMPLES.map((s, i) => [s.name, scores[i]]))

    // Player Ranking Score (rank 1 = best => lower average = higher score)
    expect(byName.MI.playerRankingScore).toBeCloseTo(70, 1)
    expect(byName.KKR.playerRankingScore).toBeCloseTo(52.3, 1)
    expect(byName.CSK.playerRankingScore).toBeCloseTo(47.79, 1)
    expect(byName.RCB.playerRankingScore).toBeCloseTo(37.25, 1)

    // Purse Score (higher remaining purse = higher score)
    expect(byName.MI.purseComponent).toBeCloseTo(15, 1)
    expect(byName.KKR.purseComponent).toBeCloseTo(30, 1)
    expect(byName.CSK.purseComponent).toBeCloseTo(27.5, 1)
    expect(byName.RCB.purseComponent).toBeCloseTo(22.5, 1)

    // Final Score
    expect(byName.MI.finalScore).toBeCloseTo(85, 1)
    expect(byName.KKR.finalScore).toBeCloseTo(82.3, 1)
    expect(byName.CSK.finalScore).toBeCloseTo(75.29, 1)
    expect(byName.RCB.finalScore).toBeCloseTo(59.75, 1)

    // Ordering: lower average rank wins => MI > KKR > CSK > RCB
    const sortedByScore = [...scores].sort((a, b) => b.rawFinalScore - a.rawFinalScore).map((s) => s.averageRank)
    expect(sortedByScore).toEqual([38.72, 51.82, 56.71, 72.76])
  })

  it('returns 0 scores instead of failing when averages are missing', () => {
    const scores = computeTeamScores(
      [
        { averageRank: null, remainingPurse: 0.5 },
        { averageRank: null, remainingPurse: 0.4 },
      ],
      { ranking: 70, purse: 30 },
    )
    expect(scores[0].playerRankingScore).toBe(0)
    expect(scores[0].purseComponent).toBeCloseTo(30, 1)
    expect(scores[1].playerRankingScore).toBe(0)
    expect(scores[1].purseComponent).toBeCloseTo(24, 1)
  })
})

// ---- Integration test: full leaderboard with a disqualified GT ----
type RoleSpec = { role: PlayerRole; overseas: boolean }

function eligibleSpec(): RoleSpec[] {
  return [
    ...Array.from({ length: 4 }, () => ({ role: PlayerRole.BATSMAN, overseas: false })),
    ...Array.from({ length: 4 }, () => ({ role: PlayerRole.BOWLER, overseas: false })),
    ...Array.from({ length: 2 }, () => ({ role: PlayerRole.ALL_ROUNDER, overseas: false })),
    ...Array.from({ length: 2 }, () => ({ role: PlayerRole.WICKETKEEPER, overseas: false })),
    ...Array.from({ length: 4 }, () => ({ role: PlayerRole.BOWLER, overseas: true })),
  ]
}

// Builds a squad whose ranking values sum to `rankingTotal`.
async function buildSquad(short: string, spec: RoleSpec[], rankingTotal: number) {
  const team = (await getTeamByShort(short))!
  const base = Math.floor(rankingTotal / spec.length)
  const remainder = rankingTotal % spec.length
  for (let i = 0; i < spec.length; i++) {
    await Player.create({
      name: `${short}-p${i}`,
      role: spec[i].role,
      nationality: spec[i].overseas ? 'Australia' : 'India',
      isOverseas: spec[i].overseas,
      ranking: base + (i < remainder ? 1 : 0),
      basePrice: 1,
      status: PlayerStatus.SOLD,
      teamId: team._id,
      soldPrice: 1,
    })
  }
  return team
}

async function buildEligibleSquad(short: string, rankingTotal: number) {
  return buildSquad(short, eligibleSpec(), rankingTotal)
}

async function setPurse(short: string, purse: number) {
  const team = (await getTeamByShort(short))!
  team.remainingPurse = purse
  await team.save()
}

describe('Corrected winner ranking (integration)', () => {
  it('ranks MI first, KKR second, CSK third, RCB fourth and disqualifies GT', async () => {
    // Averages: MI 38.75, KKR 51.75, CSK 56.75, RCB 72.75 (16 players each).
    await buildEligibleSquad('MI', 620) // 620/16 = 38.75
    await buildEligibleSquad('KKR', 828) // 828/16 = 51.75
    await buildEligibleSquad('CSK', 908) // 908/16 = 56.75
    await buildEligibleSquad('RCB', 1164) // 1164/16 = 72.75

    await setPurse('MI', 0.6)
    await setPurse('KKR', 1.2)
    await setPurse('CSK', 1.1)
    await setPurse('RCB', 0.9)

    // GT: disqualified (only 15 players - missing a striker slot, so total < 16 and overseas < 4).
    await buildSquad('GT', eligibleSpec().slice(0, 15), 999)

    const leaderboard = await getLatestResults()

    const positions: Record<string, number> = {}
    for (const e of leaderboard) positions[e.shortName] = e.position

    expect(positions.MI).toBe(1)
    expect(positions.KKR).toBe(2)
    expect(positions.CSK).toBe(3)
    expect(positions.RCB).toBe(4)
    expect(positions.GT).toBe(0)

    const mi = leaderboard.find((e) => e.shortName === 'MI')!
    const gt = leaderboard.find((e) => e.shortName === 'GT')!

    // MI is the best average rank => player score 70, purse 15, final 85.
    expect(mi.eligible).toBe(true)
    expect(mi.averageRank).toBeCloseTo(38.75, 1)
    expect(mi.playerRankingScore).toBeCloseTo(70, 1)
    expect(mi.purseComponent).toBeCloseTo(15, 1)
    expect(mi.finalScore).toBeCloseTo(85, 1)

    // GT must be disqualified, excluded from scoring, and not influence normalization.
    expect(gt.eligible).toBe(false)
    expect(gt.finalScore).toBe(0)
    expect(gt.position).toBe(0)
    expect(gt.playerRankingScore).toBe(0)
    expect(gt.reasons.some((r) => r.includes('Total players'))).toBe(true)
  })
})