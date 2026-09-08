import { asyncHandler } from '../middleware/asyncHandler.js'
import * as auctionService from '../services/auctionService.js'
import { sellSchema, unsoldSchema, editSchema } from '../validators/index.js'

export const sellPlayer = asyncHandler(async (req, res) => {
  const input = sellSchema.parse(req.body)
  const result = await auctionService.sellPlayer(input, req.user)
  res.json(result)
})

export const undoSale = asyncHandler(async (req, res) => {
  const input = unsoldSchema.parse({ playerId: req.params.id || req.body.playerId })
  const result = await auctionService.undoSale(input, req.user)
  res.json(result)
})

export const editSale = asyncHandler(async (req, res) => {
  const input = editSchema.parse(req.body)
  const result = await auctionService.editSale(input, req.user)
  res.json(result)
})

export const markUnsold = asyncHandler(async (req, res) => {
  const input = unsoldSchema.parse({ playerId: req.params.id || req.body.playerId })
  const result = await auctionService.markUnsold(input, req.user)
  res.json(result)
})
