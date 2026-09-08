import mongoose, { Schema, type InferSchemaType } from 'mongoose'
import { PLAYER_STATUSES } from './enums.js'

const auctionTransactionSchema = new Schema(
  {
    playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
    playerName: { type: String, required: true, trim: true },
    action: {
      type: String,
      required: true,
      enum: ['SOLD', 'UNSOLD', 'EDIT', 'UNDO', 'MOVE', 'IMPORT'],
    },
    previousStatus: { type: String, enum: PLAYER_STATUSES, default: null },
    newStatus: { type: String, enum: PLAYER_STATUSES, default: null },
    previousTeamId: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
    newTeamId: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
    previousTeamName: { type: String, default: null },
    newTeamName: { type: String, default: null },
    previousPrice: { type: Number, min: 0, default: null },
    newPrice: { type: Number, min: 0, default: null },
    performedBy: { type: String, default: null },
  },
  { timestamps: true },
)

auctionTransactionSchema.index({ createdAt: -1 })
auctionTransactionSchema.index({ playerId: 1, createdAt: -1 })

export type AuctionTransactionType = InferSchemaType<typeof auctionTransactionSchema>

export const AuctionTransaction = mongoose.model('AuctionTransaction', auctionTransactionSchema)
