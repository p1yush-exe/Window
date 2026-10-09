import { useEffect, useRef, useState } from 'react'
import { ICON_SM, Sparkles } from '@/components/icons'
import { isApp } from '@/lib/platform'
import { requestLocationPermission } from '@/lib/geo'

/** The doors open on every load: it is the signature moment. `?nointro=1` skips it for testing. */
export function introPending(): boolean {
  try {
    const q = new URLSearchParams(window.location.search)
    if (q.has('intro')) return true
    if (q.has('nointro')) return false
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return true
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
    onDone()
  }

  function open() {
    if (phase === 'open' || phase === 'through') return
    // The tap that opens the doors is the moment to ask for location, before the map needs it.
    void requestLocationPermission().catch(() => undefined)
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
  // Slide amounts come from the CSS knobs (--door-ajar / --door-open) so everything is tuned in one place.
  const css = getComputedStyle(document.documentElement)
  const ajar = parseFloat(css.getPropertyValue('--door-ajar')) || 2.5
  const openBy = parseFloat(css.getPropertyValue('--door-open')) || 11.5
  const slide = phase === 'closed' ? 0 : phase === 'ajar' ? ajar : openBy
  const bgX = tilt.x * 1.2
  const bgY = tilt.y * 0.8

  return (
    <div
      className={`intro fixed inset-0 z-[5000] cursor-pointer select-none overflow-hidden bg-white ${phase === 'through' ? 'is-through' : ''}`}
      onPointerMove={app ? undefined : onMove}
      onPointerEnter={() => !app && phase === 'closed' && setPhase('ajar')}
      onPointerLeave={() => !app && phase === 'ajar' && setPhase('closed')}
      onClick={open}
      role="button"
      aria-label="Open the shop"
    >
      <div className="intro-scene" style={{ '--px': bgX, '--py': bgY, '--slide': slide } as React.CSSProperties}>
        <div className="intro-layer intro-bg" />
        <div className="intro-sign" aria-hidden="true">WINDOW</div>
        <div className="intro-door-wrap"><div className="intro-layer intro-door" /></div>
        <div className="intro-door-wrap intro-door-wrap-right"><div className="intro-layer intro-door" /></div>
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
