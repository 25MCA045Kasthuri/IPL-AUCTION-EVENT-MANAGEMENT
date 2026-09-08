import { AuctionTransaction } from '../models/AuctionTransaction.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

export const listTransactions = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500)
  const transactions = await AuctionTransaction.find().sort({ createdAt: -1 }).limit(limit).lean()
  res.json({ success: true, data: transactions })
})
