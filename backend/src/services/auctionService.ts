import mongoose from 'mongoose'
import { Player } from '../models/Player.js'
import { Team } from '../models/Team.js'
import { AuctionTransaction } from '../models/AuctionTransaction.js'
import { PlayerStatus } from '../models/enums.js'
import { config } from '../config/index.js'
import { AppError } from '../utils/errors.js'
import { broadcastPlayerEvent } from '../sockets/events.js'

const MAX_TEAM_PLAYERS = config.maxSquadPlayers

interface UserInfo {
  email?: string
  name?: string
}

function actorLabel(user?: UserInfo): string | null {
  if (!user) return null
  return user.name || user.email || null
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

async function ensurePlayer(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid player id', 400)
  const player = await Player.findById(id)
  if (!player) throw new AppError('Player not found', 404)
  return player
}

export async function sellPlayer(
  input: { playerId: string; soldPrice: number; teamShortName: string },
  user?: UserInfo,
) {
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const player = await Player.findById(input.playerId).session(session)
      if (!player) throw new AppError('Player not found', 404)
      if (player.status === PlayerStatus.SOLD) {
        throw new AppError(`Player "${player.name}" is already sold`, 409)
      }
      if (!Number.isFinite(input.soldPrice) || input.soldPrice <= 0) {
        throw new AppError('Sold price must be greater than zero', 400)
      }

      const team = await Team.findOne({ shortName: input.teamShortName.toUpperCase() }).session(session)
      if (!team) throw new AppError(`Team "${input.teamShortName}" not found`, 404)

      const count = await Player.countDocuments({ teamId: team._id, status: PlayerStatus.SOLD }).session(session)
      if (count >= MAX_TEAM_PLAYERS) {
        throw new AppError(`${team.name} already has ${MAX_TEAM_PLAYERS} players (max)`, 409)
      }
      if (input.soldPrice > team.remainingPurse + 1e-6) {
        throw new AppError(
          `${team.shortName} has insufficient purse (₹${team.remainingPurse.toFixed(1)} Cr) for a ₹${input.soldPrice.toFixed(1)} Cr purchase`,
          409,
        )
      }

      player.status = PlayerStatus.SOLD
      player.soldPrice = round2(input.soldPrice)
      player.teamId = team._id
      await player.save({ session })

      team.remainingPurse = round2(team.remainingPurse - input.soldPrice)
      team.playerCount = count + 1
      await team.save({ session })

      await AuctionTransaction.create(
        [
          {
            playerId: player._id,
            playerName: player.name,
            action: 'SOLD',
            previousStatus: PlayerStatus.AVAILABLE,
            newStatus: PlayerStatus.SOLD,
            previousTeamId: null,
            newTeamId: team._id,
            newTeamName: team.shortName,
            previousPrice: null,
            newPrice: input.soldPrice,
            performedBy: actorLabel(user),
          },
        ],
        { session },
      )
    })
    await broadcastPlayerEvent({ type: 'sold', playerId: input.playerId })
    return { message: 'Player sold' }
  } finally {
    await session.endSession()
  }
}

export async function undoSale(input: { playerId: string }, user?: UserInfo) {
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const player = await Player.findById(input.playerId).session(session)
      if (!player) throw new AppError('Player not found', 404)
      if (player.status !== PlayerStatus.SOLD || !player.teamId) {
        throw new AppError(`Player "${player.name}" is not sold`, 409)
      }

      const soldPrice = player.soldPrice ?? 0
      const team = await Team.findById(player.teamId).session(session)
      if (!team) throw new AppError('Team not found', 404)

      const prevTeamName = team.shortName
      const prevTeamId = player.teamId

      player.status = PlayerStatus.AVAILABLE
      player.teamId = null
      player.soldPrice = null
      await player.save({ session })

      team.remainingPurse = round2(team.remainingPurse + soldPrice)
      team.playerCount = Math.max(0, team.playerCount - 1)
      await team.save({ session })

      await AuctionTransaction.create(
        [
          {
            playerId: player._id,
            playerName: player.name,
            action: 'UNDO',
            previousStatus: PlayerStatus.SOLD,
            newStatus: PlayerStatus.AVAILABLE,
            previousTeamId: prevTeamId,
            newTeamId: null,
            previousTeamName: prevTeamName,
            newTeamName: null,
            previousPrice: soldPrice,
            newPrice: null,
            performedBy: actorLabel(user),
          },
        ],
        { session },
      )
    })
    await broadcastPlayerEvent({ type: 'unsold', playerId: input.playerId })
    return { message: 'Sale undone' }
  } finally {
    await session.endSession()
  }
}

