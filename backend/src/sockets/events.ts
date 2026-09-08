import { emitPublic } from './index.js'
import { buildPublicSnapshot, getPlayerCounts } from '../services/publicDataService.js'

export async function broadcastPublicUpdateInner() {
  try {
    const snapshot = await buildPublicSnapshot()
    emitPublic('auction:updated', snapshot)
    emitPublic('team:updated', snapshot.teams)
  } catch (err) {
    console.error('[SOCKET] failed to broadcast public update', err)
  }
}

export async function broadcastPlayerEvent(payload: unknown) {
  emitPublic('player:updated', payload)
  await broadcastPublicUpdateInner()
}

// Periodic heartbeat so the live page can show connection status & freshness.
export function startHeartbeat() {
  setInterval(async () => {
    try {
      const counts = await getPlayerCounts()
      emitPublic('heartbeat', {
        status: 'live',
        timestamp: new Date().toISOString(),
        soldCount: counts.sold,
        availableCount: counts.available,
      })
    } catch (err) {
      console.error('[SOCKET] heartbeat failed', err)
    }
  }, 15000)
}
