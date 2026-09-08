import { io, type Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5000'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ['websocket', 'polling'], autoConnect: true })
  }
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
