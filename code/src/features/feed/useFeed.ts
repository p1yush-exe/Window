import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchFeedPage, fetchLocalProducts, loadSwipedIds, recordSwipe } from '@/lib/db'
import type { LatLng } from '@/lib/geo'
import { FEED_MIN_RESULTS, RADIUS_STEPS_KM, type Product, type UserProfile } from '@/lib/types'
import { telemetry } from '@/lib/telemetry'
import { rankFeed, type RankedProduct } from './rank'

export interface FeedOptions {
  center: LatLng | null
  interests: string[]
  /** null = adaptive (widen until enough results). */
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
  const [lastMatch, setLastMatch] = useState<Product | null>(null)
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
      const usable = (p: Product) => !swiped.current.has(p.id) && p.vendorId !== profile?.uid && p.availability !== 'out_of_stock'
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
        // No area yet: newest products everywhere.
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

  /** Removes the card locally. Records it only when there is a signed-in profile. */
  const swipe = useCallback(
    (product: Product, direction: 'left' | 'right', as: UserProfile | null = profile) => {
      swiped.current.add(product.id)
      setQueue((q) => q.filter((p) => p.id !== product.id))
      setSwipeCount((c) => c + 1)
      if (!as) return
      if (direction === 'right') setLastMatch(product)
      const started = performance.now()
      recordSwipe(as, product, direction)
        .then(() => {
          if (direction === 'right') telemetry.record('swipe_to_match_ms', performance.now() - started)
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not save swipe'))
    },
    [profile],
  )

  return {
    queue,
    loading,
    error,
    exhausted,
    effectiveRadius,
    nearbyCount,
    swipeCount,
    lastMatch,
    swipe,
    reload: load,
    dismissMatch: () => setLastMatch(null),
  }
}
