import mongoose from 'mongoose'
import { config } from './index.js'

let connected = false

export async function connectDB(uri: string = config.mongodbUri): Promise<void> {
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Create a .env file from .env.example and add your MongoDB Atlas connection string.',
    )
  }
  await mongoose.connect(uri)
  connected = true
}

export function isConnected(): boolean {
  return connected && mongoose.connection.readyState === 1
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
  connected = false
}
