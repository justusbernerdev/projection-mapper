import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import '../index.css'

export default function SubmitView() {
  const [name, setName] = useState('')
  const [sent, setSent] = useState(false)
  const submit = useMutation(api.submissions.submit)
  const count = useQuery(api.submissions.totalCount) ?? 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    await submit({ name: name.trim() })
    setSent(true)
    setName('')
    setTimeout(() => setSent(false), 2000)
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {sent ? (
          <div className="text-center animate-pulse">
            <div className="text-6xl mb-4">🎉</div>
            <div className="text-2xl font-bold">Lähetetty!</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <h1 className="text-3xl font-bold text-center mb-2">Nimesi seinälle</h1>
            <p className="text-center text-zinc-400 text-sm">
              {count > 0 && `${count} ihmistä on lähettänyt`}
            </p>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value.slice(0, 30))}
              placeholder="Nimesi..."
              maxLength={30}
              autoFocus
              className="w-full px-6 py-5 text-2xl bg-zinc-900 border border-zinc-700 rounded-xl focus:outline-none focus:border-cyan-500 text-center"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full py-5 text-xl font-bold bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl transition-colors"
            >
              Lähetä
            </button>
            <div className="text-center text-zinc-600 text-xs">
              {name.length}/30
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
