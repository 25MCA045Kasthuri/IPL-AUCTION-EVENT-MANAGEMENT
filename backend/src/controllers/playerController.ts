import { Player } from '../models/Player.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

export const listPlayers = asyncHandler(async (req, res) => {
  const { search, role, status, team, page, limit } = req.query as Record<string, string>
  const filter: Record<string, unknown> = {}

  if (search) filter.name = { $regex: search, $options: 'i' }
  if (role) filter.role = role
  if (status) filter.status = status
  if (team) filter.teamId = team

  // Return EVERY matching player by default. Pagination is opt-in via
  // explicit ?page=&limit= params; no arbitrary fixed cap (e.g. 100/200)
  // is imposed, so large rosters are never silently truncated.
  const pageNum = Number(page)
  const limitNum = Number(limit)
  // Do NOT populate teamId here: the frontend types model `teamId` as a plain
  // string id. Populating it turns it into a nested object, which breaks
  // comparisons like `t._id === p.teamId` in Admin/SellModal.
  let query = Player.find(filter).sort({ importOrder: 1 })
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
