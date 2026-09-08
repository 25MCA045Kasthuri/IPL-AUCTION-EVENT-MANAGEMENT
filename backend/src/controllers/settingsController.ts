import { asyncHandler } from '../middleware/asyncHandler.js'
import * as resultService from '../services/resultService.js'
import { weightsSchema } from '../validators/index.js'
import { Settings } from '../models/Settings.js'

export const getWeights = asyncHandler(async (_req, res) => {
  let settings = await Settings.findOne({ key: 'scoring' })
  if (!settings) {
    settings = await Settings.create({ key: 'scoring', rankingWeight: 70, purseWeight: 30 })
  }
  res.json({
    success: true,
    data: { rankingWeight: settings.rankingWeight, purseWeight: settings.purseWeight },
  })
})

export const updateWeights = asyncHandler(async (req, res) => {
  const input = weightsSchema.parse(req.body)
  const data = await resultService.updateWeights(input.rankingWeight, input.purseWeight)
  res.json({ success: true, data })
})
