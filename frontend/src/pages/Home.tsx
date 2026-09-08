import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import swapLogo from '../assets/branding/swap-2k26.png'
import collegeLogo from '../assets/branding/college-logo.png'
import eventIncharge from '../assets/branding/event-incharge.png'

export default function Home() {
  const { user } = useAuth()
  return (
    <div className="relative min-h-screen bg-slate-950 px-4 text-center text-white">
      <img
        src={collegeLogo}
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed left-1/2 top-1/2 z-0 h-auto w-[max(280px,40vw)] max-w-[380px] -translate-x-1/2 -translate-y-1/2 select-none opacity-[0.06]"
      />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center">
        <img src={swapLogo} alt="SWAP 2K26" className="h-20 w-auto sm:h-24" />
        <h1 className="mt-4 text-4xl font-black tracking-wide">
          IPL AUCTION <span className="text-yellow-400">EVENT</span>
        </h1>
        <p className="mt-2 max-w-xl text-slate-400">
          Live auction event management. Manage players, track team purses, and compute final results.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            to="/live-auction"
            className="rounded-xl bg-yellow-400 px-6 py-3 font-bold text-slate-900 hover:bg-yellow-300"
          >
            View Live Auction
          </Link>
          {user ? (
            <Link
              to="/admin"
              className="rounded-xl border border-slate-600 px-6 py-3 font-bold text-white hover:bg-slate-800"
            >
              Admin Dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-xl border border-slate-600 px-6 py-3 font-bold text-white hover:bg-slate-800"
            >
              Admin / Conductor Login
            </Link>
          )}
        </div>
        {user && (
          <p className="mt-6 text-sm text-slate-400">
            Signed in as {user.name} ({user.role})
          </p>
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
        <p style={{ position: 'fixed', bottom: '16px', left: '16px', margin: 0, color: '#94a3b8', fontSize: '14px' }}>
          Designed &amp; Developed by Kasthurirengan R, II MCA
        </p>
      </footer>
    </div>
  )
}
