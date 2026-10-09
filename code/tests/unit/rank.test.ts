import { describe, expect, it } from 'vitest'
import { geohashForLocation } from 'geofire-common'
import { matchesInterests, rankFeed } from '@/features/feed/rank'
import type { Product } from '@/lib/types'

const center = { lat: 30.3398, lng: 76.3869 } // Patiala
const make = (id: string, lat: number, lng: number, category: string, vendorTags: string[] = []): Product => ({
  id, productCode: 'WN-TEST01', vendorId: 'v', vendorName: 'V', shopId: 's', shopName: 'S', title: id, description: '', tags: [category], category,
  priceMin: null, priceMax: null, price: null, currency: 'INR', imageUrls: [], availability: 'in_stock', paymentModes: ['upi'], superOnly: false,
  lat, lng, geohash: geohashForLocation([lat, lng]), area: null, vendorTags, createdAt: null, updatedAt: null,
})

describe('rankFeed', () => {
  const near = make('near', 30.345, 76.39, 'shoes')
  const far = make('far', 28.61, 77.21, 'clothing') // Delhi, ~230 km
  const mid = make('mid', 30.36, 76.4, 'decor', ['hand-made'])
  it('drops products outside the radius', () => {
    expect(rankFeed([near, far, mid], center, 25, []).map((p) => p.id)).toEqual(['near', 'mid'])
  })
  it('puts interest matches first, then nearest', () => {
    const r = rankFeed([near, mid], center, 25, ['hand-made'])
    expect(r[0]!.id).toBe('mid')
    expect(r[0]!.matchesInterests).toBe(true)
    expect(r[1]!.matchesInterests).toBe(false)
  })
  it('reports distance in km', () => {
    const r = rankFeed([near], center, 25, [])
    expect(r[0]!.distanceKm).toBeGreaterThan(0.3)
    expect(r[0]!.distanceKm).toBeLessThan(1.5)
  })
})

describe('matchesInterests', () => {
  it('matches category or vendor tags, case-insensitively', () => {
    expect(matchesInterests({ category: 'shoes', vendorTags: [] }, ['Shoes'])).toBe(true)
    expect(matchesInterests({ category: 'decor', vendorTags: ['hand-made'] }, ['hand-made'])).toBe(true)
    expect(matchesInterests({ category: 'decor', vendorTags: [] }, ['shoes'])).toBe(false)
    expect(matchesInterests({ category: 'decor', vendorTags: [] }, [])).toBe(false)
  })
})
