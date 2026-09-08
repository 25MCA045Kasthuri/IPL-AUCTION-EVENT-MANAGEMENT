import useConnectionStatus from '../hooks/useConnectionStatus'

export default function ConnectionStatus() {
  const status = useConnectionStatus()
  const map = {
    live: { color: 'bg-green-500', label: 'Live' },
    reconnecting: { color: 'bg-amber-500 animate-pulse', label: 'Reconnecting' },
    disconnected: { color: 'bg-red-500', label: 'Disconnected' },
  } as const
  const cfg = map[status]

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
      <span className={`h-2.5 w-2.5 rounded-full ${cfg.color}`} />
      {cfg.label}
    </span>
  )
}
