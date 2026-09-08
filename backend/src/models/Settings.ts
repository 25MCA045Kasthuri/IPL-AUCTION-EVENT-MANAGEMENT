import mongoose, { Schema, type InferSchemaType } from 'mongoose'

// Singleton-ish settings document used for configurable scoring weights.
const settingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    rankingWeight: { type: Number, required: true, min: 0, max: 100, default: 70 },
    purseWeight: { type: Number, required: true, min: 0, max: 100, default: 30 },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

export type SettingsType = InferSchemaType<typeof settingsSchema>

export const Settings = mongoose.model('Settings', settingsSchema)
