import { Player } from '../models/Player.js'
import { Team } from '../models/Team.js'
import { AuctionTransaction } from '../models/AuctionTransaction.js'
import { Result } from '../models/Result.js'
import { resetSchema } from '../validators/index.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { PlayerStatus } from '../models/enums.js'
import { broadcastPublicUpdateInner } from '../sockets/events.js'
import { AppError } from '../utils/errors.js'

// Export the current auction state as an Excel workbook (players + team summary + latest results).
export const exportData = asyncHandler(async (_req, res) => {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  const players = await Player.find().populate('teamId', 'shortName name').lean()
  const playerRows = players.map((p) => ({
    'Player Name': p.name,
    Role: p.role,
    Nationality: p.nationality,
    'Overseas': p.isOverseas ? 'Overseas' : 'Indian',
    'IPL Ranking': p.ranking,
    'Base Price (Cr)': p.basePrice,
    Status: p.status,
    'Sold Price (Cr)': p.soldPrice ?? '',
    'Sold To': p.teamId ? (p.teamId as { shortName?: string }).shortName || (p.teamId as { name?: string }).name : '',
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(playerRows), 'Players')

  const teams = await Team.find().sort({ order: 1 }).lean()
  const sales = await Player.find({ status: PlayerStatus.SOLD })
  const teamRows = teams.map((t) => {
    const bought = sales.filter((s) => String(s.teamId) === String(t._id))
    const spent = bought.reduce((sum, p) => sum + (p.soldPrice ?? 0), 0)
    return {
      'Team': t.name,
      'Short Name': t.shortName,
      'Initial Purse': t.initialPurse,
      'Spent': Math.round(spent * 100) / 100,
      'Remaining Purse': t.remainingPurse,
      'Players Purchased': bought.length,
    }
  })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(teamRows), 'Team Summary')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const name = `auction-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.xlsx`
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`)
  res.send(buf)
})

// Reset auction state after explicit confirmation. Does an export backup first.
export const resetAuction = asyncHandler(async (req, res) => {
  const { confirmation } = resetSchema.parse(req.body)
  if (confirmation !== 'RESET AUCTION') {
    throw new AppError('Type RESET AUCTION to confirm', 400)
  }

  await Player.updateMany({}, {
    $set: { status: PlayerStatus.AVAILABLE, teamId: null, soldPrice: null },
  })
  await Team.updateMany({}, [
    { $set: { remainingPurse: '$initialPurse', playerCount: 0 } },
  ])
  await AuctionTransaction.deleteMany({})
  await Result.deleteMany({})

  await broadcastPublicUpdateInner()
  res.json({ success: true, message: 'Auction reset complete. Players restored to Available, purse restored to ₹90 Cr.' })
})
