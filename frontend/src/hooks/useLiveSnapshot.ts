import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { getSocket } from '../services/socket'
import type { LiveSnapshot } from '../types'

export default function useLiveSnapshot() {
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api
      .get<{ data: LiveSnapshot }>('/public/live')
      .then((res) => {
        if (active) {
          setSnapshot(res.data)
          setError(null)
        }
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false))

    const socket = getSocket()
    // Only 'auction:updated' carries the full snapshot. The 'team:updated'
    // event carries only a teams array, so we must not overwrite the whole
    // snapshot with it (otherwise snapshot.teams/.counts would become
    // undefined). We simply ignore it here; 'auction:updated' is always
    // emitted alongside it.
    const onUpdate = (data: LiveSnapshot) => {
      setSnapshot(data)
      setError(null)
    }
    socket.on('auction:updated', onUpdate)

    return () => {
      active = false
      socket.off('auction:updated', onUpdate)
    }
  }, [])

  return { snapshot, error, loading }
}
