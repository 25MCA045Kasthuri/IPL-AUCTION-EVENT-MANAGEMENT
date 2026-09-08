import { useState } from 'react'
import { useAdminData } from '../hooks/useAdminData'
import { useAuth } from '../hooks/useAuth'
import { api, ApiError } from '../services/api'
import TeamPursePanel from '../components/TeamPursePanel'
import SellModal from '../components/SellModal'
import ImportWizard from '../components/ImportWizard'
import TransactionHistory from '../components/TransactionHistory'
import WeightConfig from '../components/WeightConfig'
import ResetPanel from '../components/ResetPanel'
import ConnectionStatus from '../components/ConnectionStatus'
import { formatCrore, formatPrice } from '../utils/format'
import type { Player } from '../types'

const ROLE_COLOR: Record<string, string> = {
  Batsman: 'bg-sky-600/20 text-sky-300',
  Bowler: 'bg-emerald-600/20 text-emerald-300',
  'All-Rounder': 'bg-violet-600/20 text-violet-300',
  Wicketkeeper: 'bg-rose-600/20 text-rose-300',
}

export default function Admin() {
  const data = useAdminData()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [modal, setModal] = useState<{ player: Player; mode: 'sell' | 'edit' } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const notify = (msg: string) => {
    setToast(msg)
    data.refresh()
    setTimeout(() => setToast(null), 4000)
  }

  const undo = async (player: Player) => {
    if (!window.confirm(`Undo sale of ${player.name}? The team purse will be restored.`)) return
    setErr(null)
    try {
      await api.post('/auction/undo', { playerId: player._id })
      notify(`${player.name}'s sale undone`)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Undo failed')
    }
  }

  const markUnsold = async (player: Player) => {
    setErr(null)
    try {
      await api.post('/auction/unsold', { playerId: player._id })
      notify(`${player.name} marked unsold`)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Action failed')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">Admin Dashboard</h1>
            <p className="text-sm text-slate-400">Manage players, sales, and the live auction</p>
          </div>
          <ConnectionStatus />
        </div>

        {toast && (
          <div className="mb-4 rounded-xl border border-emerald-700 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
            {toast}
          </div>
        )}
        {err && (
          <div className="mb-4 rounded-xl border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {err}
          </div>
        )}
        {data.error && (
          <div className="mb-4 rounded-xl border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {data.error}
          </div>
        )}

        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Total Players" value={data.counts.total} color="text-white" />
          <SummaryCard label="Available" value={data.counts.available} color="text-sky-400" />
          <SummaryCard label="Sold" value={data.counts.sold} color="text-emerald-400" />
          <SummaryCard label="Unsold" value={data.counts.unsold} color="text-rose-400" />
        </div>

        {isAdmin && (
          <>
            <div className="mb-6">
              <ImportWizard onImported={notify} />
            </div>

            <div className="mb-6">
              <WeightConfig onSaved={notify} />
            </div>
          </>
        )}

        {/* Team purse / eligibility */}
        <div className="mb-8">
          <h2 className="mb-3 text-xl font-bold">Team Purse &amp; Squad Eligibility</h2>
          <TeamPursePanel summaries={data.summaries} />
        </div>

        {/* Player management table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400">Search</label>
              <input
                value={data.filters.search}
                onChange={(e) => data.setFilter('search', e.target.value)}
                placeholder="Player name..."
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white outline-none focus:border-yellow-400"
              />
            </div>
            <FilterSelect label="Role" value={data.filters.role} onChange={(v) => data.setFilter('role', v)} options={['', 'Batsman', 'Bowler', 'All-Rounder', 'Wicketkeeper']} display={(v) => v || 'All Roles'} />
            <FilterSelect label="Status" value={data.filters.status} onChange={(v) => data.setFilter('status', v)} options={['', 'Available', 'Sold', 'Unsold']} display={(v) => v || 'All Status'} />
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-400">Team</label>
              <select
                value={data.filters.team}
                onChange={(e) => data.setFilter('team', e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white outline-none focus:border-yellow-400"
              >
                <option value="">All Teams</option>
                {data.teams.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.shortName}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={data.resetFilters} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-semibold hover:bg-slate-800">
              Clear
            </button>
            <span className="ml-auto text-xs text-slate-500">{data.players.length} shown</span>
          </div>

          <div className="max-h-[540px] overflow-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-800 text-xs uppercase tracking-wide text-slate-300">
                <tr>
                  <th className="px-3 py-2">Player Name</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Nationality</th>
                  <th className="px-3 py-2">Ranking</th>
                  <th className="px-3 py-2">Base Price</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Sold Price</th>
                  <th className="px-3 py-2">Sold To</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.players.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                      No players match. Import the spreadsheet first.
                    </td>
                  </tr>
                )}
                {data.players.map((p) => {
                  const team = data.teams.find((t) => t._id === p.teamId)
                  return (
                    <tr key={p._id} className="border-t border-slate-800 hover:bg-slate-800/40">
                      <td className="px-3 py-2 font-semibold text-white">{p.name}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-bold ${ROLE_COLOR[p.role] || 'bg-slate-700 text-slate-200'}`}>
                          {p.role}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {p.isOverseas ? `${p.nationality} (OS)` : 'India'}
                      </td>
                      <td className="px-3 py-2 text-slate-300">{Math.round(p.ranking)}</td>
                      <td className="px-3 py-2 text-slate-300">{formatPrice(p.basePrice)}</td>
                      <td className="px-3 py-2">
                        <StatusChip status={p.status} />
                      </td>
                      <td className="px-3 py-2 font-semibold text-yellow-300">
                        {p.status === 'Sold' ? formatCrore(p.soldPrice) : '—'}
                      </td>
                      <td className="px-3 py-2 font-semibold text-white">{team ? team.shortName : '—'}</td>
                      <td className="px-3 py-2 text-right">
                        {isAdmin && (
                          <div className="flex justify-end gap-1">
                            {p.status !== 'Sold' ? (
                              <button
                                onClick={() => setModal({ player: p, mode: 'sell' })}
                                className="rounded bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-500"
                              >
                                Sell
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => setModal({ player: p, mode: 'edit' })}
                                  className="rounded bg-sky-600 px-2 py-1 text-xs font-bold text-white hover:bg-sky-500"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => undo(p)}
                                  className="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white hover:bg-red-500"
                                >
                                  Undo
                                </button>
                              </>
                            )}
                            {p.status === 'Available' && (
                              <button
                                onClick={() => markUnsold(p)}
                                className="rounded bg-slate-700 px-2 py-1 text-xs font-bold text-white hover:bg-slate-600"
                                title="Mark unsold"
                              >
                                Unsold
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* History + admin tools */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {isAdmin ? (
            <TransactionHistory />
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
              Conductor view: read-only. Auction transaction history is limited to the Event Admin.
            </div>
          )}
          {isAdmin ? <ResetPanel onDone={notify} /> : <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">Conductor view: read-only.</div>}
        </div>
      </div>

      {modal && (
        <SellModal player={modal.player} teams={data.teams} mode={modal.mode} onClose={() => setModal(null)} onDone={notify} />
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4">
      <div className={`text-3xl font-black ${color}`}>{value}</div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  display,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  display: (v: string) => string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white outline-none focus:border-yellow-400"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {display(o)}
          </option>
        ))}
      </select>
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    Available: 'bg-sky-600/20 text-sky-300',
    Sold: 'bg-emerald-600/20 text-emerald-300',
    Unsold: 'bg-rose-600/20 text-rose-300',
  }
  return <span className={`rounded px-2 py-0.5 text-xs font-bold ${map[status] || 'bg-slate-700 text-slate-200'}`}>{status}</span>
}
