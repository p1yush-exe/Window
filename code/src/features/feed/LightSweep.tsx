import { useEffect, useState } from 'react'

/**
 * A two-second burst of coloured light from the right edge of the screen,
 * adapted from the stacked-glow CSS the user supplied: five nested ellipses whose
 * box-shadows cycle through colour pairs, then everything fades out.
 */
export function LightSweep({ trigger }: { trigger: number }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!trigger) return
    setOn(true)
    const t = setTimeout(() => setOn(false), 2000)
    return () => clearTimeout(t)
  }, [trigger])
  if (!on) return null
  return (
    <div className="light-sweep pointer-events-none fixed inset-y-0 right-0 z-40 w-[40vw] overflow-visible" aria-hidden="true">
      <div className="ls-wrap">
        <section className="ls one"><section className="ls two"><section className="ls three"><section className="ls four"><section className="ls five" /></section></section></section></section>
      </div>
    </div>
  )
}
