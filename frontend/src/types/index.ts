export type PlayerRole = 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicketkeeper'
export type PlayerStatus = 'Available' | 'Sold' | 'Unsold'

export interface Player {
  _id: string
  name: string
  role: PlayerRole
  nationality: string
  isOverseas: boolean
  ranking: number
  basePrice: number
  importOrder?: number
  soldPrice: number | null
  teamId: string | null
  status: PlayerStatus
  createdAt?: string
  updatedAt?: string
}

export interface Team {
  _id: string
  name: string
  shortName: string
  initialPurse: number
  remainingPurse: number
  playerCount: number
  order: number
}

export interface Composition {
  total: number
  batsmen: number
  bowlers: number
  allRounders: number
  wicketkeepers: number
  overseas: number
}

export interface LivePlayer {
  id: string
  name: string
  role: PlayerRole
  isOverseas: boolean
  ranking: number
  soldPrice: number
}

export interface LiveTeam {
  id: string
  name: string
  shortName: string
  initialPurse: number
  spent: number
  remainingPurse: number
  composition: Composition
  players: LivePlayer[]
}

export interface LiveSnapshot {
  teams: LiveTeam[]
  counts: { total: number; available: number; sold: number; unsold: number }
  rules: {
    total: number
    maxTotal: number
    batsmen: number
    bowlers: number
    allRounders: number
    wicketkeepers: number
    overseas: number
  }
}

export interface TeamSummary {
  team: Team
  spent: number
  remainingPurse: number
  composition: Composition
  eligible: boolean
  checks: { label: string; value: number; min: number; max?: number; pass: boolean }[]
}

export interface Transaction {
  _id: string
  playerId: string
  playerName: string
  action: string
  previousStatus: string | null
  newStatus: string | null
  previousTeamName: string | null
  newTeamName: string | null
  previousPrice: number | null
  newPrice: number | null
  performedBy: string | null
  createdAt: string
}

export interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'CONDUCTOR'
}

export interface AuthResponse {
  token: string
  user: User
}

export interface LeaderboardEntry {
  teamId: string
  teamName: string
  shortName: string
  eligible: boolean
  reasons: string[]
  totalPlayers: number
  remainingPurse: number
  spent: number
  composition: Record<string, number>
  playerRankingScore: number
  averageRank: number | null
  rankingComponent: number
  purseComponent: number
  finalScore: number
  position: number
}

export interface ImportRow {
  rowNumber: number
  name: string
  role: string
  rawRole: string
  nationality: string
  isOverseas: boolean
  ranking: number
  basePrice: number
  importOrder?: number
  errors: string[]
}
