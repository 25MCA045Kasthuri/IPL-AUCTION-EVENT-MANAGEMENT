import mongoose, { Schema, type Model } from 'mongoose'
import { PLAYER_ROLES, PLAYER_STATUSES } from './enums.js'

export interface IPlayer {
  name: string
  role: (typeof PLAYER_ROLES)[number]
  nationality: string
  isOverseas: boolean
  ranking: number
  basePrice: number
  importOrder: number
  soldPrice: number | null
  teamId: mongoose.Types.ObjectId | null
  status: (typeof PLAYER_STATUSES)[number]
  createdAt?: Date
  updatedAt?: Date
}

type PlayerDoc = IPlayer & mongoose.Document

const playerSchema = new Schema<PlayerDoc>(
  {
    name: { type: String, required: true, trim: true, index: true },
    role: { type: String, required: true, enum: PLAYER_ROLES, index: true },
    nationality: { type: String, required: true, trim: true, default: 'India' },
    isOverseas: { type: Boolean, required: true, default: false, index: true },
    ranking: { type: Number, required: true, min: 0, default: 0 },
    basePrice: { type: Number, required: true, min: 0, default: 0 },
    importOrder: { type: Number, default: 0, index: true },
    soldPrice: { type: Number, min: 0, default: null },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', default: null, index: true },
    status: { type: String, required: true, enum: PLAYER_STATUSES, default: 'Available', index: true },
  },
  { timestamps: true },
)

playerSchema.index({ status: 1, role: 1 })

export const Player: Model<PlayerDoc> = mongoose.model<PlayerDoc>('Player', playerSchema)
export type PlayerType = PlayerDoc
