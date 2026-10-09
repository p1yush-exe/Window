import { distanceKm } from '@/lib/geo'
import type { LatLng } from '@/lib/geo'
import type { Product } from '@/lib/types'

export interface RankedProduct extends Product {
  distanceKm: number
  matchesInterests: boolean
}

export function matchesInterests(p: Pick<Product, 'category' | 'vendorTags'>, interests: string[]): boolean {
  if (!interests.length) return false
  const set = new Set(interests.map((i) => i.toLowerCase()))
  if (set.has(p.category.toLowerCase())) return true
  return (p.vendorTags ?? []).some((t) => set.has(t.toLowerCase()))
}

/** Keeps products inside the radius; interest matches first, then nearest first. */
export function rankFeed(products: Product[], center: LatLng, radiusKm: number, interests: string[]): RankedProduct[] {
  const seen = new Set<string>()
  const out: RankedProduct[] = []
  for (const p of products) {
    if (seen.has(p.id) || p.lat === null || p.lng === null) continue
    seen.add(p.id)
    const d = distanceKm(center, { lat: p.lat, lng: p.lng })
    if (d > radiusKm) continue
    out.push({ ...p, distanceKm: d, matchesInterests: matchesInterests(p, interests) })
  }
  return out.sort((a, b) => Number(b.matchesInterests) - Number(a.matchesInterests) || a.distanceKm - b.distanceKm)
}
