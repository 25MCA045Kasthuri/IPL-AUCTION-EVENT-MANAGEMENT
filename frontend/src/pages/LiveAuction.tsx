import useLiveSnapshot from '../hooks/useLiveSnapshot'
import TeamCard from '../components/TeamCard'
import ConnectionStatus from '../components/ConnectionStatus'
import collegeLogo from '../assets/branding/college-logo.png'
import eventIncharge from '../assets/branding/event-incharge.png'

const TEAM_DISPLAY_ORDER: Record<string, number> = {
  CSK: 0,
  MI: 1,
  RCB: 2,
  KKR: 3,
  GT: 4,
}

export default function LiveAuction() {
  const { snapshot, loading, error } = useLiveSnapshot()
  const teams = snapshot
    ? [...snapshot.teams].sort(
        (a, b) => (TEAM_DISPLAY_ORDER[a.shortName] ?? 99) - (TEAM_DISPLAY_ORDER[b.shortName] ?? 99)
      )
    : []

  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      <img
        src={collegeLogo}
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed left-1/2 top-1/2 z-0 h-auto w-[280px] -translate-x-1/2 -translate-y-1/2 select-none opacity-[0.07] sm:w-[340px]"
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-wide">
              IPL AUCTION <span className="text-yellow-400">LIVE</span>
            </h1>
            <p className="text-sm text-slate-400">Read-only viewer · auto-updates in real time</p>
          </div>
          <ConnectionStatus />
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && !snapshot ? (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-slate-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        )}

        {snapshot && (
          <div className="mt-6 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <Totals label="Total Players" value={snapshot.counts.total} />
            <Totals label="Available" value={snapshot.counts.available} />
            <Totals label="Sold" value={snapshot.counts.sold} />
            <Totals label="Unsold" value={snapshot.counts.unsold} />
          </div>
        )}
      </div>
      <footer className="relative z-10 mx-auto max-w-4xl border-t border-slate-800 px-4 py-8">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:justify-center sm:gap-8">
          <img src={collegeLogo} alt="College logo" className="h-20 w-auto sm:h-24" />
          <div className="flex flex-col items-center sm:items-start">
            <p className="text-sm font-semibold tracking-wide text-slate-300">
              Staff In-charge
            </p>
            <p className="mt-2 max-w-xl text-xs font-normal leading-relaxed text-slate-400">
              Dr. S. Mohamed Ilyas, M.C.A., M.Phil., M.Com., Ph.D., NET., SET.
            </p>
            <p className="text-xs font-normal leading-relaxed text-slate-400">
              Dr. M. Wasim Raja, M.Sc., M.Phil., PGDCA., Ph.D.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              PG and Research Department of Computer Science
              <br />
              Jamal Mohamed College (Autonomous), Trichy - 20
            </p>
          </div>
          <img src={eventIncharge} alt="Event In-charge" className="h-20 w-auto sm:h-24" />
          <div className="flex flex-col items-center sm:items-start">
            <p className="text-xs font-semibold tracking-wide text-slate-300">
              Student In-charge
            </p>
            <p className="mt-1 max-w-xl text-[10px] font-normal leading-relaxed text-slate-400">
              Afriz M - Event Controller
            </p>
            <p className="text-[10px] font-normal leading-relaxed text-slate-400">
              Masood Shaheel O S - Auctioneer
            </p>
            <p className="text-[10px] font-normal leading-relaxed text-slate-400">
              Mohamed Naleef M - Data Analysis
            </p>
            <p className="text-[10px] font-normal leading-relaxed text-slate-400">
              Kasthurirengan R - Technical Department
            </p>
            <p className="text-[10px] font-normal leading-relaxed text-slate-400">
              Ashik Ahmed J - Technical Support
            </p>
            <p className="text-[10px] font-normal leading-relaxed text-slate-400">
              Riyas Theen M - Event Organiser
            </p>
            <p className="text-[10px] font-normal leading-relaxed text-slate-400">
              Thippu Sulthan H - Projection and Tactical Support
            </p>
          </div>
        </div>
        </footer>
    </div>
  )
}

function Totals({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  )
}
