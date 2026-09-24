import { useEffect, useState } from 'react'
import { api, ApiError } from '../services/api'
import type { ManualPlayerInput, PlayerRole } from '../types'

interface Props {
  onClose: () => void
  onDone: (message: string) => void
}

interface FormState {
  name: string
  role: PlayerRole
  nationality: string
  matches: string
  runs: string
  battingAverage: string
  strikeRate: string
  wickets: string
  economy: string
  ranking: string
  basePrice: number
}

const ROLES: { value: PlayerRole; label: string }[] = [
  { value: 'Batsman', label: 'Batsman' },
  { value: 'Bowler', label: 'Bowler' },
  { value: 'All-Rounder', label: 'All-Rounder' },
  { value: 'Wicketkeeper', label: 'Wicketkeeper' },
]

const BASE_PRICE_OPTIONS = [
  { value: 0.2, label: '₹20 Lakh (0.2 Cr)' },
  { value: 0.4, label: '₹40 Lakh (0.4 Cr)' },
  { value: 0.6, label: '₹60 Lakh (0.6 Cr)' },
  { value: 0.8, label: '₹80 Lakh (0.8 Cr)' },
  { value: 1, label: '₹1 Crore (1.0 Cr)' },
]

const EMPTY: FormState = {
  name: '',
  role: 'Batsman',
  nationality: 'India',
  matches: '',
  runs: '',
  battingAverage: '',
  strikeRate: '',
  wickets: '',
  economy: '',
  ranking: '',
  basePrice: 0.2,
}

export default function AddPlayerModal({ onClose, onDone }: Props) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const economyToPayload = (v: string) => {
    const trimmed = v.trim()
    if (trimmed === '' || trimmed === '-') return null
    return Number(trimmed)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return setError('Player name is required.')
    const ranking = Number(form.ranking)
    if (!Number.isInteger(ranking) || ranking < 1 || ranking > 110) {
      return setError('IPL Ranking must be a whole number from 1 to 110.')
    }
    const payload: ManualPlayerInput = {
      name,
      role: form.role,
      nationality: form.nationality.trim() || 'India',
      matches: Number(form.matches) || 0,
      runs: Number(form.runs) || 0,
      battingAverage: Number(form.battingAverage) || 0,
      strikeRate: Number(form.strikeRate) || 0,
      wickets: Number(form.wickets) || 0,
      economy: economyToPayload(form.economy),
      ranking,
      basePrice: form.basePrice,
    }
    if (payload.matches < 0 || payload.runs < 0 || payload.battingAverage < 0 || payload.strikeRate < 0 || payload.wickets < 0) {
      return setError('Stats cannot be negative.')
    }
    if (payload.economy !== null && payload.economy < 0) {
      return setError('Economy cannot be negative.')
    }
    setBusy(true)
    setError(null)
    try {
      await api.post('/players', payload)
      onDone(`${name} added successfully.`)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add player. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const field =
    'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400'
  const label = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-xl font-bold">Add Player Manually</h2>
        <p className="mb-4 text-xs text-slate-400">
          Creates a player with the same MongoDB document structure as an Excel-imported player.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-700 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label}>Player Name *</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. MS Dhoni" className={field} />
            </div>
            <div>
              <label className={label}>Role</label>
              <select value={form.role} onChange={(e) => set('role', e.target.value as PlayerRole)} className={field}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Nationality</label>
              <input value={form.nationality} onChange={(e) => set('nationality', e.target.value)} placeholder="India" className={field} />
            </div>
            <div>
              <label className={label}>Matches</label>
              <input type="number" min={0} value={form.matches} onChange={(e) => set('matches', e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>Runs</label>
              <input type="number" min={0} value={form.runs} onChange={(e) => set('runs', e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>Batting Average</label>
              <input type="number" min={0} step="0.01" value={form.battingAverage} onChange={(e) => set('battingAverage', e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>Strike Rate</label>
              <input type="number" min={0} step="0.01" value={form.strikeRate} onChange={(e) => set('strikeRate', e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>Wickets</label>
              <input type="number" min={0} value={form.wickets} onChange={(e) => set('wickets', e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>Economy (or - / blank)</label>
              <input value={form.economy} onChange={(e) => set('economy', e.target.value)} placeholder="-" className={field} />
            </div>
            <div>
              <label className={label}>IPL Ranking (1–110) *</label>
              <input type="number" min={1} max={110} value={form.ranking} onChange={(e) => set('ranking', e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>Base Price</label>
              <select value={form.basePrice} onChange={(e) => set('basePrice', Number(e.target.value))} className={field}>
                {BASE_PRICE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 rounded-lg border border-slate-700 py-2 font-semibold hover:bg-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-lg bg-yellow-400 py-2 font-bold text-slate-900 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Adding...' : 'Add Player'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}