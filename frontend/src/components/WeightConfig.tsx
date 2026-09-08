import { useEffect, useState } from 'react'
import { api, ApiError } from '../services/api'

export default function WeightConfig({ onSaved }: { onSaved: (msg: string) => void }) {
  const [ranking, setRanking] = useState(70)
  const [purse, setPurse] = useState(30)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .get<{ data: { rankingWeight: number; purseWeight: number } }>('/settings')
      .then((res) => {
        setRanking(res.data.rankingWeight)
        setPurse(res.data.purseWeight)
      })
      .catch(() => {})
  }, [])

  const total = ranking + purse

  const save = async () => {
    setErr(null)
    setMsg(null)
    if (total !== 100) {
      setErr('Weights must total 100%')
      return
    }
    setBusy(true)
    try {
      await api.put('/settings', { rankingWeight: ranking, purseWeight: purse })
      setMsg('Weights updated')
      onSaved('Scoring weights updated')
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed to update')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h3 className="mb-3 text-lg font-bold">Scoring Weights</h3>
      <p className="mb-3 text-xs text-slate-400">
        Ranking Score Weight + Remaining Purse Weight must equal 100%. Used by the Results page.
      </p>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400">Player Ranking Weight (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={ranking}
            onChange={(e) => setRanking(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-yellow-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400">Remaining Purse Weight (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={purse}
            onChange={(e) => setPurse(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-yellow-400"
          />
        </div>
        <div className={`text-sm ${total === 100 ? 'text-emerald-400' : 'text-red-400'}`}>
          Total: {total}% {total === 100 ? '✓' : '✗ (must be 100)'}
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
        <button
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-yellow-400 px-4 py-2 font-bold text-slate-900 hover:bg-yellow-300 disabled:opacity-50"
        >
          {busy ? 'Saving...' : 'Save Weights'}
        </button>
      </div>
    </div>
  )
}
