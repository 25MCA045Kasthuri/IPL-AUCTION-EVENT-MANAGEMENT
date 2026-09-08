import { useEffect, useState } from 'react'
import { api, ApiError } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { formatCrore } from '../utils/format'
import type { LeaderboardEntry } from '../types'

export default function Results() {
  const { user } = useAuth()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [weights, setWeights] = useState<{ rankingWeight: number; purseWeight: number } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const [r, s] = await Promise.all([
        api.get<{ data: LeaderboardEntry[] }>('/results'),
        api.get<{ data: { rankingWeight: number; purseWeight: number } }>('/settings'),
      ])
      setLeaderboard(r.data)
      setWeights(s.data)
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const calculate = async () => {
    setBusy(true)
    setErr(null)
    try {
      const res = await api.post<{ data: { leaderboard: LeaderboardEntry[]; weights: { rankingWeight: number; purseWeight: number } } }>(
        '/results/calculate',
      )
      setLeaderboard(res.data.leaderboard)
      setWeights(res.data.weights)
      setMsg('Results calculated')
      setTimeout(() => setMsg(null), 4000)
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Calculation failed')
    } finally {
      setBusy(false)
    }
  }

  const eligible = leaderboard.filter((e) => e.eligible).sort((a, b) => a.position - b.position)
  const [first, second] = eligible

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black">Final Results</h1>
            <p className="text-sm text-slate-400">
              Signed in as {user?.name} ({user?.role})
            </p>
          </div>
          <button
            onClick={calculate}
            disabled={busy}
            className="rounded-lg bg-yellow-400 px-5 py-2 font-bold text-slate-900 hover:bg-yellow-300 disabled:opacity-50"
          >
            {busy ? 'Calculating...' : 'Calculate / Refresh Results'}
          </button>
        </div>

        {msg && (
          <div className="mb-4 rounded-xl border border-emerald-700 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
            {msg}
          </div>
        )}
        {err && (
          <div className="mb-4 rounded-xl border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {err}
          </div>
        )}

        {weights && (
          <p className="mb-6 text-sm text-slate-400">
            Weights: Ranking <strong className="text-white">{weights.rankingWeight}%</strong> · Purse{' '}
            <strong className="text-white">{weights.purseWeight}%</strong>
          </p>
        )}

        {/* Winners */}
        {eligible.length > 0 ? (
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {first && <WinnerCard rank={1} entry={first} />}
            {second && <WinnerCard rank={2} entry={second} />}
          </div>
        ) : (
          <div className="mb-8 rounded-2xl border border-amber-700 bg-amber-950/20 p-6 text-center">
            <p className="text-lg font-bold text-amber-300">No eligible teams yet.</p>
            <p className="text-sm text-slate-400">
              Click "Calculate / Refresh Results" after squads are complete. A team needs ≥16 players meeting all role minimums and a non-negative purse.
            </p>
          </div>
        )}

        {/* Leaderboard */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800 text-xs uppercase tracking-wide text-slate-300">
              <tr>
                <th className="px-3 py-2">Position</th>
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2">Eligibility</th>
                <th className="px-3 py-2">Players</th>
                <th className="px-3 py-2">Ranking Score</th>
                <th className="px-3 py-2">Remaining Purse</th>
                <th className="px-3 py-2">Ranking Component</th>
                <th className="px-3 py-2">Purse Component</th>
                <th className="px-3 py-2">Final Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    No results yet.
                  </td>
                </tr>
              )}
              {leaderboard.map((e) => (
                <tr key={e.teamId} className="border-t border-slate-800">
                  <td className="px-3 py-2 font-bold text-white">
                    {e.eligible ? `#${e.position}` : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-bold text-white">{e.shortName}</span>
                    <span className="ml-1 text-xs text-slate-500">{e.teamName}</span>
                  </td>
                  <td className="px-3 py-2">
                    {e.eligible ? (
                      <span className="rounded bg-emerald-600/20 px-2 py-0.5 text-xs font-bold text-emerald-300">
                        ELIGIBLE
                      </span>
                    ) : (
                      <span className="rounded bg-red-600/20 px-2 py-0.5 text-xs font-bold text-red-300">
                        NOT ELIGIBLE
                        {e.reasons.length > 0 && (
                          <span className="block pt-1 text-[10px] font-normal text-red-400">
                            {e.reasons.join(' · ')}
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{e.totalPlayers}</td>
                  <td className="px-3 py-2 text-slate-300">{e.eligible ? e.playerRankingScore.toFixed(2) : '—'}</td>
                  <td className="px-3 py-2 text-slate-300">{formatCrore(e.remainingPurse)}</td>
                  <td className="px-3 py-2 text-slate-300">{e.eligible ? e.rankingComponent.toFixed(2) : '—'}</td>
                  <td className="px-3 py-2 text-slate-300">{e.eligible ? e.purseComponent.toFixed(2) : '—'}</td>
                  <td className="px-3 py-2 font-bold text-yellow-400">{e.eligible ? e.finalScore.toFixed(2) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function WinnerCard({ rank, entry }: { rank: 1 | 2; entry: LeaderboardEntry }) {
  const medal = rank === 1 ? '🥇' : '🥈'
  const title = rank === 1 ? 'First Place Winner' : 'Second Place Winner'
  return (
    <div
      className={`rounded-2xl border-2 p-6 ${
        rank === 1 ? 'border-yellow-500 bg-gradient-to-br from-yellow-950/60 to-slate-900' : 'border-slate-500 bg-gradient-to-br from-slate-800/60 to-slate-900'
      }`}
    >
      <div className="text-4xl">{medal}</div>
      <div className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">{title}</div>
      <h3 className="mt-1 text-3xl font-black text-white">{entry.shortName}</h3>
      <p className="text-sm text-slate-400">{entry.teamName}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-900/70 p-2">
          <div className="text-lg font-black text-white">{entry.totalPlayers}</div>
          <div className="text-[10px] uppercase text-slate-500">Players</div>
        </div>
        <div className="rounded-lg bg-slate-900/70 p-2">
          <div className="text-lg font-black text-yellow-300">{formatCrore(entry.remainingPurse)}</div>
          <div className="text-[10px] uppercase text-slate-500">Remaining</div>
        </div>
        <div className="rounded-lg bg-slate-900/70 p-2">
          <div className="text-lg font-black text-white">{entry.finalScore.toFixed(2)}</div>
          <div className="text-[10px] uppercase text-slate-500">Final Score</div>
        </div>
      </div>
    </div>
  )
}
