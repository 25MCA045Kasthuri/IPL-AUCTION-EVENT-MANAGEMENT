import { Team } from '../models/Team.js'
import { Player, PlayerType } from '../models/Player.js'
import { Result } from '../models/Result.js'
import { Settings } from '../models/Settings.js'
import { PlayerStatus } from '../models/enums.js'
import { getMinRequirements } from './teamDataService.js'

export interface EligibilityResultMap {
  eligible: boolean
  reasons: string[]
}

export interface TeamEligibility {
  teamId: string
  teamName: string
  shortName: string
  eligible: boolean
  reasons: string[]
  totalPlayers: number
  remainingPurse: number
  spent: number
  composition: Record<string, number>
  rankingSum: number
  averageRank: number | null
  playerRankingScore: number
  rankingComponent: number
  purseComponent: number
  finalScore: number
  position: number
}

export function evaluateEligibility(composition: Record<string, number>, remainingPurse: number): { eligible: boolean; reasons: string[] } {
  const req = getMinRequirements()
  const reasons: string[] = []
  if (composition.total < req.total) reasons.push(`Total players ${composition.total}/${req.total}`)
  if (composition.total > req.maxTotal) reasons.push(`Total players exceed max ${req.maxTotal}`)
  if (composition.batsmen < req.batsmen) reasons.push(`Batsmen ${composition.batsmen}/${req.batsmen}`)
  if (composition.bowlers < req.bowlers) reasons.push(`Bowlers ${composition.bowlers}/${req.bowlers}`)
  if (composition.allRounders < req.allRounders) reasons.push(`All-Rounders ${composition.allRounders}/${req.allRounders}`)
  if (composition.wicketkeepers < req.wicketkeepers) reasons.push(`Wicketkeepers ${composition.wicketkeepers}/${req.wicketkeepers}`)
  if (composition.overseas < req.overseas) reasons.push(`Overseas ${composition.overseas}/${req.overseas}`)
  if (remainingPurse < 0) reasons.push('Remaining purse is negative')
  return { eligible: reasons.length === 0, reasons }
}

async function getSettings() {
  let settings = await Settings.findOne({ key: 'scoring' })
  const weights = settings
    ? { ranking: settings.rankingWeight, purse: settings.purseWeight }
    : (await import('../config/index.js')).config.weights
  if (!settings) {
    settings = await Settings.create({ key: 'scoring', rankingWeight: weights.ranking, purseWeight: weights.purse })
  }
  return { settings, weights }
}

// ===== Corrected winner-ranking logic =====
// IMPORTANT: rank 1 is the BEST player. A LOWER average player rank therefore means a
// STRONGER squad. All scoring must reward ELIGIBLE teams with the LOWEST average rank.
//
//   Player Score = (Best Eligible Average Rank / Team Average Rank) × rankingWeight
//   Purse Score  = (Team Remaining Purse / Highest Eligible Remaining Purse) × purseWeight
//   Final Score  = Player Score + Purse Score
//
// Eligible teams are sorted by Final Score in DESCENDING order (higher = better position).
// Disqualified teams are removed BEFORE computing "best average rank" / "highest purse".
const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100

async function tallyTeam(teamId: unknown): Promise<{
  players: PlayerType[]
  composition: Record<string, number>
  rankingSum: number
  rankedCount: number
  spent: number
  totalPlayers: number
}> {
  // Only SOLD players count towards the squad; unsold players are ignored.
  const players = await Player.find({ teamId, status: PlayerStatus.SOLD })
  const composition = { total: players.length, batsmen: 0, bowlers: 0, allRounders: 0, wicketkeepers: 0, overseas: 0 }
  let rankingSum = 0
  let rankedCount = 0
  let spent = 0
  for (const p of players) {
    if (p.role === 'Batsman') composition.batsmen += 1
    else if (p.role === 'Bowler') composition.bowlers += 1
    else if (p.role === 'All-Rounder') composition.allRounders += 1
    else if (p.role === 'Wicketkeeper') composition.wicketkeepers += 1
    if (p.isOverseas) composition.overseas += 1
    // Handle missing / invalid ranking values safely (only valid positive ranks count).
    if (typeof p.ranking === 'number' && Number.isFinite(p.ranking) && p.ranking > 0) {
      rankingSum += p.ranking
      rankedCount += 1
    }
    spent += p.soldPrice ?? 0
  }
  return { players, composition, rankingSum, rankedCount, spent, totalPlayers: players.length }
}

export interface ScoringTeamInput {
  averageRank: number | null
  remainingPurse: number
}

