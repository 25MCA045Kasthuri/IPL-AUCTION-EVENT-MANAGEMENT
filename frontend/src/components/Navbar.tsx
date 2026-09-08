import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import iplLogo from '../assets/branding/ipl-logo.png'
import swapLogo from '../assets/branding/swap-2k26.png'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/live-auction')
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
      isActive ? 'bg-yellow-400 text-slate-900' : 'text-slate-200 hover:bg-slate-800'
    }`

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="IPL Auction Home">
            <img src={iplLogo} alt="IPL Auction" className="h-10 w-auto sm:h-12" />
          </Link>
          <div className="hidden flex-col leading-tight md:flex">
            <span className="text-base font-extrabold tracking-wide text-white">
              IPL <span className="text-yellow-400">AUCTION</span>
            </span>
            <span className="text-[10px] font-medium tracking-wide text-slate-400">
              2K26
            </span>
          </div>
          <div className="mx-1 hidden h-8 w-px shrink-0 bg-slate-700 md:block" />
          <div className="flex shrink-0 flex-col items-start leading-tight">
            <img src={swapLogo} alt="SWAP 2K26" className="h-7 w-auto sm:h-8" />
            <span className="mt-0.5 hidden text-sm font-normal text-slate-300 md:block">
              Jamal Mohamed College (Autonomous), Trichy - 20
              <br />
              PG and Research Department of Computer Science
            </span>
          </div>
        </div>
        <nav className="flex items-center gap-2">
          <NavLink to="/live-auction" className={linkClass}>
            Live Auction
          </NavLink>
          {user && (
            <>
              <NavLink to="/admin" className={linkClass}>
                Admin
              </NavLink>
              <NavLink to="/results" className={linkClass}>
                Results
              </NavLink>
            </>
          )}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">{user.name}</span>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              >
                Logout
              </button>
            </div>
          ) : (
            location.pathname !== '/live-auction' && (
              <Link
                to="/login"
                className="rounded-lg bg-yellow-400 px-3 py-1.5 text-sm font-bold text-slate-900 hover:bg-yellow-300"
              >
                Login
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  )
}
