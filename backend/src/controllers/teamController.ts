import { Team } from '../models/Team.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { getTeamSummaries, getMinRequirements } from '../services/teamDataService.js'
import { Player, PlayerType } from '../models/Player.js'
import { PlayerStatus } from '../models/enums.js'

export const listTeams = asyncHandler(async (_req, res) => {
  const teams = await Team.find().sort({ order: 1 }).lean()
  res.json({ success: true, data: teams })
})

// Admin dashboard: team summaries with spent, remaining, composition & eligibility flag.
export const teamSummaries = asyncHandler(async (_req, res) => {
  const summaries = await getTeamSummaries()
  const req = getMinRequirements()
  const data = summaries.map(({ team, composition, spent }) => {
    const eligible =
      composition.total >= req.total &&
      composition.total <= req.maxTotal &&
      composition.batsmen >= req.batsmen &&
      composition.bowlers >= req.bowlers &&
      composition.allRounders >= req.allRounders &&
      composition.wicketkeepers >= req.wicketkeepers &&
      composition.overseas >= req.overseas &&
      team.remainingPurse >= 0

    const checks = [
      { label: 'Total Players', value: composition.total, min: req.total, max: req.maxTotal, pass: composition.total >= req.total && composition.total <= req.maxTotal },
      { label: 'Batsmen', value: composition.batsmen, min: req.batsmen, pass: composition.batsmen >= req.batsmen },
      { label: 'Bowlers', value: composition.bowlers, min: req.bowlers, pass: composition.bowlers >= req.bowlers },
      { label: 'All-Rounders', value: composition.allRounders, min: req.allRounders, pass: composition.allRounders >= req.allRounders },
      { label: 'Wicketkeepers', value: composition.wicketkeepers, min: req.wicketkeepers, pass: composition.wicketkeepers >= req.wicketkeepers },
      { label: 'Overseas', value: composition.overseas, min: req.overseas, pass: composition.overseas >= req.overseas },
      { label: 'Purse', value: team.remainingPurse, min: 0, pass: team.remainingPurse >= 0 },
    ]

    return {
      team,
      spent,
      remainingPurse: team.remainingPurse,
      composition,
      eligible,
      checks,
    }
  })
  res.json({ success: true, data })
})

// Squad validation display data for one team (or all).
export const squadValidation = asyncHandler(async (req, res) => {
  const teamId = req.params.teamId
  const players: PlayerType[] = teamId
    ? await Player.find({ teamId, status: PlayerStatus.SOLD })
    : await Player.find({ status: PlayerStatus.SOLD })

  const reqs = getMinRequirements()
  const result: Record<string, { value: number; min: number; max?: number; pass: boolean }> = {}
  const composition = players.reduce(
    (acc, p) => {
      acc.total += 1
      if (p.role === 'Batsman') acc.batsmen += 1
      else if (p.role === 'Bowler') acc.bowlers += 1
      else if (p.role === 'All-Rounder') acc.allRounders += 1
      else if (p.role === 'Wicketkeeper') acc.wicketkeepers += 1
      if (p.isOverseas) acc.overseas += 1
      return acc
    },
    { total: 0, batsmen: 0, bowlers: 0, allRounders: 0, wicketkeepers: 0, overseas: 0 },
  )

  result['Total Players'] = { value: composition.total, min: reqs.total, max: reqs.maxTotal, pass: composition.total >= reqs.total && composition.total <= reqs.maxTotal }
  result['Batsmen'] = { value: composition.batsmen, min: reqs.batsmen, pass: composition.batsmen >= reqs.batsmen }
  result['Bowlers'] = { value: composition.bowlers, min: reqs.bowlers, pass: composition.bowlers >= reqs.bowlers }
  result['All-Rounders'] = { value: composition.allRounders, min: reqs.allRounders, pass: composition.allRounders >= reqs.allRounders }
  result['Wicketkeepers'] = { value: composition.wicketkeepers, min: reqs.wicketkeepers, pass: composition.wicketkeepers >= reqs.wicketkeepers }
  result['Overseas'] = { value: composition.overseas, min: reqs.overseas, pass: composition.overseas >= reqs.overseas }

  res.json({ success: true, data: { teamId: teamId ?? null, composition, requirements: result } })
})