// Pure scoring shared by the leaderboard computation and by unit tests.
// Throws no errors: all division/NaN cases fall back to 0.
export function computeTeamScores(
  teams: ScoringTeamInput[],
  weights: { ranking: number; purse: number },
): Array<{
  averageRank: number | null
  playerRankingScore: number
  rankingComponent: number
  purseComponent: number
  finalScore: number
  rawFinalScore: number
}> {
  // Reference values computed from ELIGIBLE teams only (caller passes only eligible teams).
  const validRanks = teams
    .map((t) => t.averageRank)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0)
  // Lowest average rank = best squad.
  const bestAverageRank = validRanks.length > 0 ? Math.min(...validRanks) : null

  const validPurses = teams
    .map((t) => t.remainingPurse)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  const highestPurse = validPurses.length > 0 ? Math.max(...validPurses) : null

  return teams.map((t) => {
    let playerScore = 0
    if (
      bestAverageRank !== null &&
      t.averageRank !== null &&
      Number.isFinite(t.averageRank) &&
      t.averageRank > 0
    ) {
      // Lower team average → ratio > 1 → higher player score.
      playerScore = weights.ranking * (bestAverageRank / t.averageRank)
    }

    let purseScore = 0
    if (
      highestPurse !== null &&
      highestPurse > 0 &&
      typeof t.remainingPurse === 'number' &&
      Number.isFinite(t.remainingPurse) &&
      t.remainingPurse >= 0
    ) {
      // Higher remaining purse → higher purse score.
      purseScore = weights.purse * (t.remainingPurse / highestPurse)
    }

    const rawFinalScore = playerScore + purseScore
    return {
      averageRank: t.averageRank,
      playerRankingScore: round2(playerScore),
      rankingComponent: round2(playerScore),
      purseComponent: round2(purseScore),
      finalScore: round2(rawFinalScore),
      rawFinalScore,
    }
  })
}

function buildResult(weights: { ranking: number; purse: number }) {
  return async function calculate(): Promise<TeamEligibility[]> {
    const teams = await Team.find().sort({ order: 1 })
    const tallies = await Promise.all(teams.map((t) => tallyTeam(t._id)))

    // Evaluate eligibility for ALL teams first, before any scoring references are computed.
    const entries = await Promise.all(
      teams.map(async (team, i) => {
        const tally = tallies[i]
        const { eligible, reasons } = evaluateEligibility(tally.composition, team.remainingPurse)
        // Average player rank of the squad (based on SOLD players with a valid ranking).
        const averageRank = tally.rankedCount > 0 ? tally.rankingSum / tally.rankedCount : null
        return {
          team,
          tally,
          eligible,
          reasons,
          averageRank,
          remainingPurse: team.remainingPurse,
        }
      }),
    )

    // Disqualified teams are excluded BEFORE computing best average rank / highest purse.
    const eligibleEntries = entries.filter((e) => e.eligible)
    const scores = computeTeamScores(
      eligibleEntries.map((e) => ({ averageRank: e.averageRank, remainingPurse: e.remainingPurse })),
      weights,
    )

    // Pair each eligible entry with its raw score, then sort by final score DESCENDING.
    const sorted = eligibleEntries
      .map((entry, i) => ({ entry, score: scores[i] }))
      .sort((a, b) => b.score.rawFinalScore - a.score.rawFinalScore)

    const ranked: TeamEligibility[] = sorted.map(({ entry, score }, i) => ({
      teamId: String(entry.team._id),
      teamName: entry.team.name,
      shortName: entry.team.shortName,
      eligible: true,
      reasons: [],
      totalPlayers: entry.tally.totalPlayers,
      remainingPurse: entry.remainingPurse,
      spent: entry.tally.spent,
      composition: entry.tally.composition,
      rankingSum: entry.tally.rankingSum,
      averageRank: score.averageRank,
      playerRankingScore: score.playerRankingScore,
      rankingComponent: score.rankingComponent,
      purseComponent: score.purseComponent,
      finalScore: score.finalScore,
      position: i + 1,
    }))

    // Disqualified teams appended after eligible ones, not scored.
    const disqualified: TeamEligibility[] = entries
      .filter((e) => !e.eligible)
      .map((e) => ({
        teamId: String(e.team._id),
        teamName: e.team.name,
        shortName: e.team.shortName,
        eligible: false,
        reasons: e.reasons,
        totalPlayers: e.tally.totalPlayers,
        remainingPurse: e.team.remainingPurse,
        spent: e.tally.spent,
        composition: e.tally.composition,
        rankingSum: e.tally.rankingSum,
        averageRank: e.averageRank,
        playerRankingScore: 0,
        rankingComponent: 0,
        purseComponent: 0,
        finalScore: 0,
        position: 0,
      }))

    return [...ranked, ...disqualified]
  }
}

export async function calculateResults() {
  const { weights } = await getSettings()
  const calculate = buildResult(weights)
  const leaderboard = await calculate()

  const result = await Result.create({
    weights: { rankingWeight: weights.ranking, purseWeight: weights.purse },
    leaderboard: leaderboard.map((r) => ({
      teamId: r.teamId,
      teamName: r.teamName,
      shortName: r.shortName,
      eligible: r.eligible,
      disqualificationReasons: r.reasons,
      playerRankingScore: r.playerRankingScore,
      remainingPurse: r.remainingPurse,
      rankingComponent: r.rankingComponent,
      purseComponent: r.purseComponent,
      finalScore: r.finalScore,
      position: r.eligible ? r.position : 0,
      totalPlayers: r.totalPlayers,
      averageRank: r.averageRank,
    })),
  })

  const { emitPublic } = await import('../sockets/index.js')
  emitPublic('results:updated', { calculatedAt: result.calculationDate })

  return { result, leaderboard, weights }
}

export async function getLatestResults() {
  const calculate = buildResult(await getSettings().then((s) => s.weights))
  const leaderboard = await calculate()
  return leaderboard
}

export async function updateWeights(rankingWeight: number, purseWeight: number) {
  if (rankingWeight + purseWeight !== 100) {
    throw new Error('Weights must total 100%')
  }
  let settings = await Settings.findOne({ key: 'scoring' })
  if (!settings) settings = await Settings.create({ key: 'scoring' })
  settings.rankingWeight = rankingWeight
  settings.purseWeight = purseWeight
  await settings.save()
  return { rankingWeight, purseWeight }
}