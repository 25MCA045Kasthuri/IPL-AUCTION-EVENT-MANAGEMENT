import { useEffect, useState } from 'react'
import { api, ApiError } from '../services/api'
import { formatCrore } from '../utils/format'
import type { Player, Team } from '../types'

interface Props {
  player: Player
  teams: Team[]
  mode: 'sell' | 'edit'
  onClose: () => void
  onDone: (message: string) => void
}

export default function SellModal({ player, teams, mode, onClose, onDone }: Props) {
  const [price, setPrice] = useState(mode === 'edit' ? String(player.soldPrice ?? '') : '')
  const [teamShort, setTeamShort] = useState(mode === 'edit' && player.teamId ? (teams.find((t) => t._id === player.teamId)?.shortName ?? '') : '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const selectedTeam = teams.find((t) => t.shortName === teamShort)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const soldPrice = Number(price)
    if (!teamShort) return setError('Select a team')
    if (!Number.isFinite(soldPrice) || soldPrice <= 0) return setError('Enter a valid sold price (in Crores)')
    setBusy(true)
    setError(null)
    try {
      if (mode === 'sell') {
        await api.post('/auction/sell', { playerId: player._id, soldPrice, teamShortName: teamShort })
        onDone(`${player.name} sold to ${teamShort} for ${formatCrore(soldPrice)}`)
      } else {
        await api.post('/auction/edit', { playerId: player._id, soldPrice, teamShortName: teamShort })
        onDone(`${player.name} updated to ${teamShort} for ${formatCrore(soldPrice)}`)
      }
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-bold">
          {mode === 'sell' ? `Sell ${player.name}` : `Edit ${player.name}`}
        </h2>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-800 p-3 text-sm">
          <span className="text-slate-400">Role</span>
          <span className="font-semibold">{player.role}</span>
          <span className="text-slate-400">Base Price</span>
          <span className="font-semibold">{formatCrore(player.basePrice)}</span>
          <span className="text-slate-400">Current Status</span>
          <span className="font-semibold">{player.status}</span>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-red-700 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Team
            </label>
            <select
              value={teamShort}
              onChange={(e) => setTeamShort(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 outline-none focus:border-yellow-400"
            >
              <option value="">Select team...</option>
              {teams.map((t) => (
                <option key={t._id} value={t.shortName}>
                  {t.name} ({t.shortName}) — ₹{t.remainingPurse.toFixed(1)} Cr left
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Sold Price (Crores)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 outline-none focus:border-yellow-400"
              placeholder="e.g. 7.5"
            />
            <p className="mt-1 text-xs text-slate-500">
              {selectedTeam
                ? `${selectedTeam.shortName} remaining after: ${formatCrore((selectedTeam.remainingPurse - (Number(price) || 0)))}`
                : 'Enter amount in Crores (1.0 = ₹1 Cr)'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-700 py-2 font-semibold hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-lg bg-yellow-400 py-2 font-bold text-slate-900 hover:bg-yellow-300 disabled:opacity-50"
            >
              {busy ? 'Saving...' : mode === 'sell' ? 'Mark Sold' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
