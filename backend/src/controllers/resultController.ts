import { asyncHandler } from '../middleware/asyncHandler.js'
import * as resultService from '../services/resultService.js'

export const calculateResults = asyncHandler(async (_req, res) => {
  const { result, leaderboard, weights } = await resultService.calculateResults()
  res.json({ success: true, data: { resultId: String(result._id), calculatedAt: result.calculationDate, weights, leaderboard } })
})

export const getResults = asyncHandler(async (_req, res) => {
  const leaderboard = await resultService.getLatestResults()
  res.json({ success: true, data: leaderboard })
})
