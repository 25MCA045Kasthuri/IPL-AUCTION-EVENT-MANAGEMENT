import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'
import { getSocket } from '../services/socket'
import type { Player, Team, TeamSummary } from '../types'

export interface AdminFilters {
  search: string
  role: string
  status: string
  team: string
}

export function useAdminData() {
  const [players, setPlayers] = useState<Player[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [summaries, setSummaries] = useState<TeamSummary[]>([])
  const [counts, setCounts] = useState({ total: 0, available: 0, sold: 0, unsold: 0 })
  const [filters, setFilters] = useState<AdminFilters>({ search: '', role: '', status: '', team: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.role) params.set('role', filters.role)
    if (filters.status) params.set('status', filters.status)
    if (filters.team) params.set('team', filters.team)
    try {
      const [p, t, s, live] = await Promise.all([
        api.get<{ data: Player[] }>(`/players?${params.toString()}`),
        api.get<{ data: Team[] }>('/teams'),
        api.get<{ data: TeamSummary[] }>('/teams/summaries'),
        api.get<{ data: { counts: { total: number; available: number; sold: number; unsold: number } } }>('/public/live'),
      ])
      setPlayers(p.data)
      setTeams(t.data)
      setSummaries(s.data)
      setCounts(live.data.counts)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const socket = getSocket()
    const onUpdate = () => refresh()
    socket.on('auction:updated', onUpdate)
    socket.on('player:updated', onUpdate)
    return () => {
      socket.off('auction:updated', onUpdate)
      socket.off('player:updated', onUpdate)
    }
  }, [refresh])

  const setFilter = (key: keyof AdminFilters, value: string) => setFilters((f) => ({ ...f, [key]: value }))
  const resetFilters = () => setFilters({ search: '', role: '', status: '', team: '' })

  return { players, teams, summaries, counts, filters, setFilter, resetFilters, refresh, loading, error }
}
