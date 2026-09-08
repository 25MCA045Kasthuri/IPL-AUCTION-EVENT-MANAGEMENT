export const PlayerRole = {
  BATSMAN: 'Batsman',
  BOWLER: 'Bowler',
  ALL_ROUNDER: 'All-Rounder',
  WICKETKEEPER: 'Wicketkeeper',
} as const

export const PLAYER_ROLES = Object.values(PlayerRole)

export const PlayerStatus = {
  AVAILABLE: 'Available',
  SOLD: 'Sold',
  UNSOLD: 'Unsold',
} as const

export const PLAYER_STATUSES = Object.values(PlayerStatus)

export const UserRole = {
  ADMIN: 'ADMIN',
  CONDUCTOR: 'CONDUCTOR',
} as const

export const USER_ROLES = Object.values(UserRole)

export type APP_ROLE = (typeof UserRole)[keyof typeof UserRole]

export const isOverseas = (nationality: string): boolean =>
  nationality.trim().toLowerCase() !== 'india'
