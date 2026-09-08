import { Player, PlayerType } from '../models/Player.js'
import { Team, TeamType } from '../models/Team.js'
import { PlayerRole, PlayerStatus } from '../models/enums.js'
import { config } from '../config/index.js'

export interface SquadComposition {
  total: number
  batsmen: number
  bowlers: number
  allRounders: number
  wicketkeepers: number
  overseas: number
  domestic: number
}

export const EMPTY_COMPOSITION: SquadComposition = {
  total: 0,
  batsmen: 0,
  bowlers: 0,
  allRounders: 0,
  wicketkeepers: 0,
  overseas: 0,
  domestic: 0,
}

export function computeComposition(players: Pick<PlayerType, 'role' | 'isOverseas'>[]): SquadComposition {
  const comp: SquadComposition = { ...EMPTY_COMPOSITION }
  for (const p of players) {
    comp.total += 1
    if (p.role === PlayerRole.BATSMAN) comp.batsmen += 1
    else if (p.role === PlayerRole.BOWLER) comp.bowlers += 1
    else if (p.role === PlayerRole.ALL_ROUNDER) comp.allRounders += 1
    else if (p.role === PlayerRole.WICKETKEEPER) comp.wicketkeepers += 1
    if (p.isOverseas) comp.overseas += 1
    else comp.domestic += 1
  }
  return comp
}

// Build a team summary with its purchased players, guarded against stale denormalized
// counts by deriving composition directly from the player documents.
export interface TeamSummary {
  team: TeamType
  players: PlayerType[]
  composition: SquadComposition
  spent: number
}

export async function getTeamSummaries(teamId?: string): Promise<TeamSummary[]> {
  const teams = teamId
    ? await Team.find({ _id: teamId }).sort({ order: 1 })
    : await Team.find().sort({ order: 1 })

  return Promise.all(
    teams.map(async (team) => {
      const players =
        teamId != null
          ? await Player.find({ teamId, status: PlayerStatus.SOLD }).sort({ role: 1, name: 1 })
          : await Player.find({ teamId: team._id, status: PlayerStatus.SOLD }).sort({ role: 1, name: 1 })
      const spent = players.reduce((sum, p) => sum + (p.soldPrice ?? 0), 0)
      return { team, players, composition: computeComposition(players), spent }
    }),
  )
}

export function getMinRequirements() {
  return {
    total: 16,
    maxTotal: config.maxSquadPlayers,
    batsmen: 4,
    bowlers: 4,
    allRounders: 2,
    wicketkeepers: 2,
    overseas: 4,
  }
}
