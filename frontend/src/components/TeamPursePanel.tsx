import type { TeamSummary } from '../types'
import { formatCrore } from '../utils/format'

export default function TeamPursePanel({ summaries }: { summaries: TeamSummary[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {summaries.map((s) => {
        const { team } = s
        return (
          <div
            key={String(team._id)}
            className={`rounded-2xl border p-4 ${
              s.eligible ? 'border-emerald-700 bg-emerald-950/20' : 'border-amber-700 bg-amber-950/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-black text-white">{team.shortName}</h4>
                <p className="text-[11px] text-slate-400">{team.name}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  s.eligible ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                }`}
              >
                {s.eligible ? 'ELIGIBLE' : 'INCOMPLETE'}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Spent" value={formatCrore(s.spent)} />
              <MiniStat label="Remaining" value={formatCrore(s.remainingPurse)} />
              <MiniStat label="Players" value={String(s.composition.total)} />
            </div>

            <div className="mt-3 space-y-1">
              {s.checks.map((c) => (
                <div key={c.label} className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{c.label}</span>
                  <span className={c.pass ? 'text-emerald-400' : 'text-red-400'}>
                    {c.label === 'Purse' ? formatCrore(c.value) : c.value}
                    {c.max ? `/${c.max}` : `/${c.min}`} {c.pass ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-900/70 px-1 py-1.5">
      <div className="text-sm font-bold text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  )
}
