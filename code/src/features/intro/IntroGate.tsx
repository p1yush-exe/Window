import { useEffect, useRef, useState } from 'react'
import { ICON_SM, Sparkles } from '@/components/icons'
import { isApp } from '@/lib/platform'

const KEY = 'window.introDone'

export function introPending(): boolean {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    if (new URLSearchParams(window.location.search).has('nointro')) return false
    return sessionStorage.getItem(KEY) !== '1'
  } catch {
    return false
  }
}

/**
 * The storefront. On the web, hovering slides the automatic doors ajar; a click opens them.
 * On the phone the scene is framed on the door and a tap opens it. Then the camera moves
 * through the doorway while everything fades, and the app is underneath.
 */
export function IntroGate({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'closed' | 'ajar' | 'open' | 'through'>('closed')
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const done = useRef(false)

  function finish() {
    if (done.current) return
    done.current = true
    try {
      sessionStorage.setItem(KEY, '1')
    } catch {
      /* ignore */
    }
    onDone()
  }

  function open() {
    if (phase === 'open' || phase === 'through') return
    setPhase('open')
    setTimeout(() => setPhase('through'), 850)
    setTimeout(finish, 2000)
  }

  useEffect(() => {
    const t = setTimeout(finish, 15000) // never trap anyone
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onMove(e: React.PointerEvent) {
    const r = e.currentTarget.getBoundingClientRect()
    setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 2, y: ((e.clientY - r.top) / r.height - 0.5) * 2 })
  }

  const app = isApp()
  const slide = phase === 'closed' ? 0 : phase === 'ajar' ? 2.5 : 11.5
  const bgX = tilt.x * 1.2
  const bgY = tilt.y * 0.8

  return (
    <div
      className={`intro fixed inset-0 z-[100] cursor-pointer select-none overflow-hidden bg-white ${phase === 'through' ? 'is-through' : ''}`}
      onPointerMove={app ? undefined : onMove}
      onPointerEnter={() => !app && phase === 'closed' && setPhase('ajar')}
      onPointerLeave={() => !app && phase === 'ajar' && setPhase('closed')}
      onClick={open}
      role="button"
      aria-label="Open the shop"
    >
      <div className="intro-scene" style={{ transform: `translate(${-bgX * 0.4}%, ${-bgY * 0.4}%)` }}>
        <div className="intro-layer intro-bg" style={{ transform: `scale(1.06) translate(${bgX}%, ${bgY}%)` }} />
        <div className="intro-layer intro-door" style={{ transform: `translate(${bgX * 0.5 - slide}%, ${bgY * 0.5}%)` }} />
        <div className="intro-layer intro-door" style={{ transform: `scaleX(-1) translate(${-bgX * 0.5 - slide}%, ${bgY * 0.5}%)` }} />
        <div className="intro-glow" style={{ opacity: phase === 'closed' ? 0 : phase === 'ajar' ? 0.35 : 1 }} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-end px-5 pb-[calc(var(--safe-bottom)+20px)]">
        <span className="flex items-center gap-2 rounded-xl border-2 border-charcoal bg-white px-4 py-2.5 text-[15px] font-bold tracking-[0.053em] text-charcoal uppercase">
          <Sparkles {...ICON_SM} className="text-eager-green" /> {app ? 'Tap to open' : 'Click to enter'}
        </span>
      </div>
    </div>
  )
}