// Edit an existing sale. Uniform approach: revert the old team, then apply as a fresh purchase.
export async function editSale(
  input: { playerId: string; soldPrice: number; teamShortName: string },
  user?: UserInfo,
) {
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const player = await Player.findById(input.playerId).session(session)
      if (!player) throw new AppError('Player not found', 404)
      if (!Number.isFinite(input.soldPrice) || input.soldPrice <= 0) {
        throw new AppError('Sold price must be greater than zero', 400)
      }
      if (player.status !== PlayerStatus.SOLD || !player.teamId) {
        throw new AppError(`Player "${player.name}" is not currently sold; use Sell instead`, 409)
      }

      const newTeam = await Team.findOne({ shortName: input.teamShortName.toUpperCase() }).session(session)
      if (!newTeam) throw new AppError(`Team "${input.teamShortName}" not found`, 404)

      const prevTeamId = player.teamId
      const prevPrice = player.soldPrice
      const oldTeam = await Team.findById(player.teamId).session(session)
      const sameTeam = oldTeam !== null && String(oldTeam._id) === String(newTeam._id)

      if (sameTeam && oldTeam) {
        // Net price change on the same team (player count unchanged).
        const delta = round2(input.soldPrice - (player.soldPrice ?? 0))
        if (delta > oldTeam.remainingPurse + 1e-6) {
          throw new AppError(
            `${oldTeam.shortName} has insufficient purse (₹${oldTeam.remainingPurse.toFixed(1)} Cr) for this price change`,
            409,
          )
        }
        oldTeam.remainingPurse = round2(oldTeam.remainingPurse - delta)
        await oldTeam.save({ session })
      } else {
        // Revert the old team first.
        if (oldTeam) {
          oldTeam.remainingPurse = round2(oldTeam.remainingPurse + (player.soldPrice ?? 0))
          oldTeam.playerCount = Math.max(0, oldTeam.playerCount - 1)
          await oldTeam.save({ session })
        }
        // Validate + apply to the new team.
        const count = await Player.countDocuments({ teamId: newTeam._id, status: PlayerStatus.SOLD }).session(session)
        if (count >= MAX_TEAM_PLAYERS) {
          throw new AppError(`${newTeam.shortName} already has ${MAX_TEAM_PLAYERS} players (max)`, 409)
        }
        if (input.soldPrice > newTeam.remainingPurse + 1e-6) {
          throw new AppError(
            `${newTeam.shortName} has insufficient purse (₹${newTeam.remainingPurse.toFixed(1)} Cr) for a ₹${input.soldPrice.toFixed(1)} Cr purchase`,
            409,
          )
        }
        newTeam.remainingPurse = round2(newTeam.remainingPurse - input.soldPrice)
        newTeam.playerCount = count + 1
        await newTeam.save({ session })
      }

      player.teamId = newTeam._id
      player.soldPrice = round2(input.soldPrice)
      await player.save({ session })

      await AuctionTransaction.create(
        [
          {
            playerId: player._id,
            playerName: player.name,
            action: 'EDIT',
            previousStatus: PlayerStatus.SOLD,
            newStatus: PlayerStatus.SOLD,
            previousTeamId: prevTeamId,
            newTeamId: newTeam._id,
            previousTeamName: oldTeam?.shortName ?? null,
            newTeamName: newTeam.shortName,
            previousPrice: prevPrice,
            newPrice: input.soldPrice,
            performedBy: actorLabel(user),
          },
        ],
        { session },
      )
    })
    await broadcastPlayerEvent({ type: 'edited', playerId: input.playerId })
    return { message: 'Sale updated' }
  } finally {
    await session.endSession()
  }
}

export async function markUnsold(input: { playerId: string }, user?: UserInfo) {
  const player = await ensurePlayer(input.playerId)
  if (player.status === PlayerStatus.SOLD) {
    throw new AppError(`Player "${player.name}" is sold; undo the sale first`, 409)
  }
  const prevStatus = player.status
  player.status = PlayerStatus.UNSOLD
  await player.save()

  await AuctionTransaction.create({
    playerId: player._id,
    playerName: player.name,
    action: 'UNSOLD',
    previousStatus: prevStatus,
    newStatus: PlayerStatus.UNSOLD,
    performedBy: actorLabel(user),
  })
  await broadcastPlayerEvent({ type: 'marked-unsold', playerId: input.playerId })
  return { message: `Player "${player.name}" marked unsold` }
}
