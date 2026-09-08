import { useEffect, useState } from 'react'
import { getSocket } from '../services/socket'

export type ConnStatus = 'live' | 'reconnecting' | 'disconnected'

export default function useConnectionStatus() {
  const [status, setStatus] = useState<ConnStatus>('disconnected')

  useEffect(() => {
    const socket = getSocket()
    const onConnect = () => setStatus('live')
    const onDisconnect = (reason: string) => {
      setStatus(reason === 'io server disconnect' ? 'disconnected' : 'reconnecting')
    }
    const onReconnect = () => setStatus('live')
    const onReconnectAttempt = () => setStatus('reconnecting')
    const onConnectError = () => setStatus('reconnecting')

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('reconnect', onReconnect)
    socket.on('reconnect_attempt', onReconnectAttempt)
    socket.on('connect_error', onConnectError)

    if (socket.connected) onConnect()

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('reconnect', onReconnect)
      socket.off('reconnect_attempt', onReconnectAttempt)
      socket.off('connect_error', onConnectError)
    }
  }, [])

  return status
}
