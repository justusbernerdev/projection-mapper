import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import '../index.css'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s sitten`
  if (s < 3600) return `${Math.floor(s / 60)}min sitten`
  return `${Math.floor(s / 3600)}h sitten`
}

export default function AdminView() {
  const all = useQuery(api.submissions.listAll) ?? []
  const setStatus = useMutation(api.submissions.setStatus)
  const remove = useMutation(api.submissions.remove)

  const pending = all.filter(s => s.status === 'pending')
  const approved = all.filter(s => s.status === 'approved')
  const rest = all.filter(s => s.status !== 'pending' && s.status !== 'approved')

  const sorted = [...pending, ...approved, ...rest]

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold mb-1">Admin — Moderointi</h1>
        <p className="text-zinc-500 text-sm mb-6">
          {pending.length} odottaa · {approved.length} hyväksytty
        </p>

        <div className="space-y-2">
          {sorted.map(sub => (
            <div
              key={sub._id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                sub.status === 'pending'
                  ? 'bg-zinc-900 border-yellow-800 animate-pulse-once'
                  : sub.status === 'approved'
                  ? 'bg-zinc-900/50 border-green-900'
                  : 'bg-zinc-900/30 border-zinc-800 opacity-50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{sub.name}</div>
                <div className="text-xs text-zinc-500">
                  {timeAgo(sub.createdAt)} · {sub.status}
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                {sub.status === 'pending' && (
                  <>
                    <button
                      onClick={() => setStatus({ id: sub._id, status: 'approved' })}
                      className="px-3 py-1.5 text-sm bg-green-800 hover:bg-green-700 rounded-md"
                    >
                      Hyväksy
                    </button>
                    <button
                      onClick={() => setStatus({ id: sub._id, status: 'rejected' })}
                      className="px-3 py-1.5 text-sm bg-red-900 hover:bg-red-800 rounded-md"
                    >
                      Hylkää
                    </button>
                  </>
                )}
                <button
                  onClick={() => remove({ id: sub._id })}
                  className="px-2 py-1.5 text-sm text-zinc-500 hover:text-red-400"
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {sorted.length === 0 && (
            <div className="text-center text-zinc-600 py-12">
              Ei lähetyksiä vielä
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
