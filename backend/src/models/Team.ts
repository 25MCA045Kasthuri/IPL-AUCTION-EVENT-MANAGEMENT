import mongoose, { Schema, type Model } from 'mongoose'

export interface ITeam {
  name: string
  shortName: string
  initialPurse: number
  remainingPurse: number
  playerCount: number
  order: number
  createdAt?: Date
  updatedAt?: Date
}

type TeamDoc = ITeam & mongoose.Document

const teamSchema = new Schema<TeamDoc>(
  {
    name: { type: String, required: true, trim: true },
    shortName: { type: String, required: true, uppercase: true },
    initialPurse: { type: Number, required: true, min: 0, default: 90 },
    remainingPurse: { type: Number, required: true, min: 0, default: 90 },
    playerCount: { type: Number, required: true, min: 0, default: 0 },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
)

teamSchema.index({ shortName: 1 }, { unique: true })

export const Team: Model<TeamDoc> = mongoose.model<TeamDoc>('Team', teamSchema)
export type TeamType = TeamDoc
