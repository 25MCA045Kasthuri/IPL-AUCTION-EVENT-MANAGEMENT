import { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { config } from '../config/index.js'

let io: Server | null = null

export interface Heartbeat {
  status: 'live' | 'reconnecting' | 'disconnected'
  timestamp: string
  soldCount: number
  availableCount: number
}

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: { origin: config.clientUrl, methods: ['GET', 'POST'] },
  })
  return io
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialized')
  return io
}

export function emitPublic(event: string, payload: unknown) {
  if (!io) return
  io.emit(event, payload)
}
