import { useState } from 'react'
import { api, ApiError, downloadFile } from '../services/api'

export default function ResetPanel({ onDone }: { onDone: (msg: string) => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
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
    setBusy(true)
    try {
      await api.post('/admin/reset', { confirmation: 'RESET AUCTION' })
      setConfirmOpen(false)
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
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={busy}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"
        >
          Reset All Players
        </button>
      </div>
      <p className="mb-2 mt-4 text-xs text-slate-400">
        Reset All Players restores the auction to its initial state: every player becomes Available, team purses
        return to ₹90 Cr, and the Unsold Queue is cleared. Player information is <strong className="text-white">NOT deleted</strong>.
      </p>
      {err && <p className="mt-2 text-sm text-red-400">{err}</p>}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !busy && setConfirmOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-red-800 bg-slate-900 p-6 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-red-300">Reset all players?</h2>
            <p className="mt-2 text-sm text-slate-300">
              This will reset auction status, restore team purses, and clear the Unsold Queue. Player information
              will NOT be deleted.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={busy}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={reset}
                disabled={busy}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'Resetting...' : 'Reset All Players'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}