import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { formatCrore } from '../utils/format'
import type { Transaction } from '../types'

export default function TransactionHistory() {
  const [txns, setTxns] = useState<Transaction[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<{ data: Transaction[] }>('/transactions')
      .then((res) => setTxns(res.data))
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h3 className="mb-3 text-lg font-bold">Auction Transaction History</h3>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="max-h-80 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-800 text-slate-300">
            <tr>
              <th className="px-2 py-1.5">Time</th>
              <th className="px-2 py-1.5">Player</th>
              <th className="px-2 py-1.5">Action</th>
              <th className="px-2 py-1.5">Status</th>
              <th className="px-2 py-1.5">Team</th>
              <th className="px-2 py-1.5">Price</th>
              <th className="px-2 py-1.5">By</th>
            </tr>
          </thead>
          <tbody>
            {txns.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-center text-slate-500">
                  No transactions yet
                </td>
              </tr>
            )}
            {txns.map((t) => (
              <tr key={t._id} className="border-t border-slate-800">
                <td className="px-2 py-1 text-slate-400">{new Date(t.createdAt).toLocaleTimeString()}</td>
                <td className="px-2 py-1 font-semibold text-white">{t.playerName}</td>
                <td className="px-2 py-1">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      t.action === 'SOLD' || t.action === 'IMPORT'
                        ? 'bg-emerald-700 text-white'
                        : t.action === 'UNDO'
                          ? 'bg-red-700 text-white'
                          : 'bg-slate-700 text-white'
                    }`}
                  >
                    {t.action}
                  </span>
                </td>
                <td className="px-2 py-1 text-slate-300">
                  {t.previousStatus || '—'} → {t.newStatus || '—'}
                </td>
                <td className="px-2 py-1 text-slate-300">
                  {t.previousTeamName || '—'} → {t.newTeamName || '—'}
                </td>
                <td className="px-2 py-1 text-slate-300">
                  {t.previousPrice != null ? formatCrore(t.previousPrice) : '—'} →{' '}
                  {t.newPrice != null ? formatCrore(t.newPrice) : '—'}
                </td>
                <td className="px-2 py-1 text-slate-400">{t.performedBy || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
