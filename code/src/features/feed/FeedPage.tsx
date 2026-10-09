import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router'
import { Button, EmptyState, ErrorBanner, FullPageSpinner } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { LoginSheet } from '@/features/auth/LoginSheet'
import { haptic } from '@/lib/native'
import type { Product } from '@/lib/types'
import { useFeed } from './useFeed'
import { SwipeCard, type SwipeDirection } from './SwipeCard'

export function FeedPage() {
  const { profile } = useAuth()
  const feed = useFeed(profile)
  const [pending, setPending] = useState<Product | null>(null)
  const [lastDirection, setLastDirection] = useState<SwipeDirection>('right')
  const wheel = useRef({ dx: 0, at: 0, locked: false })
  const visible = feed.queue.slice(0, 3)
  const top = visible[0]

  function swipe(direction: SwipeDirection) {
    if (!top || pending) return
    setLastDirection(direction)
    void haptic(direction === 'right' ? 'medium' : 'light')
    if (direction === 'right' && !profile) {
      // First right swipe as a guest: ask to log in, keep the card until they do.
      setPending(top)
      return
    }
    feed.swipe(top, direction)
  }

  // Once the guest has logged in, record the swipe they were trying to make.
  useEffect(() => {
    if (pending && profile) {
      const product = pending
      setPending(null)
      setLastDirection('right')
      feed.swipe(product, 'right', profile)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, pending])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight') swipe('right')
      if (e.key === 'ArrowLeft') swipe('left')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Two-finger horizontal scroll on a touchpad also swipes the top card.
  function onWheel(e: React.WheelEvent) {
    if (!top || Math.abs(e.deltaX) < Math.abs(e.deltaY)) return
    const now = Date.now()
    const w = wheel.current
    if (now - w.at > 250) {
      w.dx = 0
      w.locked = false
    }
    w.at = now
    if (w.locked) return
    w.dx += e.deltaX
    if (Math.abs(w.dx) > 160) {
      w.locked = true
      swipe(w.dx > 0 ? 'right' : 'left')
    }
  }

  useEffect(() => {
    if (!feed.lastMatch) return
    const t = setTimeout(feed.dismissMatch, 2200)
    return () => clearTimeout(t)
  }, [feed.lastMatch, feed.dismissMatch])

  if (feed.loading) return <FullPageSpinner />

  return (
    <div className="flex flex-1 flex-col px-4 pt-4 md:pt-8">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Discover</h1>
          <p className="text-xs text-neutral-500">Swipe right to connect with the seller</p>
        </div>
        {profile ? (
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">{feed.swipeCount} swipes</span>
        ) : (
          <button type="button" onClick={() => setPending(top ?? null)} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200">
            Browsing as guest · Log in
          </button>
        )}
      </div>
      <ErrorBanner message={feed.error} />

      <div className="relative mx-auto w-full max-w-sm flex-1" style={{ minHeight: 'min(68vh, 620px)' }} onWheel={onWheel}>
        <AnimatePresence custom={lastDirection}>
          {visible.map((p, i) => (
            <SwipeCard key={p.id} product={p} index={i} isTop={i === 0} onSwipe={swipe} />
          ))}
        </AnimatePresence>
        {!top && (
          <div className="absolute inset-0 flex items-center justify-center rounded-3xl border-2 border-dashed border-neutral-200">
            <EmptyState
              icon="🎉"
              title={feed.exhausted ? "You've seen everything" : 'Loading more…'}
              body={feed.exhausted ? 'Check your Liked tab or come back later for new products.' : undefined}
              action={
                feed.exhausted ? (
                  <Link to="/liked">
                    <Button variant="secondary">See liked products</Button>
                  </Link>
                ) : undefined
              }
            />
          </div>
        )}
      </div>

      <div className="mx-auto mt-4 flex w-full max-w-sm items-center justify-center gap-6 pb-2">
        <Button variant="nope" size="icon" onClick={() => swipe('left')} disabled={!top} aria-label="Pass">
          ✕
        </Button>
        <Button variant="like" size="icon" onClick={() => swipe('right')} disabled={!top} aria-label="Like">
          ♥
        </Button>
      </div>
      <p className="hidden pb-2 text-center text-xs text-neutral-400 md:block">Drag the card, swipe two fingers on the touchpad, or use ← and → keys</p>

      <AnimatePresence>
        {feed.lastMatch && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="fixed inset-x-4 bottom-[calc(5rem+var(--safe-bottom))] z-40 mx-auto max-w-sm rounded-2xl bg-neutral-900 p-4 text-white shadow-2xl md:bottom-8"
          >
            <p className="text-sm font-semibold">It's a match! 💜</p>
            <p className="text-xs text-white/70">You can now chat with {feed.lastMatch.vendorName} about {feed.lastMatch.title}.</p>
            <Link to={`/chats/${profile?.uid}_${feed.lastMatch.id}`} className="mt-2 inline-block text-sm font-bold text-brand-300 underline">
              Open chat →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <LoginSheet open={pending !== null && !profile} onClose={() => setPending(null)} onDone={() => undefined} />
    </div>
  )
}
