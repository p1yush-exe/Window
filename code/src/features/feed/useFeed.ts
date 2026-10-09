import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchFeedPage, fetchLocalProducts, loadSwipedIds, recordLike, recordPass, upgradeLikeToSuper, type LikeOutcome } from '@/lib/db'
import type { LatLng } from '@/lib/geo'
import { FEED_MIN_RESULTS, RADIUS_STEPS_KM, type LikeType, type Product, type UserProfile } from '@/lib/types'
import { telemetry } from '@/lib/telemetry'
import { rankFeed, type RankedProduct } from './rank'

export interface FeedOptions {
  center: LatLng | null
  interests: string[]
  radiusKm: number | null
}

export function useFeed(profile: UserProfile | null, opts: FeedOptions) {
  const [queue, setQueue] = useState<RankedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exhausted, setExhausted] = useState(false)
  const [effectiveRadius, setEffectiveRadius] = useState<number | null>(opts.radiusKm)
  const [nearbyCount, setNearbyCount] = useState(0)
  const [swipeCount, setSwipeCount] = useState(0)
  const [lastOutcome, setLastOutcome] = useState<{ product: Product; outcome: LikeOutcome; type: LikeType } | null>(null)
  const swiped = useRef<Set<string>>(new Set())
  const generation = useRef(0)

  const centerKey = opts.center ? `${opts.center.lat.toFixed(4)},${opts.center.lng.toFixed(4)}` : ''
  const interestsKey = opts.interests.join('|')

  const load = useCallback(async () => {
    const gen = ++generation.current
    setLoading(true)
    setError(null)
    try {
      swiped.current = profile ? await loadSwipedIds(profile.uid) : new Set()
      const usable = (p: Product) => !swiped.current.has(p.id) && p.vendorId !== profile?.uid && p.availability !== 'out_of_stock' && !(p.claimedBy && p.claimedBy !== profile?.uid)
      let items: RankedProduct[] = []
      let radius: number | null = null
      if (opts.center) {
        const steps = opts.radiusKm ? [opts.radiusKm] : [...RADIUS_STEPS_KM]
        for (const r of steps) {
          const raw = await fetchLocalProducts(opts.center, r)
          items = rankFeed(raw.filter(usable), opts.center, r, opts.interests)
          radius = r
          if (items.length >= FEED_MIN_RESULTS) break
        }
      } else {
        const page = await fetchFeedPage(null)
        items = page.products.filter(usable).map((p) => ({ ...p, distanceKm: Number.NaN, matchesInterests: false }))
      }
      if (gen !== generation.current) return
      setQueue(items)
      setNearbyCount(items.length)
      setEffectiveRadius(radius)
      setExhausted(items.length === 0)
    } catch (e) {
      if (gen === generation.current) setError(e instanceof Error ? e.message : 'Could not load products')
    } finally {
      if (gen === generation.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid, centerKey, interestsKey, opts.radiusKm])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!loading && queue.length === 0) setExhausted(true)
  }, [queue.length, loading])

  const remove = useCallback((product: Product) => {
    swiped.current.add(product.id)
    setQueue((q) => q.filter((p) => p.id !== product.id))
    setSwipeCount((c) => c + 1)
  }, [])

  /** Left swipe: free. Guests only dismiss locally. */
  const pass = useCallback(
    (product: Product) => {
      remove(product)
      if (profile) void recordPass(profile, product).catch(() => undefined)
    },
    [profile, remove],
  )

  /** Right or super swipe for a signed-in shopper. Throws when the balance is empty. */
  const like = useCallback(
    async (product: Product, type: LikeType, as: UserProfile | null = profile): Promise<LikeOutcome> => {
      if (!as) throw new Error('Log in to like products')
      const started = performance.now()
      const outcome = await recordLike(as, product, type)
      remove(product)
      if (outcome.kind === 'matched') telemetry.record('swipe_to_match_ms', performance.now() - started)
      setLastOutcome({ product, outcome, type })
      return outcome
    },
    [profile, remove],
  )

  /** Super swipe on a product that was just liked (pending): opens the match now. */
  const upgrade = useCallback(
    async (product: Product): Promise<LikeOutcome> => {
      if (!profile) throw new Error('Log in to super swipe')
      const outcome = await upgradeLikeToSuper(profile, product)
      setLastOutcome({ product, outcome, type: 'super' })
      return outcome
    },
    [profile],
  )

  return { queue, loading, error, exhausted, effectiveRadius, nearbyCount, swipeCount, lastOutcome, pass, like, upgrade, reload: load, dismissOutcome: () => setLastOutcome(null) }
}
