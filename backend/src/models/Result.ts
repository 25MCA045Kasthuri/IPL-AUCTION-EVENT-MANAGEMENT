import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const resultSchema = new Schema(
  {
    eventId: { type: String, required: true, default: 'default' },
    calculationDate: { type: Date, default: Date.now },
    weights: {
      rankingWeight: { type: Number, required: true },
      purseWeight: { type: Number, required: true },
    },
    leaderboard: [
      {
        teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
        teamName: { type: String },
        shortName: { type: String },
        eligible: { type: Boolean },
        disqualificationReasons: [{ type: String }],
        playerRankingScore: { type: Number },
        remainingPurse: { type: Number },
        averageRank: { type: Number, default: null },
        rankingComponent: { type: Number },
        purseComponent: { type: Number },
        finalScore: { type: Number },
        position: { type: Number },
        totalPlayers: { type: Number },
      },
    ],
  },
  { timestamps: true },
)

resultSchema.index({ eventId: 1, calculationDate: -1 })

export type ResultType = InferSchemaType<typeof resultSchema>

export const Result = mongoose.model('Result', resultSchema)
