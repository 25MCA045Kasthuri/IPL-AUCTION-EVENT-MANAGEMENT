import type { LiveTeam } from '../types'
import { formatCrore } from '../utils/format'
import cskLogo from '../assets/teams/csk.png'
import miLogo from '../assets/teams/mi.png'
import rcbLogo from '../assets/teams/rcb.png'
import kkrLogo from '../assets/teams/kkr.png'
import gtLogo from '../assets/teams/gt.png'

const TEAM_LOGOS: Record<string, { src: string; alt: string }> = {
  CSK: { src: cskLogo, alt: 'Chennai Super Kings' },
  MI: { src: miLogo, alt: 'Mumbai Indians' },
  RCB: { src: rcbLogo, alt: 'Royal Challengers Bengaluru' },
  KKR: { src: kkrLogo, alt: 'Kolkata Knight Riders' },
  GT: { src: gtLogo, alt: 'Gujarat Titans' },
}

const TEAM_THEME: Record<string, { border: string; header: string }> = {
  CSK: {
    border: 'border-yellow-500',
    header: 'bg-yellow-500/15',
  },
  KKR: {
    border: 'border-purple-500',
    header: 'bg-purple-500/15',
  },
  MI: {
    border: 'border-sky-500',
    header: 'bg-sky-500/15',
  },
  RCB: {
    border: 'border-red-500',
    header: 'bg-red-500/15',
  },
  GT: {
    border: 'border-teal-500',
    header: 'bg-teal-500/15',
  },
}

const ROLE_ORDER = ['Batsman', 'Bowler', 'All-Rounder', 'Wicketkeeper'] as const
const ROLE_COLOR: Record<string, string> = {
  Batsman: 'border-sky-500 text-sky-300',
  Bowler: 'border-emerald-500 text-emerald-300',
  'All-Rounder': 'border-violet-500 text-violet-300',
  Wicketkeeper: 'border-rose-500 text-rose-300',
}

const MAX_SLOTS = 25

function playerCellStyle() {
  return 'border-b border-slate-800 bg-slate-900/60'
}

export default function TeamCard({ team }: { team: LiveTeam }) {
  const groups = ROLE_ORDER.map((role) => ({
    role,
    players: team.players.filter((p) => p.role === role),
  }))
  const theme = TEAM_THEME[team.shortName]

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border bg-slate-900/70 shadow-xl ${
        theme ? theme.border : 'border-slate-700'
      }`}
    >
      {/* header */}
      <div
        className={`flex border-b px-4 py-3 ${
          theme ? `border-slate-700 ${theme.header}` : 'border-slate-700 bg-slate-800/80'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {TEAM_LOGOS[team.shortName] ? (
              <img
                src={TEAM_LOGOS[team.shortName].src}
                alt={TEAM_LOGOS[team.shortName].alt}
                className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
              />
            ) : null}
            <div className="min-w-0">
              <h3 className="text-xl font-black text-white">{team.shortName}</h3>
              <p className="truncate text-xs text-slate-400">{team.name}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-3xl font-black text-yellow-400">{formatCrore(team.remainingPurse)}</div>
            <div className="text-[11px] font-medium tracking-wide text-slate-400">REMAINING</div>
          </div>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-b border-slate-800 bg-slate-950/40 px-4 py-3 text-xs sm:grid-cols-3">
        <Stat label="Initial Purse" value={formatCrore(team.initialPurse)} />
        <Stat label="Spent" value={formatCrore(team.spent)} />
        <Stat label="Players" value={String(team.composition.total)} />
        <Stat label="Batsmen" value={String(team.composition.batsmen)} />
        <Stat label="Bowlers" value={String(team.composition.bowlers)} />
        <Stat label="All-Rounders" value={String(team.composition.allRounders)} />
        <Stat label="Wicketkeepers" value={String(team.composition.wicketkeepers)} />
        <Stat label="Overseas" value={String(team.composition.overseas)} />
        <Stat label="Domestic" value={String(team.composition.total - team.composition.overseas)} />
      </div>

      {/* player slots grouped by role */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        {groups.map(({ role, players }) => {
          const color = ROLE_COLOR[role] || 'border-slate-500 text-slate-300'
          return (
            <div key={role}>
              <div className="flex items-center justify-between px-1 pb-1">
                <span className={`text-[11px] font-bold uppercase tracking-wide ${color.split(' ')[1]}`}>{role}s</span>
                <span className="text-[11px] font-semibold text-slate-500">{players.length}/{MAX_SLOTS}</span>
              </div>
              {players.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-800 px-2 py-1 text-[11px] text-slate-600">
                  — no {role.toLowerCase()} purchased —
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-800">
                  {players.map((p) => (
                    <div key={p.id} className={`flex items-center justify-between px-2 py-1 text-xs ${playerCellStyle()}`}>
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className={`rounded border px-1 text-[10px] font-bold ${color}`}>
                          {p.isOverseas ? 'OS' : 'IN'}
                        </span>
                        <span className="truncate font-semibold text-white">{p.name}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-[11px] text-slate-400">R{Math.round(p.ranking)}</span>
                        <span className="font-bold text-yellow-300">{formatCrore(p.soldPrice)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-900 py-0.5">
      <span className="text-slate-400">{label}</span>
      <span className="font-bold text-white">{value}</span>
    </div>
  )
}
