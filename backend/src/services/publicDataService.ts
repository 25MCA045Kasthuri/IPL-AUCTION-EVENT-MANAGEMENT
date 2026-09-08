import { Player } from '../models/Player.js'
import { PlayerRole, PlayerStatus } from '../models/enums.js'
import { getTeamSummaries, getMinRequirements } from './teamDataService.js'

const roleOrder: Record<string, number> = {
  [PlayerRole.BATSMAN]: 0,
  [PlayerRole.BOWLER]: 1,
  [PlayerRole.ALL_ROUNDER]: 2,
  [PlayerRole.WICKETKEEPER]: 3,
}

function roleSortRank(a: string, b: string) {
  return (roleOrder[a] ?? 9) - (roleOrder[b] ?? 9)
}

// Build a sanitized read-only snapshot for the public live page.
export interface PublicPlayer {
  id: string
  name: string
  role: string
  isOverseas: boolean
  ranking: number
  soldPrice: number
}

export interface PublicTeam {
  id: string
  name: string
  shortName: string
  initialPurse: number
  spent: number
  remainingPurse: number
  composition: { total: number; batsmen: number; bowlers: number; allRounders: number; wicketkeepers: number; overseas: number }
  players: PublicPlayer[]
}

export interface PublicSnapshot {
  teams: PublicTeam[]
  counts: { total: number; available: number; sold: number; unsold: number }
  rules: ReturnType<typeof getMinRequirements>
}

export async function buildPublicSnapshot(): Promise<PublicSnapshot> {
  const summaries = await getTeamSummaries()

  const teams: PublicTeam[] = summaries
    .map(({ team, players, composition, spent }) => ({
      id: String(team._id),
      name: team.name,
      shortName: team.shortName,
      initialPurse: team.initialPurse,
      spent,
      remainingPurse: team.remainingPurse,
      composition: {
        total: composition.total,
        batsmen: composition.batsmen,
        bowlers: composition.bowlers,
        allRounders: composition.allRounders,
        wicketkeepers: composition.wicketkeepers,
        overseas: composition.overseas,
      },
      players: players
        .slice()
        .sort((a, b) => {
          const byRole = roleSortRank(a.role, b.role)
          if (byRole !== 0) return byRole
          return a.name.localeCompare(b.name)
        })
        .map((p) => ({
          id: String(p._id),
          name: p.name,
          role: p.role,
          isOverseas: p.isOverseas,
          ranking: p.ranking,
          soldPrice: p.soldPrice ?? 0,
        })),
    }))
    .sort((a, b) => a.shortName.localeCompare(b.shortName))

  const counts = await getPlayerCounts()

  return { teams, counts, rules: getMinRequirements() }
}

export async function getPlayerCounts() {
  const [total, available, sold, unsold] = await Promise.all([
    Player.countDocuments(),
    Player.countDocuments({ status: PlayerStatus.AVAILABLE }),
    Player.countDocuments({ status: PlayerStatus.SOLD }),
    Player.countDocuments({ status: PlayerStatus.UNSOLD }),
  ])
  return { total, available, sold, unsold }
}

export async function broadcastPublicUpdate() {
  const { broadcastPublicUpdateInner } = await import('../sockets/events.js')
  await broadcastPublicUpdateInner()
}
