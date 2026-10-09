import { useCallback, useEffect, useRef, useState } from 'react'
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'
import { fetchFeedPage, loadSwipedIds, recordSwipe } from '@/lib/db'
import type { Product, UserProfile } from '@/lib/types'
import { telemetry } from '@/lib/telemetry'

const LOW_WATER = 5

export function useFeed(profile: UserProfile | null) {
  const [queue, setQueue] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exhausted, setExhausted] = useState(false)
  const [swipeCount, setSwipeCount] = useState(0)
  const [lastMatch, setLastMatch] = useState<Product | null>(null)

  const swiped = useRef<Set<string>>(new Set())
  const cursor = useRef<QueryDocumentSnapshot<DocumentData> | null>(null)
  const done = useRef(false)
  const fetching = useRef(false)

  const fetchMore = useCallback(async () => {
    if (fetching.current || done.current) return
    fetching.current = true
    try {
      // Pull pages until we have enough unseen cards or run out.
      let added: Product[] = []
      for (let i = 0; i < 5 && added.length < LOW_WATER && !done.current; i++) {
        const page = await fetchFeedPage(cursor.current)
        cursor.current = page.cursor
        if (page.done) done.current = true
        added = added.concat(page.products.filter((p) => !swiped.current.has(p.id) && p.vendorId !== profile?.uid))
      }
      if (added.length) {
        setQueue((q) => {
          const ids = new Set(q.map((p) => p.id))
          return q.concat(added.filter((p) => !ids.has(p.id)))
        })
      }
      if (done.current) setExhausted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load products')
    } finally {
      fetching.current = false
    }
  }, [profile?.uid])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Guests keep dismissed cards in memory only; nothing is recorded.
        swiped.current = profile ? await loadSwipedIds(profile.uid) : new Set()
        if (!cancelled) await fetchMore()
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load your history')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [profile?.uid, fetchMore])

  useEffect(() => {
    if (!loading && queue.length < LOW_WATER && !done.current) void fetchMore()
  }, [queue.length, loading, fetchMore])

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

  /** Records a right swipe for a card that was liked before logging in. */
  const completePending = useCallback((product: Product, as: UserProfile) => {
    setLastMatch(product)
    const started = performance.now()
    recordSwipe(as, product, 'right')
      .then(() => telemetry.record('swipe_to_match_ms', performance.now() - started))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not save swipe'))
  }, [])

  const reset = useCallback(() => {
    cursor.current = null
    done.current = false
    setExhausted(false)
    setQueue([])
    void fetchMore()
  }, [fetchMore])

  return { queue, loading, error, exhausted, swipeCount, lastMatch, swipe, completePending, reset, dismissMatch: () => setLastMatch(null) }
}
