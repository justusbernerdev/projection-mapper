import { useEffect, useRef, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import '../index.css'

const DISPLAY_DURATION = 8000 // 8s per name
const TRANSITION_DURATION = 800 // fade duration

// BroadcastChannel to projection mapper
const channel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('projection-mapper')
  : null

export default function DisplayView() {
  const approved = useQuery(api.submissions.listApproved) ?? []
  const [currentIdx, setCurrentIdx] = useState(0)
  const [phase, setPhase] = useState('in') // in | show | out | idle
  const [currentName, setCurrentName] = useState(null)
  const timerRef = useRef(null)
  const queueRef = useRef([])

  // Keep queue updated with new approved submissions
  useEffect(() => {
    queueRef.current = approved.map(s => s.name)
  }, [approved])

  // Display cycle
  useEffect(() => {
    function showNext() {
      const queue = queueRef.current
      if (queue.length === 0) {
        setCurrentName(null)
        setPhase('idle')
        timerRef.current = setTimeout(showNext, 2000)
        return
      }

      const idx = currentIdx % queue.length
      const name = queue[idx]
      setCurrentName(name)

      // Fade in
      setPhase('in')
      setTimeout(() => setPhase('show'), TRANSITION_DURATION)

      // Hold
      timerRef.current = setTimeout(() => {
        // Fade out
        setPhase('out')
        setTimeout(() => {
          setCurrentIdx(prev => prev + 1)
          showNext()
        }, TRANSITION_DURATION)
      }, DISPLAY_DURATION)

      // Send to projection mapper
      channel?.postMessage({
        type: 'event-display',
        name,
        action: 'show',
      })
    }

    showNext()
    return () => clearTimeout(timerRef.current)
  }, []) // Run once

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden cursor-none">
      {/* Ambient gradient when idle */}
      {phase === 'idle' && (
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-black to-purple-900/20 animate-pulse" />
        </div>
      )}

      {/* Name display */}
      {currentName && (
        <div
          className={`text-center px-12 transition-all duration-700 ${
            phase === 'in'
              ? 'opacity-0 scale-90 translate-y-4'
              : phase === 'show'
              ? 'opacity-100 scale-100 translate-y-0'
              : phase === 'out'
              ? 'opacity-0 scale-110 -translate-y-4'
              : 'opacity-0'
          }`}
        >
          <div
            className="text-white font-bold leading-none"
            style={{
              fontSize: 'clamp(4rem, 12vw, 10rem)',
              textShadow: '0 0 40px rgba(0, 180, 255, 0.4), 0 0 80px rgba(0, 180, 255, 0.2)',
            }}
          >
            {currentName}
          </div>
        </div>
      )}

      {/* Queue counter */}
      <div className="fixed bottom-4 right-4 text-zinc-700 text-xs">
        {approved.length} in queue
      </div>
    </div>
  )
}
