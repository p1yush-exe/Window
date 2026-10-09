import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link, useNavigate } from 'react-router'
import { Button, EmptyState, ErrorBanner, FullPageSpinner } from '@/components/ui'
import { Download, HeartPlus, ICON, Map, MapPin } from '@/components/icons'
import { useAuth } from '@/features/auth/AuthProvider'
import { LoginSheet } from '@/features/auth/LoginSheet'
import { BuySwipesSheet } from '@/features/economy/BuySwipesSheet'
import { haptic } from '@/lib/native'
import { areaLabel } from '@/lib/geo'
import { getShopperPrefs, hasShopperPrefs, setShopperPrefs } from '@/lib/prefs'
import { APK_URL, isWeb } from '@/lib/platform'
import { RADIUS_STEPS_KM, type LikeType, type Product } from '@/lib/types'
import { useFeed } from './useFeed'
import { SwipeCard, type SwipeDirection } from './SwipeCard'
import { LightSweep } from './LightSweep'

export function FeedPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [prefs, setPrefs] = useState(() => getShopperPrefs())
  const center = profile?.location ?? prefs.location
  const interests = profile?.interests?.length ? profile.interests : prefs.interests
  const feed = useFeed(profile, { center, interests, radiusKm: prefs.radiusKm })
  const [lastDirection, setLastDirection] = useState<SwipeDirection>('right')
  const [pending, setPending] = useState<Product | null>(null) // liked as guest, waiting for login
  const [radiusOpen, setRadiusOpen] = useState(false)
  const [drag, setDrag] = useState(0)
  const [upgrade, setUpgrade] = useState<Product | null>(null) // "Upgrade to super swipe?" prompt target
  const [sweep, setSweep] = useState(0)
  const [exhausted, setExhausted] = useState(false)
  const [buyOpen, setBuyOpen] = useState<'swipes' | 'superSwipes' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const visible = feed.queue.slice(0, 3)
  const top = visible[0]

  useEffect(() => {
    if (!profile && !hasShopperPrefs()) navigate('/shopper/setup', { replace: true })
  }, [profile, navigate])

  function chooseRadius(km: number | null) {
    setShopperPrefs({ radiusKm: km })
    setPrefs(getShopperPrefs())
    setRadiusOpen(false)
  }

  async function doLike(product: Product, type: LikeType) {
    setError(null)
    try {
      if (type === 'super') setSweep((n) => n + 1)
      await feed.like(product, type)
      setLastDirection('right')
      void haptic('medium')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not like')
    }
  }

  function swipe(direction: SwipeDirection) {
    if (!top || pending) return
    setDrag(0)
    if (direction === 'left') {
      setLastDirection('left')
      void haptic('light')
      feed.pass(top)
      return
    }
    if (!profile) {
      setPending(top)
      return
    }
    if (top.superOnly) {
      if (profile.superSwipes > 0) {
        setUpgrade(top)
        setError('This product only accepts super swipes.')
      } else setExhausted(true)
      return
    }
    if (profile.swipes <= 0) {
      setExhausted(true)
      return
    }
    setUpgrade(top)
    void doLike(top, 'swipe')
  }

  // Once a guest logs in, finish the swipe they were making.
  useEffect(() => {
    if (pending && profile) {
      const product = pending
      setPending(null)
      void doLike(product, product.superOnly ? 'super' : 'swipe')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, pending])

  useEffect(() => {
    if (!upgrade) return
    const t = setTimeout(() => setUpgrade(null), 5000)
    return () => clearTimeout(t)
  }, [upgrade])

  useEffect(() => {
    if (!feed.lastOutcome) return
    const t = setTimeout(feed.dismissOutcome, 2600)
    return () => clearTimeout(t)
  }, [feed.lastOutcome, feed.dismissOutcome])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight') swipe('right')
      if (e.key === 'ArrowLeft') swipe('left')
      if (e.key === 'ArrowUp' && top && profile) void superSwipe(top)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  async function superSwipe(product: Product) {
    if (!profile) return setPending(product)
    if (profile.superSwipes <= 0) {
      setExhausted(true)
      return
    }
    const wasUpgrade = upgrade?.id === product.id
    setUpgrade(null)
    setError(null)
    try {
      setSweep((n) => n + 1)
      if (wasUpgrade) await feed.upgrade(product)
      else await feed.like(product, 'super')
      setLastDirection('right')
      void haptic('medium')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not super swipe')
    }
  }

  if (feed.loading) return <FullPageSpinner />
  const outcome = feed.lastOutcome

  return (
    <div className="relative flex flex-1 flex-col">
      {/* Side overlays driven by drag progress */}
      {/* Light spilling in from the edges while dragging: red from the left, green from the right */}
      <div className="edge-light edge-light-nope pointer-events-none fixed inset-y-0 left-0 z-20 w-[26vw]" style={{ opacity: Math.min(1, Math.max(0, -drag) * 1.2) }} />
      <div className="edge-light edge-light-like pointer-events-none fixed inset-y-0 right-0 z-20 w-[30vw]" style={{ opacity: Math.min(1, Math.max(0, drag) * 1.2) }} />
      <LightSweep trigger={sweep} />
      {/* Ambient backdrop: the current product photo, blurred and full-bleed */}
      {top?.imageUrls[0] && (
        <div key={top.id} className="ambient pointer-events-none fixed inset-0 z-0" style={{ backgroundImage: `url(${top.imageUrls[0]})` }} aria-hidden="true" />
      )}

      <div className="mx-auto mt-1 flex w-full max-w-sm items-center justify-center gap-1.5 px-4 md:max-w-md">
        <button type="button" onClick={() => navigate('/shopper/setup')} className="flex items-center gap-1 rounded border-2 border-faded-gray px-2 py-0.5 font-mono text-[11px] tracking-[0.053em] text-charcoal uppercase hover:border-charcoal">
          <MapPin {...ICON} size={12} /> {center ? areaLabel(center) : 'Set area'}
        </button>
        <div className="relative">
          <button type="button" onClick={() => setRadiusOpen((o) => !o)} className="rounded border-2 border-faded-gray px-2 py-0.5 font-mono text-[11px] tracking-[0.053em] text-charcoal uppercase hover:border-charcoal">
            {feed.effectiveRadius ? `≤ ${feed.effectiveRadius} km` : prefs.radiusKm ? `≤ ${prefs.radiusKm} km` : 'Auto'}
          </button>
          {radiusOpen && (
            <ul className="absolute left-0 z-30 mt-1 w-36 border-2 border-faded-gray bg-white font-mono text-[12px]">
              <li><button type="button" onClick={() => chooseRadius(null)} className="block w-full px-3 py-2 text-left hover:bg-[#f7f7f7]">Auto (widen)</button></li>
              {RADIUS_STEPS_KM.map((km) => (
                <li key={km}><button type="button" onClick={() => chooseRadius(km)} className="block w-full px-3 py-2 text-left hover:bg-[#f7f7f7]">Within {km} km</button></li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="relative z-10 mx-auto w-full max-w-sm px-4 pt-2 md:max-w-md"><ErrorBanner message={error ?? feed.error} /></div>

      <div className="relative z-10 mx-auto mt-3 w-full max-w-sm px-4 md:max-w-md" style={{ height: 'min(68vh, 660px)' }}>
        <div className="relative h-full w-full">
          <AnimatePresence custom={lastDirection}>
            {visible.map((p, i) => (
              <SwipeCard key={p.id} product={p} index={i} isTop={i === 0} onSwipe={swipe} onDrag={i === 0 ? setDrag : undefined} />
            ))}
          </AnimatePresence>
          {!top && (
            <div className="absolute inset-0 flex items-center border border-dashed border-faded-gray">
              <EmptyState
                icon={<Map size={28} strokeWidth={1.75} absoluteStrokeWidth />}
                title={feed.nearbyCount === 0 && center ? 'Nothing nearby yet' : "You've seen everything nearby"}
                body={feed.nearbyCount === 0 && center ? `No sellers within ${feed.effectiveRadius ?? prefs.radiusKm ?? 50} km of ${areaLabel(center)}.` : 'Check your bag or come back later.'}
                action={
                  <div className="flex gap-2">
                    {prefs.radiusKm && prefs.radiusKm < 50 && <Button onClick={() => chooseRadius(null)}>Widen radius</Button>}
                    <Button variant="secondary" onClick={() => navigate('/shopper/setup')}>Change area</Button>
                  </div>
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Super swipe prompt: a circular button with a 5 s countdown, after a right swipe */}
      <AnimatePresence>
        {upgrade && profile && (
          <motion.div key={upgrade.id} initial={{ y: 40, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0, scale: 0.9 }} className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+var(--safe-bottom))] z-40 flex flex-col items-center gap-2">
            <p className="rounded-xl border-2 border-faded-gray bg-white px-3 py-1.5 text-[15px] font-bold text-charcoal">Upgrade to super swipe?</p>
            <button type="button" onClick={() => void superSwipe(upgrade)} disabled={profile.superSwipes <= 0} className="super-ring pointer-events-auto relative flex h-20 w-20 items-center justify-center rounded-full bg-white text-super disabled:opacity-50" aria-label="Super swipe this product">
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
                <circle cx="40" cy="40" r="36" fill="none" stroke="#ececec" strokeWidth="5" />
                <circle cx="40" cy="40" r="36" fill="none" strokeWidth="5" strokeLinecap="round" pathLength="100" className="super-ring-progress" />
              </svg>
              <HeartPlus size={34} strokeWidth={2.5} absoluteStrokeWidth />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outcome toast */}
      <AnimatePresence>
        {outcome && !upgrade && (
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} className="fixed inset-x-4 bottom-[calc(5.5rem+var(--safe-bottom))] z-40 mx-auto max-w-sm border border-eager-green bg-white p-3">
            {outcome.outcome.kind === 'matched' ? (
              <>
                <p className="font-mono text-[12px] text-spark-blue uppercase">{outcome.type === 'super' ? 'Claimed' : 'Matched'}</p>
                <p className="text-[14px] text-charcoal">You can chat with {outcome.product.shopName || outcome.product.vendorName} about {outcome.product.title}.</p>
                <Link to={`/bag/chat/${outcome.outcome.matchId}`} className="mt-1 inline-block font-mono text-[12px] text-spark-blue uppercase underline">Open chat</Link>
              </>
            ) : (
              <>
                <p className="font-mono text-[12px] text-pencil-gray uppercase">Liked · waiting for the seller</p>
                <p className="text-[14px] text-charcoal">{outcome.product.shopName || outcome.product.vendorName} will see your like. Super swipes skip the wait.</p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swipes exhausted overlay */}
      <AnimatePresence>
        {exhausted && profile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 flex items-end justify-center bg-white/90 p-5 pb-[calc(6rem+var(--safe-bottom))] backdrop-blur-sm md:items-center">
            <div className="w-full max-w-sm border border-eager-green bg-white p-5">
              <p className="label">Swipes are over</p>
              <h2 className="mt-1 text-[29px] leading-none ">{profile.swipes === 0 ? 'No swipes left today.' : 'Not enough for this one.'}</h2>
              <p className="mt-2 text-[14px] text-pencil-gray">You get 5 free swipes every day. Use a super swipe or buy more now.</p>
              <div className="mt-4 flex flex-col gap-2">
                {profile.superSwipes > 0 && top && (
                  <Button onClick={() => { setExhausted(false); void superSwipe(top) }}><HeartPlus {...ICON} size={14} /> Use a super swipe ({profile.superSwipes})</Button>
                )}
                <Button variant={profile.superSwipes > 0 ? 'secondary' : 'primary'} onClick={() => { setExhausted(false); setBuyOpen('swipes') }}>Buy swipes</Button>
                {isWeb() && !profile.appBonusGranted && (
                  <a href={APK_URL} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded border-2 border-faded-gray px-4 py-3 font-mono text-[13px] text-charcoal uppercase">
                    <Download {...ICON} size={16} /> Get the app · 2 free super swipes
                  </a>
                )}
                <button type="button" onClick={() => setExhausted(false)} className="py-2 font-mono text-[12px] text-pencil-gray uppercase">Keep browsing left</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{buyOpen && profile && <BuySwipesSheet kind={buyOpen} onClose={() => setBuyOpen(null)} />}</AnimatePresence>
      <LoginSheet open={pending !== null && !profile} onClose={() => setPending(null)} onDone={() => undefined} />
    </div>
  )
}
