import mongoose, { Schema, type InferSchemaType } from 'mongoose'
import { USER_ROLES } from './enums.js'

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: USER_ROLES, default: 'CONDUCTOR' },
  },
  { timestamps: true },
)

export type UserType = InferSchemaType<typeof userSchema>

export const User = mongoose.model('User', userSchema)
