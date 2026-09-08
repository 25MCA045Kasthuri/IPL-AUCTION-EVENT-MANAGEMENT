import { useState } from 'react'
import { api, ApiError, downloadFile } from '../services/api'

export default function ResetPanel({ onDone }: { onDone: (msg: string) => void }) {
  const [confirmText, setConfirmText] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const exportData = async () => {
    setErr(null)
    try {
      await downloadFile('/admin/export', 'auction-backup.xlsx')
      onDone('Backup downloaded')
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Export failed')
    }
  }

  const reset = async () => {
    setErr(null)
    if (confirmText.trim().toUpperCase() !== 'RESET AUCTION') {
      setErr('Type RESET AUCTION exactly to confirm.')
      return
    }
    setBusy(true)
    try {
      await api.post('/admin/reset', { confirmation: 'RESET AUCTION' })
      setConfirmText('')
      onDone('Auction reset. All players are Available, purses restored to ₹90 Cr.')
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Reset failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-red-900/50 bg-red-950/10 p-5">
      <h3 className="mb-3 text-lg font-bold text-red-300">Reset / Event Safety</h3>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={exportData}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500"
        >
          ⬇ Export Backup (Excel)
        </button>
      </div>
      <p className="mb-2 mt-4 text-xs text-slate-400">
        Warning: this resets all players to Available and restores every team purse. Type{' '}
        <strong className="text-white">RESET AUCTION</strong> to confirm.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type RESET AUCTION"
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-red-500"
        />
        <button
          onClick={reset}
          disabled={busy}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"
        >
          {busy ? 'Resetting...' : 'Reset Auction'}
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
    </div>
  )
}
