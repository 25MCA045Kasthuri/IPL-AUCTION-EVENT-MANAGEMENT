import { Player } from '../models/Player.js'
import { PlayerStatus } from '../models/enums.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { rankFilterSchema } from '../validators/index.js'

export const listPlayers = asyncHandler(async (req, res) => {
  const { search, role, status, team, page, limit, rankFrom, rankTo } = req.query as Record<string, string>
  const filter: Record<string, unknown> = {}

  if (search) filter.name = { $regex: search, $options: 'i' }
  if (role) filter.role = role
  if (status) filter.status = status
  if (team) filter.teamId = team

  let sort: Record<string, 1 | -1> = { importOrder: 1 }
  if (rankFrom || rankTo) {
    const rank = rankFilterSchema.parse({ rankFrom, rankTo })
    const ranking: Record<string, number> = {}
    if (rank.rankFrom !== undefined) ranking.$gte = rank.rankFrom
    if (rank.rankTo !== undefined) ranking.$lte = rank.rankTo
    filter.ranking = ranking
    // Lower rank number = better player; keep importOrder as tiebreak.
    sort = { ranking: 1, importOrder: 1 }
  }

  // Return EVERY matching player by default. Pagination is opt-in via
  // explicit ?page=&limit= params; no arbitrary fixed cap (e.g. 100/200)
  // is imposed, so large rosters are never silently truncated.
  const pageNum = Number(page)
  const limitNum = Number(limit)
  // Do NOT populate teamId here: the frontend types model `teamId` as a plain
  // string id. Populating it turns it into a nested object, which breaks
  // comparisons like `t._id === p.teamId` in Admin/SellModal.
  let query = Player.find(filter).sort(sort)
  if (Number.isFinite(pageNum) && pageNum > 0 && Number.isFinite(limitNum) && limitNum > 0) {
    query = query.skip((pageNum - 1) * limitNum).limit(limitNum)
  }

  const [players, total] = await Promise.all([query.lean(), Player.countDocuments(filter)])

  res.json({ success: true, data: players, total })
})

export const getPlayer = asyncHandler(async (req, res) => {
  const player = await Player.findById(req.params.id)
  if (!player) return res.status(404).json({ success: false, message: 'Player not found' })
  res.json({ success: true, data: player })
})

export const listUnsoldQueue = asyncHandler(async (_req, res) => {
  const [players, total] = await Promise.all([
    Player.find({ status: PlayerStatus.UNSOLD_QUEUE }).sort({ queueOrder: 1 }).lean(),
    Player.countDocuments({ status: PlayerStatus.UNSOLD_QUEUE }),
  ])
  res.json({ success: true, data: players, total })
})

export const createPlayer = asyncHandler(async (req, res) => {
  const player = await Player.create(req.body)
  res.status(201).json({ success: true, data: player })
})

export const updatePlayer = asyncHandler(async (req, res) => {
  const player = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
  if (!player) return res.status(404).json({ success: false, message: 'Player not found' })
  res.json({ success: true, data: player })
})

export const deletePlayer = asyncHandler(async (req, res) => {
  await Player.findByIdAndDelete(req.params.id)
  res.json({ success: true, message: 'Player deleted' })
})
